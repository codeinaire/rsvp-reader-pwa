/**
 * Shared TypeScript types for the parser Worker message protocol.
 * Both parser-worker.ts and document-service.ts import from here.
 * Never import these in React components — use ParseResult from document-service.ts instead.
 */

/**
 * Message type constants for the Worker↔main thread protocol.
 * Using `as const` object instead of enum to satisfy erasableSyntaxOnly tsconfig.
 */
export const ParseMessageType = {
  Init: 'init',
  ParseDocument: 'parse_document',
  Error: 'error',
} as const

export type ParseMessageType = (typeof ParseMessageType)[keyof typeof ParseMessageType]

/** Document formats the Worker can parse. txt is handled on the main thread. */
export type DocFormat = 'pdf' | 'txt'

// ── Main thread → Worker ───────────────────────────────────────────────────────

export interface ParseRequest {
  type: typeof ParseMessageType.ParseDocument
  id: number
  format: DocFormat
  data: Uint8Array // Transferred (not copied) — Worker owns buffer after postMessage
}

// ── Worker → Main thread ───────────────────────────────────────────────────────

export interface InitSuccessResponse {
  type: typeof ParseMessageType.Init
  success: true
  initMs: number
}

export interface InitErrorResponse {
  type: typeof ParseMessageType.Init
  success: false
  error: string
}

export interface ParseSuccessResponse {
  type: typeof ParseMessageType.ParseDocument
  id: number
  success: true
  words: string[]
  title: string | null
  parseMs: number
}

export interface ParseErrorResponse {
  type: typeof ParseMessageType.Error
  id: number
  error: string
}

export type WorkerResponse =
  | InitSuccessResponse
  | InitErrorResponse
  | ParseSuccessResponse
  | ParseErrorResponse
