import { useNavigate } from 'react-router-dom'
import { useRsvpStore } from '../../store/rsvp-store'

/**
 * Phase 1 placeholder RSVP screen.
 * Makes the phase end-to-end testable: EntryScreen -> TextPreview -> here.
 * Phase 2 replaces this with the full RSVP playback engine.
 */
export default function RSVPPlaceholder() {
  const navigate = useNavigate()
  const wordList = useRsvpStore((s) => s.wordList)
  const documentTitle = useRsvpStore((s) => s.documentTitle)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center px-4 gap-6">
      <div className="text-center">
        <p className="text-xs font-medium text-blue-500 uppercase tracking-widest mb-2">
          Phase 2 Coming
        </p>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
          RSVP
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {documentTitle ? `"${documentTitle}"` : 'Untitled'} —{' '}
          {wordList.length.toLocaleString()} words ready
        </p>
      </div>

      {/* Show the first word as a teaser */}
      {wordList.length > 0 && (
        <div className="px-8 py-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center min-w-48">
          <span className="text-3xl font-medium text-gray-800 dark:text-gray-100">
            {wordList[0]}
          </span>
          <p className="text-xs text-gray-400 mt-2">First word</p>
        </div>
      )}

      <button
        onClick={() => navigate('/preview')}
        className="px-5 py-2.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        Back to Preview
      </button>
    </div>
  )
}
