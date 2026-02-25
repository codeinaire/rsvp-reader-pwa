/**
 * Word delay computation for RSVP timing.
 *
 * Computes the millisecond display duration for a word at a given WPM,
 * applying word-length normalization and sentence-ending pause multipliers.
 *
 * Design:
 * - Base delay: 60_000 / wpm (ms per word at target WPM)
 * - Length multiplier scales display time for readability by word length
 * - Sentence multiplier (1.5x) adds pause after sentence-ending punctuation
 *
 * This module is independent of orp.ts — pure arithmetic, no imports needed.
 */

/**
 * Compute the display duration (in milliseconds) for a word at a given WPM.
 *
 * @param word - The word to display (may include punctuation)
 * @param wpm  - Words per minute target reading speed
 * @returns    - Milliseconds to display this word
 */
export function computeWordDelay(word: string, wpm: number): number {
  const baseMs = 60_000 / wpm

  // Strip non-letter characters to get the letter count for length multiplier
  const letters = word.replace(/\W/g, '')
  const len = letters.length || 1

  // Length multiplier: shorter words get less time, longer words get more
  let lengthMult: number
  if (len <= 2) {
    lengthMult = 0.8
  } else if (len <= 6) {
    lengthMult = 1.0
  } else if (len <= 9) {
    lengthMult = 1.2
  } else {
    lengthMult = 1.5
  }

  // Pause multiplier: sentence-ending gets a long pause, commas a shorter one
  let pauseMult = 1.0
  if (/[.!?]['"]?\s*$/.test(word)) pauseMult = 2.5
  else if (/,\s*$/.test(word)) pauseMult = 1.3

  return baseMs * lengthMult * pauseMult
}
