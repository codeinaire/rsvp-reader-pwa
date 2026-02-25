import { useEffect, useRef } from 'react'
import { useRsvpStore } from '../../store/rsvp-store'

/**
 * TextPanel — scrollable full-text panel for the dual-view reading layout.
 *
 * Architecture decisions (per RESEARCH.md):
 * - Word highlight via direct DOM mutation (not React state) — avoids O(n) re-render
 *   at 300+ WPM on documents with 10,000+ words.
 * - Auto-scroll uses scrollIntoView({ block: 'nearest' }) — only scrolls if the word
 *   would go off-screen, preventing jarring continuous centering.
 * - Manual scroll detection: boolean ref + 2s timeout. User scroll pauses auto-scroll;
 *   resumes automatically after 2 seconds of no scroll activity.
 * - Ref array uses callback ref pattern — one mutable array, populated on render,
 *   avoids creating thousands of individual useRef objects.
 */
export function TextPanel() {
  const wordList = useRsvpStore((s) => s.wordList)
  const currentWordIndex = useRsvpStore((s) => s.currentWordIndex)
  const isPlaying = useRsvpStore((s) => s.isPlaying)
  const textFontSize = useRsvpStore((s) => s.textFontSize)

  // Mutable ref array: one entry per word span
  // Populated by callback refs during render, reset when wordList changes
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

  // Track the previously highlighted span for efficient DOM removal
  const prevIndexRef = useRef<number>(-1)

  // Manual scroll detection: true = user took control; auto-scroll paused
  const userScrolledRef = useRef(false)
  const scrollResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ref for the scrollable panel container
  const panelRef = useRef<HTMLDivElement>(null)

  // Reset ref array when word list changes (new document loaded)
  useEffect(() => {
    wordRefs.current = new Array(wordList.length).fill(null)
    prevIndexRef.current = -1
    userScrolledRef.current = false
  }, [wordList.length])

  // Manual scroll listener — sets userScrolledRef, clears after 2 seconds
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    function onScroll() {
      userScrolledRef.current = true
      if (scrollResumeTimerRef.current) clearTimeout(scrollResumeTimerRef.current)
      scrollResumeTimerRef.current = setTimeout(() => {
        userScrolledRef.current = false
      }, 2000)
    }

    panel.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      panel.removeEventListener('scroll', onScroll)
      if (scrollResumeTimerRef.current) clearTimeout(scrollResumeTimerRef.current)
    }
  }, [])

  // Word highlight + auto-scroll: runs on every currentWordIndex change
  useEffect(() => {
    // Remove highlight from previous word (direct DOM mutation)
    const prevEl = wordRefs.current[prevIndexRef.current]
    if (prevEl) {
      prevEl.style.backgroundColor = ''
      prevEl.style.color = ''
      prevEl.style.borderRadius = ''
      prevEl.style.padding = ''
    }

    // Apply highlight to current word
    const currEl = wordRefs.current[currentWordIndex]
    if (currEl) {
      currEl.style.backgroundColor = '#fde047' // yellow-300
      currEl.style.color = '#111827'            // gray-900
      currEl.style.borderRadius = '3px'
      currEl.style.padding = '0 2px'
    }

    prevIndexRef.current = currentWordIndex

    // Auto-scroll: skip if user recently scrolled manually
    if (!userScrolledRef.current && currEl) {
      currEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentWordIndex])

  return (
    <div
      ref={panelRef}
      className={[
        'flex-1 overflow-y-auto px-5 py-5',
        'transition-opacity duration-300',
        isPlaying ? 'opacity-50' : 'opacity-100',
      ].join(' ')}
    >
      <p
        className="leading-relaxed text-gray-200 font-sans"
        style={{ fontSize: textFontSize }}
      >
        {wordList.map((word, i) => (
          <span
            key={i}
            ref={(el) => { wordRefs.current[i] = el }}
          >
            {word}{' '}
          </span>
        ))}
      </p>
    </div>
  )
}
