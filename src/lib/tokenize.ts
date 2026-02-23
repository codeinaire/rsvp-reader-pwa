/**
 * Split text into a word array for RSVP display.
 *
 * Design:
 * - Splits on any whitespace sequence (\s+ handles tabs, newlines, \r\n, multiple spaces)
 * - Preserves punctuation within words (period, comma, etc.) for reading rhythm
 * - Filters empty strings that result from leading/trailing whitespace
 *
 * Used by DocumentService for:
 * - The paste-text path (IMPT-04) — runs on main thread, no WASM needed
 * - The txt file format path
 */
export function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
}
