import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRsvpStore } from '../../store/rsvp-store'
import { computeWordDelay } from '../../lib/scheduler'
import { ORPDisplay } from './ORPDisplay'
import { PlaybackControls } from './PlaybackControls'
import { ProgressBar } from './ProgressBar'
import { TextPanel } from './TextPanel'

/**
 * RSVPReader — the complete RSVP reading screen at /read.
 *
 * Owns all side effects:
 * - performance.now() deadline scheduler (drift-free, one setTimeout at a time)
 * - Keyboard shortcuts: Space=toggle, ArrowLeft=jump back, ArrowRight=jump forward
 * - visibilitychange listener to auto-pause on background tab
 * - Guard redirect: if wordList is empty on mount, navigate back to /
 *
 * State is managed in Zustand (rsvp-store). Refs bridge between React renders
 * and timer callbacks to avoid stale closures.
 */
export default function RSVPReader() {
  const navigate = useNavigate()

  // Zustand selectors
  const wordList = useRsvpStore((s) => s.wordList)
  const currentWordIndex = useRsvpStore((s) => s.currentWordIndex)
  const isPlaying = useRsvpStore((s) => s.isPlaying)
  const wpm = useRsvpStore((s) => s.wpm)
  const jumpSize = useRsvpStore((s) => s.jumpSize)

  // Zustand actions
  const setIsPlaying = useRsvpStore((s) => s.setIsPlaying)
  const setCurrentWordIndex = useRsvpStore((s) => s.setCurrentWordIndex)

  // Refs for stale-closure-safe timer callbacks
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wpmRef = useRef<number>(wpm)
  const isPlayingRef = useRef<boolean>(isPlaying)
  const wordListRef = useRef<string[]>(wordList)
  const currentWordIndexRef = useRef<number>(currentWordIndex)
  const jumpSizeRef = useRef<number>(jumpSize)

  // Keep refs in sync with store values
  useEffect(() => { wpmRef.current = wpm }, [wpm])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { wordListRef.current = wordList }, [wordList])
  useEffect(() => { currentWordIndexRef.current = currentWordIndex }, [currentWordIndex])
  useEffect(() => { jumpSizeRef.current = jumpSize }, [jumpSize])

  // Guard redirect: if wordList is empty on mount, navigate to /
  useEffect(() => {
    if (wordList.length === 0) {
      navigate('/', { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Scheduler: performance.now() deadline-corrected timer
  // Depends only on isPlaying — reads wpm and wordList from refs at fire time.
  useEffect(() => {
    /**
     * scheduleNext(index, scheduledAt)
     *
     * Shows the word at `index` (already set in store), then schedules the
     * advance to `index + 1` using deadline correction:
     *   remaining = targetDelay - (performance.now() - scheduledAt)
     *
     * This prevents drift: each subsequent word is scheduled relative to when
     * THIS word was supposed to appear, not when it actually appeared.
     */
    function scheduleNext(index: number, scheduledAt: number) {
      const word = wordListRef.current[index]

      // End of list or invalid index — stop playback
      if (!word || index >= wordListRef.current.length) {
        setIsPlaying(false)
        return
      }

      const targetDelay = computeWordDelay(word, wpmRef.current)
      const elapsed = performance.now() - scheduledAt
      const remaining = Math.max(0, targetDelay - elapsed)

      timeoutRef.current = setTimeout(() => {
        // Check if paused while timeout was pending
        if (!isPlayingRef.current) return

        const next = index + 1

        // Stop at last word — do not advance past end
        if (next >= wordListRef.current.length) {
          setIsPlaying(false)
          return
        }

        setCurrentWordIndex(next)
        scheduleNext(next, performance.now())
      }, remaining)
    }

    if (isPlaying) {
      scheduleNext(currentWordIndex, performance.now())
    } else {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
    }

    return () => {
      clearTimeout(timeoutRef.current ?? 0)
    }
  }, [isPlaying]) // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally NOT including currentWordIndex or wpm — those are read from refs.
  // Only isPlaying toggles the scheduler on/off.

  // Keyboard shortcuts — stale-closure-safe via refs
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't fire shortcuts when user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === ' ') {
        // e.preventDefault() prevents Space from clicking the focused button
        // (which would cause a double-fire: keydown handler + button onClick)
        e.preventDefault()
        setIsPlaying(!isPlayingRef.current)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentWordIndex(Math.max(0, currentWordIndexRef.current - jumpSizeRef.current))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentWordIndex(
          Math.min(wordListRef.current.length - 1, currentWordIndexRef.current + jumpSizeRef.current)
        )
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Empty deps — all state is read from refs (stale-closure safe)

  // Visibility auto-pause — prevents word burst when returning to tab
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden && isPlayingRef.current) {
        setIsPlaying(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-dvh bg-gray-950 overflow-hidden">
      {/* RSVP zone — flex-shrink-0 keeps it fixed at top in all browsers (including Firefox mobile) */}
      <div className="h-[40dvh] flex-shrink-0 bg-gray-950 relative
                      flex flex-col items-center justify-center gap-4 px-4">
        {/* Back button — top-left corner, unobtrusive */}
        <button
          onClick={() => navigate('/')}
          aria-label="Back to home"
          className="absolute top-3 left-3 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Back
        </button>
        <ProgressBar />
        <ORPDisplay word={wordList[currentWordIndex] ?? ''} />
        <div className="w-full max-w-xl">
          <PlaybackControls />
        </div>
      </div>

      {/* Divider between RSVP zone and text panel */}
      <div className="border-t border-gray-800 flex-shrink-0" />

      {/* Text panel — fills remaining 60% of viewport, scrolls independently */}
      <TextPanel />
    </div>
  )
}
