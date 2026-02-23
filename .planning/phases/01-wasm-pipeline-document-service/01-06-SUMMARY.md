---
phase: 01-wasm-pipeline-document-service
plan: "06"
subsystem: infra
tags: [vite, wasm, worker, build, production]

# Dependency graph
requires:
  - phase: 01-wasm-pipeline-document-service
    plan: "05"
    provides: "EntryScreen, TextPreview, RSVPPlaceholder, DocumentService, WASM worker — complete Phase 1 pipeline"
provides:
  - "Production build passing — WASM, Worker, React app all compile cleanly"
  - "WASM bundle confirmed at 1018 KB (under 2 MB target) as a separate asset"
  - "Human-verified Phase 1: all four success criteria confirmed passing in production build"
  - "Phase 1 declared complete and shippable — Phase 2 planning unblocked"
affects: [phase-02-rsvp-engine, all-future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Worker format must be 'es' when WASM module imports cause top-level await"
    - "vite-plugin-top-level-await is incompatible with Vite 7 worker bundling — do not use"
    - "Bundler-target WASM pkg (wasm-pack --target bundler) needs no async init() — WASM loads synchronously on module import"
    - "nvm use 22 required before npm run build — Vite 7 requires Node 20.19+ or 22.12+"

key-files:
  created: []
  modified:
    - src/App.tsx
    - src/components/RSVPPlaceholder/RSVPPlaceholder.tsx
    - src/workers/parser-worker.ts
    - vite.config.ts

key-decisions:
  - "Remove vite-plugin-top-level-await: incompatible with Vite 7 worker bundling (path.join undefined crash); not needed since worker has no top-level await after removing init() call"
  - "worker.format = 'es': required for WASM static imports — iife format rejects top-level await"
  - "Bundler-target WASM pkg has no init() export — wasm-pack --target bundler loads WASM synchronously via bundler static import, not async init()"

patterns-established:
  - "Build verification: always run 'nvm use 22 && npm run build' — Node version matters for Vite 7"
  - "Worker format: set worker.format = 'es' in vite.config.ts when Worker imports WASM"

requirements-completed:
  - DOCF-01
  - IMPT-04

# Metrics
duration: ~39min
completed: 2026-02-23
---

# Phase 1 Plan 06: Phase 1 Human Verification Summary

**All four Phase 1 success criteria human-verified in production build: paste-text flow, text-layer PDF extraction, scanned-PDF error banner, and non-blocking WASM init — Phase 1 complete**

## Performance

- **Duration:** ~39 min (including human verification time at localhost:4173)
- **Started:** 2026-02-23T05:55:47Z
- **Completed:** 2026-02-23T06:34:42Z
- **Tasks:** 2 of 2 complete
- **Files modified:** 5 (App.tsx, RSVPPlaceholder.tsx, parser-worker.ts, vite.config.ts, index.html)

## Accomplishments
- Production build (`npm run build`) exits successfully with code 0
- WASM binary present in `dist/assets/rsvp_parser_bg-BHP_P2Kb.wasm` as a separate asset (not inlined into JS)
- WASM bundle size: 1,042,568 bytes (1018 KB) — well under the 2 MB target
- Human verified all four Phase 1 success criteria at localhost:4173 (production preview)
- Phase 1 declared complete and shippable — Phase 2 RSVP engine planning unblocked

## Phase 1 Verification Results

All four Phase 1 success criteria from ROADMAP.md confirmed by human:

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Paste text flow: entry -> preview (word count) -> placeholder RSVP -> back navigation | PASS |
| 2 | Text-layer PDF: extracted to readable text with word count visible | PASS |
| 3 | Scanned/image PDF: actionable error banner, auto-dismisses after ~4s | PASS |
| 4 | WASM non-blocking: app renders immediately, import button enables when WASM ready | PASS |

## Task Commits

Each task was committed atomically:

1. **Task 1: Production build and pre-verification checks** - `ec3d50d` (fix)
2. **Task 2: checkpoint:human-verify — Phase 1 human verification** - Approved (no code commit — verification only)

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified
- `src/App.tsx` - Removed unused `import React from 'react'` (modern jsx-react transform)
- `src/components/RSVPPlaceholder/RSVPPlaceholder.tsx` - Removed unused `import React from 'react'`
- `src/workers/parser-worker.ts` - Removed async init() call; bundler-target WASM is ready synchronously
- `vite.config.ts` - Removed vite-plugin-top-level-await; added worker.format = 'es'
- `index.html` - Title already updated to "RSVP Reader" from prior plan work

## Decisions Made
- **Removed vite-plugin-top-level-await:** This plugin has a known incompatibility with Vite 7's worker bundling — it crashes with `path.join(undefined)` when generating worker chunks. The plugin was only needed for `await init()` at module scope, which was removed since the bundler-target WASM pkg doesn't have an `init()` export.
- **worker.format = 'es':** Vite 7 defaults workers to `iife` format, but the WASM static import creates a top-level `await` that iife cannot handle. Setting `format: 'es'` resolves this.
- **Removed `await init()` from worker:** The WASM pkg was built with `wasm-pack --target bundler` which uses static ESM import (`import * as wasm from "./rsvp_parser_bg.wasm"`). The bundler (Vite + vite-plugin-wasm) handles initialization transparently — no explicit `init()` call needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused React imports causing TS6133 errors**
- **Found during:** Task 1 (Production build)
- **Issue:** `App.tsx` and `RSVPPlaceholder.tsx` imported `React` which is not needed with modern `jsx: react-jsx` transform; TypeScript `noUnusedLocals: true` flags this as an error
- **Fix:** Removed `import React from 'react'` from both files
- **Files modified:** `src/App.tsx`, `src/components/RSVPPlaceholder/RSVPPlaceholder.tsx`
- **Verification:** Build passes, no TS6133 errors
- **Committed in:** ec3d50d

**2. [Rule 1 - Bug] Fixed worker importing non-existent init() from bundler-target WASM pkg**
- **Found during:** Task 1 (Production build)
- **Issue:** `parser-worker.ts` imported `init` and called `await init()`, but the WASM pkg was built with `--target bundler` which exports only `parse_pdf` (no default `init()` export). TypeScript error: TS2349 "This expression is not callable"
- **Fix:** Removed `init` import and async `initialize()` function; replaced with synchronous init signal (WASM loads at module-import time via bundler)
- **Files modified:** `src/workers/parser-worker.ts`
- **Verification:** Build passes, no TS2349 errors
- **Committed in:** ec3d50d

**3. [Rule 3 - Blocking] Removed vite-plugin-top-level-await (Vite 7 incompatibility)**
- **Found during:** Task 1 (Production build)
- **Issue:** `vite-plugin-top-level-await@1.6.0` crashes with `path.join(undefined)` in its `generateBundle` hook when Vite 7 processes worker chunks — a known incompatibility with Vite 7's internal bundle API changes
- **Fix:** Removed the plugin from both `plugins` and `worker.plugins` in `vite.config.ts`; also added `worker.format = 'es'` (required because WASM imports use top-level await, which iife format rejects)
- **Files modified:** `vite.config.ts`
- **Verification:** Build passes cleanly
- **Committed in:** ec3d50d

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs, 1 Rule 3 blocking)
**Impact on plan:** All three fixes were required for the build to succeed. No scope creep — changes are minimal and targeted.

## Issues Encountered
- Node.js version mismatch: shell was running Node 20.16.0 but Vite 7 requires 20.19+/22.12+. STATE.md records the fix: `nvm use 22` (22.22.0). Not a code issue — environment setup only.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 1 is complete and shippable — all success criteria verified by human
- All Phase 1 requirements satisfied: DOCF-01 (PDF import with scanned-PDF error path) and IMPT-04 (paste text and begin reading)
- Phase 2 (RSVP playback engine) can begin immediately — replace `RSVPPlaceholder` at `/read` with the real RSVP engine
- Phase 3 can wire the settings icon in EntryScreen header (aria-label="Settings" button already in place)
- STATE.md architecture decisions, pitfall notes, and tech decisions carry forward to Phase 2

## Self-Check: PASSED

- FOUND: 01-06-SUMMARY.md at `.planning/phases/01-wasm-pipeline-document-service/01-06-SUMMARY.md`
- FOUND: WASM binary at `dist/assets/rsvp_parser_bg-BHP_P2Kb.wasm`
- FOUND: ec3d50d commit in git history

---
*Phase: 01-wasm-pipeline-document-service*
*Completed: 2026-02-23*
