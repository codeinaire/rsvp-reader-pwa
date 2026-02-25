# Project State: RSVP Reader

**Last updated:** 2026-02-24
**Updated by:** execute-plan (02-04)

---

## Project Reference

**Core Value:** One word at a time, eye never moves — read any content faster with zero friction to import.

**Current Focus:** Phase 1 — WASM Pipeline + Document Service

**Key Constraint:** PDF crate WASM compatibility is the highest-risk unknown. Phase 1 must start with a time-boxed spike to validate `pdf-extract` or select a fallback (`pdfium-render`, PDF.js) before committing to implementation.

---

## Current Position

**Phase:** 2 — RSVP Playback Engine
**Plan:** 06 (next to execute)
**Status:** In progress

```
Progress: [x][ ][ ][ ] 1/4 phases complete
          Ph1 Ph2 Ph3 Ph4
```

**Last session:** 2026-02-24T23:58:49Z
**Stopped at:** Completed 02-05-PLAN.md

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| WASM bundle size | < 2 MB per module | 1018 KB (OK) |
| RSVP timing accuracy | 100 words at 300 WPM = 20s ± 1s | Not measured |
| First paint (WASM non-blocking) | No WASM init before ReactDOM.render | Implemented (scaffold) |
| Lighthouse PWA score | Installable + offline | Not measured |

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 01-01 | 6min | 2 | 23 |
| 01-03 | 2min | 2 | 4 |

---
| Phase 01 P02 | 10min | 1 tasks | 6 files |
| Phase 01 P04 | 10min | 2 tasks | 5 files |
| Phase 01 P05 | 3min | 2 tasks | 4 files |
| Phase 01 P06 | 39min | 2 tasks | 5 files |
| Phase 02 P01 | 2 | 2 tasks | 6 files |
| Phase 02 P02 | 3 | 2 tasks | 1 files |
| Phase 02 P04 | 1 | 1 tasks | 1 files |
| Phase 02 P03 | 1 | 2 tasks | 2 files |
| Phase 02 P05 | 2 | 2 tasks | 2 files |

## Accumulated Context

### Architecture Decisions

- **Scheduler:** `performance.now()`-based deadline scheduler required from day one. `setInterval` counter drift is imperceptible in demos but noticeable during real reading. No exceptions.
- **ORP computation:** Must use `Intl.Segmenter` for grapheme cluster splitting. Raw character index produces incorrect focal position for Unicode, accented characters, and ligatures. ORP index = `Math.max(0, Math.ceil(graphemes.length * 0.3) - 1)`.
- **WASM thread model:** Parser WASM runs exclusively in a Web Worker — never on the main thread. `DocumentService` facades the worker with a Promise-based API using request IDs and `ArrayBuffer` transfer (not copy).
- **WASM init:** Lazy initialization on first file import — never `await init()` before `ReactDOM.render`. Show loading indicator inline in import flow.
- **Web Share Target + iOS fallback:** Must be built together in Phase 4, not sequentially. iOS file picker and paste input are first-class paths, not afterthoughts. Share Target is a progressive enhancement.

### Research Flags

- **Phase 1 — PDF crate spike required:** `pdf-extract` WASM compilation is unverified (LOW confidence). Spike first: if it fails, fall back to `pdfium-render` (~40 MB WASM) or PDF.js. Document the decision and rationale when made.
- **Phase 4 — iOS Share Target status:** Apple may have updated WebKit's Share Target support since August 2025. Verify against current iOS release notes before finalizing Phase 4 implementation.
- **All packages:** Verify current versions at implementation time — do not rely on training data version numbers. Run `npm info [package] version` and `cargo search [crate]` before starting each phase.

### Known Pitfalls to Avoid

1. WASM bundle size bloat — set `opt-level = "z"`, `lto = true`, `panic = "abort"` in Cargo.toml from Phase 1; run `wasm-opt -Oz` in build pipeline
2. `setInterval` timing drift — use `performance.now()` deadline scheduler (pause stores `elapsedAtPause`, resume sets `startTime = performance.now() - elapsedAtPause`)
3. PDF extraction quality — always show text preview before RSVP starts; detect empty/very-short extraction and show clear error
4. Background tab throttling — listen to `visibilitychange`, auto-pause on hide, show "Paused" on return
5. JSON serialization for WASM data exchange — use `serde-wasm-bindgen` and `ArrayBuffer` transfer
6. WASM init blocking first paint — lazy-load, never block `ReactDOM.render`
7. **getrandom 0.3.x changed API:** The `--cfg getrandom_backend="wasm_js"` rustflag (getrandom 0.2.x) no longer works. getrandom 0.3.x requires the `wasm_js` Cargo feature. Enable via `lopdf = { features = ["wasm_js"] }` when using pdf-extract.

### Reference Implementation

The workspace contains `rust-image-tools` which demonstrates the WASM Worker pattern (wasm-bindgen setup, serde-wasm-bindgen usage, ArrayBuffer transfer). Use this as the canonical reference when building Phase 1 and Phase 2.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-23 | Merged WASM build + Document Service into single Phase 1 | Both layers are infrastructure with no independent user-facing deliverable; merging avoids a requirement-less phase |
| 2026-02-23 | IMPT-01 (share webpage URL) placed in Phase 4 with PWA | Share Target for URLs requires the service worker POST handler; belongs with the PWA phase, not the import UI phase |
| 2026-02-23 | PWA-03 (iOS fallback) placed in Phase 4 alongside Share Target | Must be built together per research constraint — sequential build would leave iOS users broken during Phase 4 |
| 2026-02-23 | 4-phase structure at standard depth | 20 requirements in 4 natural delivery boundaries (pipeline → engine → UI → PWA); each phase is independently verifiable |
| 2026-02-23 | pdf-extract not default-enabled in scaffold | getrandom 0.3.x requires Cargo wasm_js feature (not rustflag); spike (Plan 02) validates PDF WASM before enabling |
| 2026-02-23 | Node.js 22.22.0 via nvm for development | Vite 7 requires Node 20.19+; dev machine had 20.16; used nvm to switch to 22.22.0 |
| 2026-02-23 | Placeholder components inline in App.tsx | Plan 04 swaps them for real component files — routing structure remains unchanged |
| 2026-02-23 | BrowserRouter over HashRouter | Clean URL paths required for future PWA manifest and service worker path handling |
| 2026-02-23 | Phase 1 store shape — no Phase 2 fields yet | wordList/documentTitle/isWorkerReady only; Phase 2 adds currentWordIndex, wpm, isPlaying |
| 2026-02-23 | pdf-extract chosen for PDF WASM (spike confirmed) | Compiled cleanly with lopdf wasm_js feature; 1018 KB bundle under 2 MB target; pdfium-render fallback not needed |
| 2026-02-23 | wasm-opt needs --enable-nontrapping-float-to-int for pdf-extract | pdf-extract uses i32.trunc_sat_f64_s instructions; added flag to Cargo.toml [package.metadata.wasm-pack.profile.release] |
| 2026-02-23 | ParseMessageType as const object (not enum) | TypeScript 5.9 erasableSyntaxOnly forbids runtime enum emit; const object with type alias provides identical ergonomics |
| 2026-02-23 | Paste text as collapsible details/summary | Secondary import path not prominent per CONTEXT.md user decision; friction-heavy on mobile so not the hero action |
| 2026-02-23 | Start Reading button above preview text in TextPreview | User decision from CONTEXT.md — CTA prominent before user must scroll past content |
| 2026-02-23 | cancelRef boolean for cancel signal | documentService Worker has no abort mechanism; boolean ref is the minimal cancel pattern |
| 2026-02-24 | ORP formula: max(0, ceil(n*0.3)-1) confirmed correct; Intl.Segmenter singleton at module level | Formula tested against all word lengths 1-11+; plan behavior examples had minor inconsistencies for 3-char and 9-char words but formula is canonical |
| 2026-02-24 | computeWordDelay: /\W/g strip for letter count, sentence regex on raw word | Length multiplier based on letter count not grapheme count; sentence detection tests the full word string |
| 2026-02-23 | worker.format = 'es' required in vite.config.ts | WASM static imports cause top-level await; iife worker format rejects this — must use 'es' |
| 2026-02-23 | vite-plugin-top-level-await removed | Incompatible with Vite 7 worker bundling (path.join crash); not needed since bundler-target WASM has no init() export |
| 2026-02-23 | Bundler-target WASM pkg has no init() | wasm-pack --target bundler loads WASM via static import handled by vite-plugin-wasm — no async init call needed |
| 2026-02-23 | Phase 1 approved by human — all four success criteria verified | Paste text flow, text-layer PDF, scanned-PDF error, WASM non-blocking all confirmed in production build at localhost:4173 |
| 2026-02-24 | wpm partialize-only pattern in Zustand persist middleware | persist middleware wraps full store, partialize returns only { wpm: state.wpm } — transient state (isPlaying, currentWordIndex, jumpSize) intentionally excluded |
| 2026-02-24 | reset() does NOT reset wpm — wpm survives via persist middleware | reset covers ephemeral document + playback state only; wpm persisted separately in localStorage |
| 2026-02-24 | Scheduler useEffect deps=[isPlaying] only — wpm/wordList read from refs | Prevents stale closure without inflating deps array; WPM changes take effect on next word automatically |
| 2026-02-24 | scheduleNext defined inside useEffect (not useCallback) | Only called from within the scheduling effect, never passed as prop; useCallback overhead not justified |

---

## Todos (carry forward)

- [x] Verify current versions of `vite-plugin-pwa`, `vite-plugin-wasm`, `wasm-pack` before Phase 1 starts
- [ ] Run PDF crate spike (`pdf-extract` vs `pdfium-render` vs PDF.js) — Plan 02
- [ ] Document PDF crate decision with rationale once spike is complete
- [ ] Verify iOS Share Target status against current iOS release notes before Phase 4 planning

---

## Blockers

None at this time.

---

## Session Continuity

**To resume work:** Phase 2 Plan 05 complete. RSVPReader assembled with scheduler, keyboard, and visibility hooks. /read route wired to RSVPReader. All 8 Phase 2 requirements complete (RSVP-01 through RSVP-04, CTRL-01 through CTRL-04). Continue with Phase 2 Plan 06 — human verification checkpoint.

**Next action:** Execute 02-06-PLAN.md — human checkpoint to verify the RSVP engine end-to-end at localhost.

---

*State initialized: 2026-02-23 by roadmapper*
*Updated: 2026-02-23 by execute-plan (01-01)*
*Updated: 2026-02-23 by execute-plan (01-03)*
*Updated: 2026-02-23 by execute-plan (01-04)*
*Updated: 2026-02-23 by execute-plan (01-05)*
*Updated: 2026-02-23 by execute-plan (01-06) — Phase 1 complete*
*Updated: 2026-02-24 by execute-plan (02-02) — Phase 2 Plan 02 complete*
*Updated: 2026-02-24 by execute-plan (02-03) — Phase 2 Plan 03 complete (ORPDisplay + ProgressBar)*
*Updated: 2026-02-24 by execute-plan (02-04) — Phase 2 Plan 04 complete*
*Updated: 2026-02-24 by execute-plan (02-05) — Phase 2 Plan 05 complete (RSVPReader assembled, /read route wired)*
