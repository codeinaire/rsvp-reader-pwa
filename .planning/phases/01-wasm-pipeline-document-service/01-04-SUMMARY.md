---
phase: 01-wasm-pipeline-document-service
plan: "04"
subsystem: infra
tags: [typescript, wasm, web-worker, document-service, tokenizer, pdf, format-detection]

# Dependency graph
requires:
  - phase: 01-02
    provides: "WASM pkg at rsvp-parser/crates/rsvp-parser/pkg/ with parse_pdf(Uint8Array) export"
  - phase: 01-03
    provides: "useRsvpStore with wordList, setDocument, isWorkerReady, routing shell"
provides:
  - "src/workers/worker-types.ts — ParseMessageType const, DocFormat, ParseRequest, WorkerResponse union"
  - "src/workers/parser-worker.ts — WASM host Worker with lazy init, handles parse_pdf messages"
  - "src/services/document-service.ts — Promise facade over Worker; documentService singleton"
  - "src/lib/tokenize.ts — whitespace-split tokenizer for paste and txt file paths"
  - "src/lib/format-detect.ts — PDF extension/MIME detection, txt fallback"
affects:
  - 01-05-PLAN  # EntryScreen depends on documentService.parseFile(), parseText(), ensureReady()

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Worker message protocol via const object (not enum) for erasableSyntaxOnly tsconfig compatibility"
    - "Request ID map for concurrent Worker requests — no cross-contamination"
    - "ArrayBuffer transfer (not copy) for zero-copy PDF byte delivery to Worker"
    - "Lazy WASM init: Worker calls initialize() at module eval; main thread awaits ready Promise"
    - "ParseText synchronous path bypasses Worker entirely — no WASM for paste or txt"

key-files:
  created:
    - "src/workers/worker-types.ts"
    - "src/workers/parser-worker.ts"
    - "src/services/document-service.ts"
    - "src/lib/tokenize.ts"
    - "src/lib/format-detect.ts"
  modified: []

key-decisions:
  - "ParseMessageType implemented as const object (not enum) — TypeScript 5.9 erasableSyntaxOnly forbids runtime enum emit"

# Metrics
duration: ~10min
completed: 2026-02-23
---

# Phase 01 Plan 04: WASM Worker Pipeline and Document Service Summary

**Worker+DocumentService pipeline fully operational: five TypeScript files deliver a complete file-bytes-to-word-array path using zero-copy Uint8Array transfer to a WASM Web Worker, with a synchronous paste/txt fallback that bypasses WASM entirely**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-02-23T05:37:58Z
- **Completed:** 2026-02-23T05:47:43Z
- **Tasks:** 2/2 complete
- **Files modified:** 0 modified, 5 created

## Accomplishments

- `worker-types.ts` defines the full Worker message protocol: ParseMessageType const object, ParseRequest (main→worker), WorkerResponse union type (worker→main), DocFormat
- `tokenize.ts` implements whitespace-split tokenizer with empty-string filter for paste and txt paths
- `format-detect.ts` detects PDF by extension (priority) and MIME type, falls back to txt
- `parser-worker.ts` hosts WASM, initializes lazily at module eval time, handles parse_pdf messages with timing, posts Init/ParseDocument/Error responses
- `document-service.ts` provides Promise API over Worker via request ID map; parseFile() transfers bytes; parseText() is synchronous; ensureReady() allows upstream components to wait for WASM init

## Task Commits

Each task was committed atomically:

1. **Task 1: Create worker-types.ts, tokenize.ts, and format-detect.ts** - `518136f` (feat)
2. **Task 2: Create parser-worker.ts and document-service.ts** - `69dd4f1` (feat)

## Files Created/Modified

- `src/workers/worker-types.ts` - Created: message protocol types for Worker↔main thread
- `src/lib/tokenize.ts` - Created: whitespace tokenizer
- `src/lib/format-detect.ts` - Created: PDF/txt format detection
- `src/workers/parser-worker.ts` - Created: WASM host Worker
- `src/services/document-service.ts` - Created: main-thread facade, documentService singleton

## Decisions Made

- **ParseMessageType as const object, not enum:** TypeScript 5.9 with `erasableSyntaxOnly: true` forbids regular enum declarations (they emit runtime JavaScript). Used `export const ParseMessageType = { ... } as const` with a companion type alias `export type ParseMessageType = (typeof ParseMessageType)[keyof typeof ParseMessageType]`. This provides identical dot-access ergonomics (`ParseMessageType.Init`) and discriminated union narrowing, with zero runtime emission.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced enum with const object for erasableSyntaxOnly tsconfig compatibility**
- **Found during:** Task 1 (before writing any file — pre-flight tsconfig check)
- **Issue:** `tsconfig.app.json` has `erasableSyntaxOnly: true`. The plan specified `export enum ParseMessageType` which emits runtime JavaScript. TypeScript 5.9 rejects this with error TS1294: "This syntax is not allowed when 'erasableSyntaxOnly' is enabled."
- **Fix:** Replaced `enum` with `export const ParseMessageType = { ... } as const` plus a type alias. All downstream usage (ParseRequest interface, WorkerResponse union, worker + service files) uses `typeof ParseMessageType.X` for literal types — structurally equivalent and fully narrowable.
- **Files modified:** `src/workers/worker-types.ts`
- **Commit:** `518136f` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — code-that-would-not-compile)
**Impact on plan:** No scope change. The const pattern is strictly equivalent to enum for this use case (string literal discrimination). All must_haves and artifacts are satisfied.

## Issues Encountered

None beyond the erasableSyntaxOnly deviation. TypeScript compiled cleanly with `npx tsc --noEmit` after both tasks.

## User Setup Required

None.

## Next Phase Readiness

- Plan 05 (EntryScreen): `documentService.parseFile()`, `parseText()`, `ensureReady()` are all available
- `ParseResult` interface (words, title, parseMs) is exported for use in React components
- WASM init starts as side effect of `import { documentService }` — no manual init call needed

**Concerns:**
- None. All five files typecheck cleanly.

## Self-Check: PASSED

- FOUND: src/workers/worker-types.ts
- FOUND: src/workers/parser-worker.ts
- FOUND: src/services/document-service.ts
- FOUND: src/lib/tokenize.ts
- FOUND: src/lib/format-detect.ts
- FOUND: 518136f (Task 1 commit)
- FOUND: 69dd4f1 (Task 2 commit)

---
*Phase: 01-wasm-pipeline-document-service*
*Completed: 2026-02-23*
