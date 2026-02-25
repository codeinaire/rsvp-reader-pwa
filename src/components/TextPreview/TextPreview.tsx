import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useRsvpStore } from '../../store/rsvp-store'

export default function TextPreview() {
  const navigate = useNavigate()
  const wordList = useRsvpStore((s) => s.wordList)
  const documentTitle = useRsvpStore((s) => s.documentTitle)
  const wpm = useRsvpStore((s) => s.wpm)

  // Redirect to entry if no document loaded (e.g., direct URL access)
  React.useEffect(() => {
    if (wordList.length === 0) {
      navigate('/', { replace: true })
    }
  }, [wordList, navigate])

  const wordCount = wordList.length
  const estimatedMinutes = Math.ceil(wordCount / wpm)
  const readingTimeLabel = estimatedMinutes < 1 ? '< 1 min read' : `~${estimatedMinutes} min read`

  // First 250 words for preview
  const previewText = wordList.slice(0, 250).join(' ')

  // Error state: too few words to be useful (persistent — requires user action)
  const hasError = wordCount > 0 && wordCount < 10

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <span className="text-sm font-medium text-gray-900 dark:text-white truncate mx-4 max-w-xs">
          {documentTitle ?? 'Document Preview'}
        </span>
        <div className="w-12 flex-shrink-0" aria-hidden="true" /> {/* spacer for centering */}
      </header>

      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 py-6 gap-4">

        {/* Metadata summary card */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Document</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {documentTitle ?? 'Pasted text'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Words</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {wordCount.toLocaleString()} words
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Reading time</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {readingTimeLabel}
            </span>
          </div>
        </div>

        {hasError ? (
          /* Persistent error state — requires user action, does not auto-dismiss */
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              No readable text found. This PDF may be scanned or image-based.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              Try another file
            </button>
          </div>
        ) : (
          <>
            {/* "Start Reading" CTA — above preview text (user decision) */}
            <button
              onClick={() => navigate('/read')}
              className="w-full py-3 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              Start Reading
            </button>

            {/* Scrollable text preview with fade gradient */}
            <div
              className="relative overflow-hidden rounded-xl max-h-48"
              style={{
                maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              }}
            >
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 p-4 bg-gray-50 dark:bg-gray-900">
                {previewText}
                {wordList.length > 250 && (
                  <span className="text-gray-400 dark:text-gray-500"> ...</span>
                )}
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
