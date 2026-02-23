/**
 * Detect document format from filename and MIME type.
 *
 * Design:
 * - Extension check takes priority over MIME (some browsers report wrong MIME for PDFs)
 * - Falls back to 'txt' for anything unrecognized — safe default
 * - 'txt' signals to DocumentService to handle on the main thread (no Worker needed)
 */
export type DocFormat = 'pdf' | 'txt'

export function detectFormat(filename: string, mimeType: string): DocFormat {
  const lower = filename.toLowerCase()

  // PDF: check extension first, then MIME
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') {
    return 'pdf'
  }

  // All other formats (including .txt) — tokenized on main thread
  return 'txt'
}
