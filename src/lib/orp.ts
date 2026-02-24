/**
 * ORP (Optimal Recognition Point) fragment computation.
 *
 * Splits a word into three parts — left, focal, right — where the focal
 * character is positioned at the Optimal Recognition Point. The ORP is the
 * point at which the eye naturally focuses to recognize a word most efficiently.
 *
 * Formula: orpIndex = Math.max(0, Math.ceil(graphemes.length * 0.3) - 1)
 *
 * Uses Intl.Segmenter for grapheme cluster splitting to correctly handle
 * Unicode, accented characters, emoji, and combining marks.
 */

export interface OrpFragments {
  left: string
  focal: string
  right: string
}

// Module-level singleton — avoids recreating the segmenter on every call
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/**
 * Split a word into ORP fragments: { left, focal, right }.
 *
 * @param word - The word to split (may include punctuation)
 * @returns OrpFragments with the focal character at the ORP index
 */
export function computeOrp(word: string): OrpFragments {
  const graphemes = [...segmenter.segment(word)].map((s) => s.segment)

  if (graphemes.length === 0) {
    return { left: '', focal: '', right: '' }
  }

  const orpIndex = Math.max(0, Math.ceil(graphemes.length * 0.3) - 1)

  return {
    left: graphemes.slice(0, orpIndex).join(''),
    focal: graphemes[orpIndex] ?? '',
    right: graphemes.slice(orpIndex + 1).join(''),
  }
}
