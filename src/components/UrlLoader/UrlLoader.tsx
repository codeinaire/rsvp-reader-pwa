import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { extractArticle } from '../../lib/url-extractor'
import { useRsvpStore } from '../../store/rsvp-store'

interface LocationState {
  url?: string
}

export default function UrlLoader() {
  const navigate = useNavigate()
  const location = useLocation()
  const setDocument = useRsvpStore((s) => s.setDocument)
  const [error, setError] = useState<string | null>(null)

  const url = (location.state as LocationState)?.url ?? ''

  const hostname = (() => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  })()

  useEffect(() => {
    if (!url) {
      // No URL provided — redirect to entry (user navigated here directly)
      navigate('/', { replace: true })
      return
    }

    let cancelled = false

    extractArticle(url).then((result) => {
      if (cancelled) return

      if ('type' in result) {
        // Error result
        setError(result.message)
      } else {
        // Success — load document and go to preview
        setDocument(result.words, result.title)
        navigate('/preview', { replace: true })
      }
    })

    return () => {
      cancelled = true
    }
  }, [url, navigate, setDocument])

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <p className="text-red-400 text-lg max-w-sm">{error}</p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Go back and paste instead
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-gray-400 text-base">Fetching article from</p>
      <p className="text-white text-xl font-medium break-all max-w-sm">{hostname}</p>
      {/* Simple pulsing indicator — no library needed */}
      <div className="mt-4 flex gap-1.5">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}
