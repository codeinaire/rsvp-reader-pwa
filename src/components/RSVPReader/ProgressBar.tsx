import { useRsvpStore } from '../../store/rsvp-store'

export function ProgressBar() {
  const currentWordIndex = useRsvpStore((s) => s.currentWordIndex)
  const wordList = useRsvpStore((s) => s.wordList)
  const total = wordList.length

  if (total === 0) {
    return null // Don't render when no document loaded
  }

  // Display is 1-indexed for human readability: "Word 1 / 100" not "Word 0 / 100"
  const displayIndex = currentWordIndex + 1
  const pct = Math.round((currentWordIndex / Math.max(1, total - 1)) * 100)

  return (
    <div className="text-sm text-gray-400 text-center tabular-nums">
      Word {displayIndex.toLocaleString()} / {total.toLocaleString()} ({pct}%)
    </div>
  )
}
