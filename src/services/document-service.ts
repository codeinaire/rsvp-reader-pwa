import { ParseMessageType } from '../workers/worker-types'
import type { WorkerResponse, ParseRequest } from '../workers/worker-types'
import { tokenize } from '../lib/tokenize'
import { detectFormat } from '../lib/format-detect'

export interface ParseResult {
  words: string[]
  title: string | null
  parseMs: number
}

type PendingRequest = {
  resolve: (value: ParseResult) => void
  reject: (reason: Error) => void
}

class DocumentService {
  private readonly worker: Worker
  private readonly ready: Promise<void>
  private resolveReady!: () => void
  private rejectReady!: (e: Error) => void
  private readonly pending = new Map<number, PendingRequest>()
  private nextId = 1

  constructor() {
    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve
      this.rejectReady = reject
    })

    // Vite resolves the Worker URL at build time from import.meta.url.
    // type: 'module' is required for ES module workers (imports inside worker file).
    this.worker = new Worker(
      new URL('../workers/parser-worker.ts', import.meta.url),
      { type: 'module' },
    )

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data

      if (msg.type === ParseMessageType.Init) {
        if (msg.success) {
          this.resolveReady()
        } else {
          this.rejectReady(new Error(`WASM init failed: ${msg.error}`))
        }
        return
      }

      // Parse response — look up pending request by ID
      const req = this.pending.get(msg.id)
      if (!req) return
      this.pending.delete(msg.id)

      if (msg.type === ParseMessageType.Error) {
        req.reject(new Error(msg.error))
      } else if (msg.type === ParseMessageType.ParseDocument && msg.success) {
        req.resolve({ words: msg.words, title: msg.title, parseMs: msg.parseMs })
      }
    }

    this.worker.onerror = (e) => {
      const err = new Error(e.message ?? 'Worker crashed')
      this.rejectReady(err)
      for (const [, req] of this.pending) {
        req.reject(new Error('Worker crashed unexpectedly'))
      }
      this.pending.clear()
    }
  }

  /**
   * Returns a promise that resolves when WASM initialization is complete.
   * Used by EntryScreen to enable/disable the import button.
   * Safe to call multiple times — resolves immediately after first init.
   */
  ensureReady(): Promise<void> {
    return this.ready
  }

  /**
   * Parse a File object. Detects format from name + MIME type.
   *
   * PDF files: sent as Uint8Array to the Worker (zero-copy transfer).
   * Plain text files: read as text, tokenized on main thread (no WASM).
   *
   * @throws Error with a user-facing message if extraction fails or PDF is scanned.
   */
  async parseFile(file: File): Promise<ParseResult> {
    await this.ready
    const format = detectFormat(file.name, file.type)

    // Plain text: no WASM needed — tokenize on main thread
    if (format === 'txt') {
      const text = await file.text()
      const words = tokenize(text)
      return {
        words,
        title: file.name.replace(/\.[^.]+$/, ''), // strip extension for title
        parseMs: 0,
      }
    }

    // Binary formats: transfer bytes to Worker (zero-copy)
    // IMPORTANT: Use arrayBuffer() NOT text() — text() corrupts binary files
    const bytes = new Uint8Array(await file.arrayBuffer())
    const id = this.nextId++
    const request: ParseRequest = {
      type: ParseMessageType.ParseDocument,
      id,
      format,
      data: bytes,
    }
    // Transfer bytes.buffer — after this call, bytes is detached (Worker owns it)
    this.worker.postMessage(request, [bytes.buffer])

    return new Promise<ParseResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
  }

  /**
   * Parse raw text string (paste path — IMPT-04).
   * Synchronous. No WASM involved.
   */
  parseText(text: string): ParseResult {
    return {
      words: tokenize(text),
      title: null,
      parseMs: 0,
    }
  }
}

// Singleton — starts WASM initialization as a side effect of import.
// Import this in main.tsx BEFORE createRoot() so init starts early,
// but NEVER await ensureReady() before createRoot().render().
export const documentService = new DocumentService()
