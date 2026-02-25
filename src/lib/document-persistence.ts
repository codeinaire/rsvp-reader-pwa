import { get, set } from 'idb-keyval'

const PERSIST_KEY = 'rsvp-last-document'

interface PersistedDocument {
  words: string[]
  title: string | null
}

/**
 * Persist the last imported document to IndexedDB.
 * Called after every successful document import (PDF or URL).
 * Silent on failure — storage quota or private browsing will not crash the app.
 *
 * Why IndexedDB (not localStorage): word arrays for long PDFs can exceed
 * localStorage's 5–10 MB cap. idb-keyval adds ~295 bytes brotli'd.
 */
export async function persistDocument(
  words: string[],
  title: string | null
): Promise<void> {
  try {
    await set(PERSIST_KEY, { words, title } satisfies PersistedDocument)
  } catch {
    // Storage quota exceeded, private browsing, or IndexedDB unavailable — silent fail
  }
}

/**
 * Load the last persisted document from IndexedDB.
 * Returns the document if found and valid (>= 10 words), otherwise null.
 * Called once on app init to hydrate offline reading capability.
 */
export async function hydrateLastDocument(): Promise<PersistedDocument | null> {
  try {
    const saved = await get<PersistedDocument>(PERSIST_KEY)
    if (saved && Array.isArray(saved.words) && saved.words.length >= 10) {
      return saved
    }
    return null
  } catch {
    // IndexedDB unavailable — return null (app works without persistence)
    return null
  }
}
