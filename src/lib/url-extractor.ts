import { Readability } from '@mozilla/readability'

export interface ExtractResult {
  title: string
  words: string[]
}

export interface ExtractError {
  type: 'cors' | 'parse' | 'empty' | 'network'
  message: string
}

/**
 * Fetch a URL and extract article text using @mozilla/readability.
 * Returns ExtractResult on success, ExtractError on any failure.
 *
 * CORS note: Most major sites will block cross-origin fetch.
 * This is expected and by design — the error path offers paste as fallback.
 */
export async function extractArticle(
  url: string
): Promise<ExtractResult | ExtractError> {
  let html: string
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return {
        type: 'network',
        message: `The page returned an error (${response.status}). Try pasting the text instead.`,
      }
    }
    html = await response.text()
  } catch (err) {
    // TypeError from fetch = CORS block or network failure
    const isCors =
      err instanceof TypeError &&
      (err.message.toLowerCase().includes('fetch') ||
        err.message.toLowerCase().includes('cors') ||
        err.message.toLowerCase().includes('network'))
    return {
      type: isCors ? 'cors' : 'network',
      message: isCors
        ? 'This site does not allow apps to fetch its content directly. Paste the article text instead.'
        : 'Could not reach the page. Check your connection and try again.',
    }
  }

  // Parse with native DOMParser — no jsdom needed in the browser
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Set base URL so Readability resolves relative links correctly
  const base = doc.createElement('base')
  base.href = url
  doc.head.prepend(base)

  const reader = new Readability(doc)
  const article = reader.parse()

  if (!article || !article.textContent?.trim()) {
    return {
      type: 'parse',
      message:
        'Could not find readable article text on this page. Try pasting the text instead.',
    }
  }

  // Tokenize to words (same pattern as tokenize.ts — whitespace split, filter empty)
  const words = article.textContent
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)

  if (words.length < 10) {
    return {
      type: 'empty',
      message: 'Not enough readable text found on this page. Try pasting the text instead.',
    }
  }

  return {
    title: article.title?.trim() || new URL(url).hostname,
    words,
  }
}
