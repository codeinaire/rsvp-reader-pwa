# Project State: RSVP Reader

**Last updated:** 2026-02-23
**Updated by:** roadmapper

---

## Project Reference

**Core Value:** One word at a time, eye never moves — read any content faster with zero friction to import.

**Current Focus:** Phase 1 — WASM Pipeline + Document Service

**Key Constraint:** PDF crate WASM compatibility is the highest-risk unknown. Phase 1 must start with a time-boxed spike to validate `pdf-extract` or select a fallback (`pdfium-render`, PDF.js) before committing to implementation.

---

## Current Position

**Phase:** 1 — WASM Pipeline + Document Service
**Plan:** None started
**Status:** Not started

```
Progress: [ ][ ][ ][ ] 0/4 phases complete
          Ph1 Ph2 Ph3 Ph4
```

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| WASM bundle size | < 2 MB per module | Not measured |
| RSVP timing accuracy | 100 words at 300 WPM = 20s ± 1s | Not measured |
| First paint (WASM non-blocking) | No WASM init before ReactDOM.render | Not implemented |
| Lighthouse PWA score | Installable + offline | Not measured |

---

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

---

## Todos (carry forward)

- [ ] Verify current versions of `vite-plugin-pwa`, `vite-plugin-wasm`, `wasm-pack` before Phase 1 starts
- [ ] Run PDF crate spike (`pdf-extract` vs `pdfium-render` vs PDF.js) as first task of Phase 1
- [ ] Document PDF crate decision with rationale once spike is complete
- [ ] Verify iOS Share Target status against current iOS release notes before Phase 4 planning

---

## Blockers

None at this time.

---

## Session Continuity

**To resume work:** Read ROADMAP.md for phase structure and success criteria, then check current phase plans in `.planning/plans/` if they exist.

**Next action:** Run `/gsd:plan-phase 1` to create the execution plan for Phase 1 (WASM Pipeline + Document Service).

---

*State initialized: 2026-02-23 by roadmapper*
