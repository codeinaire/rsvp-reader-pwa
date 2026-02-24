import { describe, it, expect } from 'vitest'
import { computeOrp } from './orp'

describe('computeOrp', () => {
  it('returns empty fragments for empty string', () => {
    expect(computeOrp('')).toEqual({ left: '', focal: '', right: '' })
  })

  it('returns single char as focal for 1-grapheme word', () => {
    // 1 grapheme: orp = max(0, ceil(1*0.3)-1) = max(0, ceil(0.3)-1) = max(0, 1-1) = 0
    expect(computeOrp('I')).toEqual({ left: '', focal: 'I', right: '' })
  })

  it('returns focal at index 0 for 2-grapheme word', () => {
    // 2 graphemes: orp = max(0, ceil(2*0.3)-1) = max(0, ceil(0.6)-1) = max(0, 1-1) = 0
    expect(computeOrp('is')).toEqual({ left: '', focal: 'i', right: 's' })
  })

  it('returns focal at index 0 for 3-grapheme word', () => {
    // 3 graphemes: orp = max(0, ceil(3*0.3)-1) = max(0, ceil(0.9)-1) = max(0, 1-1) = 0
    expect(computeOrp('the')).toEqual({ left: '', focal: 't', right: 'he' })
  })

  it('returns focal at index 1 for 4-grapheme word', () => {
    // 4 graphemes: orp = max(0, ceil(4*0.3)-1) = max(0, ceil(1.2)-1) = max(0, 2-1) = 1
    expect(computeOrp('word')).toEqual({ left: 'w', focal: 'o', right: 'rd' })
  })

  it('returns focal at index 1 for 5-grapheme word (Hello)', () => {
    // 5 graphemes: orp = max(0, ceil(5*0.3)-1) = max(0, ceil(1.5)-1) = max(0, 2-1) = 1
    expect(computeOrp('Hello')).toEqual({ left: 'H', focal: 'e', right: 'llo' })
  })

  it('returns focal at index 2 for 7-grapheme word (reading)', () => {
    // 7 graphemes: orp = max(0, ceil(7*0.3)-1) = max(0, ceil(2.1)-1) = max(0, 3-1) = 2
    expect(computeOrp('reading')).toEqual({ left: 're', focal: 'a', right: 'ding' })
  })

  it('returns focal at index 2 for 9-grapheme word (excellent)', () => {
    // 9 graphemes: orp = max(0, ceil(9*0.3)-1) = max(0, ceil(2.7)-1) = max(0, 3-1) = 2
    expect(computeOrp('excellent')).toEqual({ left: 'ex', focal: 'c', right: 'ellent' })
  })

  it('returns focal at index 3 for 11-grapheme word (transformer)', () => {
    // 11 graphemes: orp = max(0, ceil(11*0.3)-1) = max(0, ceil(3.3)-1) = max(0, 4-1) = 3
    expect(computeOrp('transformer')).toEqual({ left: 'tra', focal: 'n', right: 'sformer' })
  })

  it('handles Unicode word with combining marks (café)', () => {
    // café = 4 graphemes (c, a, f, é) using Intl.Segmenter
    // orp = max(0, ceil(4*0.3)-1) = max(0, 2-1) = 1
    // left='c', focal='a', right='fé'
    const result = computeOrp('café')
    expect(result.left.length).toBeGreaterThanOrEqual(0)
    expect(result.focal).not.toBe('')
    // Key: focal should be at grapheme index 1 — 'a'
    expect(result.focal).toBe('a')
    expect(result.left).toBe('c')
    expect(result.right).toBe('fé')
  })
})
