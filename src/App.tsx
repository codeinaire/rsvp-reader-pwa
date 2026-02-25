import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import EntryScreen from './components/EntryScreen/EntryScreen'
import TextPreview from './components/TextPreview/TextPreview'
import RSVPReader from './components/RSVPReader/RSVPReader'
import { documentService } from './services/document-service'
import { useRsvpStore } from './store/rsvp-store'

/**
 * ShareTargetHandler — registered inside BrowserRouter so useNavigate is available.
 * Registers the scoped share-target service worker (IMPT-02) and listens for
 * SHARED_PDF messages sent by the SW after Android Chrome delivers a shared PDF.
 * Renders nothing — side effects only.
 */
function ShareTargetHandler() {
  const navigate = useNavigate()
  const setDocument = useRsvpStore((s) => s.setDocument)

  useEffect(() => {
    // Register the scoped share-target service worker (IMPT-02)
    // Only available in browsers that support service workers
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/share-target-sw.js', { scope: '/share-target/' })
      .catch((err) => {
        // Non-fatal: share target won't work but app functions normally
        console.warn('[share-target] SW registration failed:', err)
      })

    // Listen for SHARED_PDF messages from the service worker
    async function handleSwMessage(event: MessageEvent) {
      if (event.data?.type !== 'SHARED_PDF') return

      try {
        const cache = await caches.open('share-target-v1')
        const response = await cache.match('/shared-pdf')
        if (!response) return

        const blob = await response.blob()
        const file = new File([blob], event.data.filename ?? 'shared.pdf', {
          type: 'application/pdf',
        })

        // Process through the existing document pipeline
        const result = await documentService.parseFile(file)
        if (result.words.length >= 10) {
          setDocument(result.words, result.title)
          navigate('/preview')
        }

        // Clean up cached file after retrieval
        cache.delete('/shared-pdf')
      } catch (err) {
        console.error('[share-target] Failed to process shared file:', err)
      }
    }

    navigator.serviceWorker.addEventListener('message', handleSwMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage)
    }
  }, [navigate, setDocument]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ShareTargetHandler />
      <Routes>
        {/*
          Route: Entry screen
          Not destroyed on navigation — React Router keeps it mounted
          while the user is on /preview or /read (BrowserRouter default behavior).
        */}
        <Route path="/" element={<EntryScreen />} />

        {/*
          Route: Text preview — extracted text quality check + word count
        */}
        <Route path="/preview" element={<TextPreview />} />

        {/*
          Route: RSVP reader — full engine assembled in Phase 2 (Plan 05)
        */}
        <Route path="/read" element={<RSVPReader />} />
      </Routes>
    </BrowserRouter>
  )
}
