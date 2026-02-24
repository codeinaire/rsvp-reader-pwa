import { describe, it, expect } from 'vitest'
import { computeWordDelay } from './scheduler'

describe('computeWordDelay', () => {
  // All tests at wpm=300, base delay = 60000/300 = 200ms

  it('returns 160ms for 1-letter word (short multiplier 0.8)', () => {
    // "I" -> 1 letter -> multiplier 0.8 -> 200 * 0.8 * 1.0 = 160
    expect(computeWordDelay('I', 300)).toBe(160)
  })

  it('returns 160ms for 2-letter word (short multiplier 0.8)', () => {
    // "is" -> 2 letters -> multiplier 0.8 -> 200 * 0.8 * 1.0 = 160
    expect(computeWordDelay('is', 300)).toBe(160)
  })

  it('returns 200ms for 3-letter word (normal multiplier 1.0)', () => {
    // "the" -> 3 letters -> multiplier 1.0 -> 200 * 1.0 * 1.0 = 200
    expect(computeWordDelay('the', 300)).toBe(200)
  })

  it('returns 200ms for 5-letter word (normal multiplier 1.0)', () => {
    // "Hello" -> 5 letters -> multiplier 1.0 -> 200 * 1.0 * 1.0 = 200
    expect(computeWordDelay('Hello', 300)).toBe(200)
  })

  it('returns 200ms for 6-letter word (normal multiplier 1.0)', () => {
    // "really" -> 6 letters -> multiplier 1.0 -> 200 * 1.0 * 1.0 = 200
    expect(computeWordDelay('simple', 300)).toBe(200)
  })

  it('returns 240ms for 7-letter word (medium multiplier 1.2)', () => {
    // "reading" -> 7 letters -> multiplier 1.2 -> 200 * 1.2 * 1.0 = 240
    expect(computeWordDelay('reading', 300)).toBe(240)
  })

  it('returns 240ms for 9-letter word (medium multiplier 1.2)', () => {
    // "excellent" -> 9 letters -> multiplier 1.2 -> 200 * 1.2 * 1.0 = 240
    expect(computeWordDelay('excellent', 300)).toBe(240)
  })

  it('returns 300ms for 11-letter word (long multiplier 1.5)', () => {
    // "transformer" -> 11 letters -> multiplier 1.5 -> 200 * 1.5 * 1.0 = 300
    expect(computeWordDelay('transformer', 300)).toBe(300)
  })

  it('applies 1.5x sentence multiplier for word ending with period', () => {
    // "end." -> 3 letters -> multiplier 1.0, sentence 1.5 -> 200 * 1.0 * 1.5 = 300
    expect(computeWordDelay('end.', 300)).toBe(300)
  })

  it('applies 1.5x sentence multiplier for word ending with exclamation', () => {
    // "done!" -> 4 letters -> multiplier 1.0, sentence 1.5 -> 200 * 1.0 * 1.5 = 300
    expect(computeWordDelay('done!', 300)).toBe(300)
  })

  it('applies 1.5x sentence multiplier for word ending with question mark', () => {
    // "really?" -> 6 letters -> multiplier 1.0, sentence 1.5 -> 200 * 1.0 * 1.5 = 300
    expect(computeWordDelay('really?', 300)).toBe(300)
  })

  it('applies 1.5x sentence multiplier for word with ellipsis (word...)', () => {
    // "word..." -> letters="word" (4), sentence ends with . -> 200 * 1.0 * 1.5 = 300
    expect(computeWordDelay('word...', 300)).toBe(300)
  })

  it('verifies WPM math accuracy at 600 WPM', () => {
    // "the" -> 3 letters -> 1.0 multiplier -> 60000/600 * 1.0 * 1.0 = 100
    expect(computeWordDelay('the', 600)).toBe(100)
  })
})
