import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useRsvpStore } from '../../store/rsvp-store'

export default function TextPreview() {
  const navigate = useNavigate()
  const wordList = useRsvpStore((s) => s.wordList)
  const documentTitle = useRsvpStore((s) => s.documentTitle)

  // Redirect to entry if no document loaded (e.g., direct URL access)
  React.useEffect(() => {
    if (wordList.length === 0) {
      navigate('/', { replace: true })
    }
  }, [wordList, navigate])

  // First paragraph: take up to 200 words for quality check
  const previewWords = wordList.slice(0, 200)
  const previewText = previewWords.join(' ')
  const wordCount = wordList.length

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
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {documentTitle ?? 'Document Preview'}
        </span>
        <div className="w-12" aria-hidden="true" /> {/* spacer for centering */}
      </header>

      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 py-6 gap-4">
        {/* Word count — at top */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {wordCount.toLocaleString()} words
          </span>
        </div>

        {/* "Start Reading" button — at top, above preview text (user decision) */}
        <button
          onClick={() => navigate('/read')}
          className="w-full py-3 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          Start Reading
        </button>

        {/* Text preview — read-only quality check */}
        <div className="flex-1">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide">
            Preview (first ~200 words)
          </p>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {previewText}
              {wordList.length > 200 && (
                <span className="text-gray-400 dark:text-gray-500"> ...</span>
              )}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
