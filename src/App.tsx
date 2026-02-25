import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import EntryScreen from './components/EntryScreen/EntryScreen'
import TextPreview from './components/TextPreview/TextPreview'
import RSVPReader from './components/RSVPReader/RSVPReader'
import UrlLoader from './components/UrlLoader/UrlLoader'
import { documentService } from './services/document-service'
import { useRsvpStore } from './store/rsvp-store'
import { hydrateLastDocument } from './lib/document-persistence'

/**
 * Returns true if str is a valid http:// or https:// URL.
 * Used by ShareTargetHandler to guard GET-share query params.
 */
function isValidHttpUrl(str: string): boolean {
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * ShareTargetHandler — registered inside BrowserRouter so useNavigate is available.
 * Registers the scoped share-target service worker (IMPT-02) and listens for
 * SHARED_PDF messages sent by the SW after Android Chrome delivers a shared PDF.
 * Also handles GET URL shares (?url= or ?text= query params) from desktop Chrome
 * and Android URL-sharing intents.
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

  useEffect(() => {
    // Handle GET share target — URL/text shared from desktop Chrome or Android URL intent
    // On Android, the URL often arrives in the 'text' field (Android's share intent maps URLs there)
    const params = new URLSearchParams(window.location.search)
    const rawUrl = params.get('url') || ''
    const rawText = params.get('text') || ''
    const candidate = rawUrl || rawText

    if (candidate && isValidHttpUrl(candidate)) {
      navigate('/load-url', { state: { url: candidate }, replace: true })
      // Clean query params from the URL bar
      window.history.replaceState({}, '', '/')
    }
  }, [navigate]) // runs once on mount

  return null
}

/**
 * DocumentHydrator — registered inside BrowserRouter alongside ShareTargetHandler.
 * On mount, checks IndexedDB for the last persisted document and loads it into
 * the store if present and no document is already loaded. Enables offline reading.
 * Renders nothing — side effects only.
 */
function DocumentHydrator() {
  const setDocument = useRsvpStore((s) => s.setDocument)
  const wordList = useRsvpStore((s) => s.wordList)

  useEffect(() => {
    // Only hydrate if no document is already loaded (don't overwrite a freshly imported doc)
    if (wordList.length > 0) return

    hydrateLastDocument().then((saved) => {
      if (saved) {
        setDocument(saved.words, saved.title)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ShareTargetHandler />
      <DocumentHydrator />
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
          Route: URL loader — fetches and extracts article from a shared or entered URL
        */}
        <Route path="/load-url" element={<UrlLoader />} />

        {/*
          Route: RSVP reader — full engine assembled in Phase 2 (Plan 05)
        */}
        <Route path="/read" element={<RSVPReader />} />
      </Routes>
    </BrowserRouter>
  )
}
