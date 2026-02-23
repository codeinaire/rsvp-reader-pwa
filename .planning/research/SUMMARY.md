# Project Research Summary

**Project:** RSVP Speed Reading PWA
**Domain:** Client-side Progressive Web App — Rust WASM document parsing + React UI
**Researched:** 2026-02-23
**Confidence:** MEDIUM (WebSearch/WebFetch unavailable; Rust WASM pattern grounded in workspace reference implementation; all other findings from training data through August 2025)

---

## Executive Summary

This is a client-side-only Progressive Web App for RSVP (Rapid Serial Visual Presentation) speed reading. Users load documents — via file drop, paste, or the OS share sheet — and the app displays words one at a time at a configurable WPM rate, with the focal character (ORP, ~30% from the word's start) pinned to a fixed screen position. The defining technical characteristic is Rust compiled to WASM handling all document parsing (PDF, EPUB, DOCX) off the main thread inside a Web Worker, with React managing UI state via Zustand. There is no backend: this is a pure browser app.

The recommended approach builds in strict dependency order — WASM parsing pipeline first, then tokenization/ORP logic, then the RSVP playback engine, then the import UI, then PWA/Share Target — because every layer depends on the layer below it. Cutting corners on the foundational WASM integration will require an expensive rewrite later. The architecture research has a concrete reference implementation in the same workspace (`rust-image-tools`), giving the WASM Worker pattern HIGH confidence. The remaining MEDIUM-confidence areas (Rust PDF crate WASM compatibility, iOS Share Target support) have documented fallback strategies that should be planned from the start, not bolted on.

The two risks worth calling out as project-level concerns: (1) PDF text extraction quality is fundamentally unreliable for scanned, multi-column, or complex layout PDFs — the app must include a preview-before-read step and explicit error messaging, or it will ship a broken-feeling core feature. (2) The RSVP timing engine must be built with `performance.now()`-based scheduling, not a naive `setInterval` counter — the interval approach has compounding drift that is imperceptible in demos but noticeable during real reading sessions. Both of these require the right design from phase 1, not a later polish pass.

---

## Key Findings

### Recommended Stack

The stack is well-defined. Vite 6 + React 19 + TypeScript 5.4 + Zustand 5 + Tailwind 4 for the frontend; wasm-pack + wasm-bindgen for the Rust-to-WASM pipeline; vite-plugin-pwa (Workbox) for the PWA layer. The Rust crate strategy is: `epub` crate (MEDIUM confidence WASM compat), `pdf-extract` as first attempt for PDFs (LOW confidence, may need to fall back to `pdfium-render` or PDF.js), `docx-rs` (LOW confidence). The `--target web` flag on `wasm-pack build` (not `--target bundler`) is required for correct Vite compatibility.

The highest-risk stack decision is PDF parsing. No single dominant Rust crate cleanly compiles to WASM with reliable text extraction. The recommended approach is: attempt `pdf-extract`, verify WASM compilation, test extraction quality on a corpus of real PDFs, and fall back to `pdfium-render` (~40MB WASM) or PDF.js (JS, breaks the Rust architecture but solves the problem) if extraction quality or compilation fails. Plan for this uncertainty in the timeline.

**Core technologies:**
- Vite 6: build tool + dev server — fastest WASM and PWA ecosystem support
- React 19: UI framework — concurrent features handle the high-frequency RSVP render loop
- TypeScript 5.4: type safety — wasm-bindgen generates TS types natively
- wasm-pack 0.13 + wasm-bindgen 0.2.92: Rust-to-WASM toolchain — generates ES module + TS types
- vite-plugin-wasm + vite-plugin-top-level-await: WASM loading in Vite without manual fetch/instantiate
- Zustand 5: RSVP state machine (idle/loading/playing/paused/done) — minimal boilerplate, React 19 compatible
- vite-plugin-pwa (Workbox): service worker generation and manifest injection
- Radix UI (slider, progress): accessible headless components for WPM control and reading progress

### Expected Features

The feature research is well-grounded in established RSVP apps (Spritz, Spreeder, Reedy, ReadMe!). The ORP positioning formula (table in FEATURES.md) and the dual-view pattern (RSVP display + scrollable full text with current word highlighted) are the two most important design decisions to get right from day one — both affect the core data model (word array with per-word position tracking) and cannot be easily retrofitted.

**Must have (table stakes):**
- ORP focal word display (three-span layout with red focal char at fixed screen X position)
- Play/pause and 5-word rewind
- WPM slider (100–800 range, live adjustment without stopping)
- Text paste import — lowest-friction path for validating the reading experience
- PDF import via Rust WASM — core value proposition per project constraints
- Dual-view: RSVP display above + scrollable full text below, current word highlighted, dimmed during play
- Progress indicator (word N of M, estimated time remaining)
- PWA manifest + service worker (installable, offline app shell)
- Web Share Target (Android/desktop Chrome; iOS fallback via file picker required)
- Responsive layout (desktop + mobile)

**Should have (competitive, v1.x after core is validated):**
- EPUB import (semantic format, cleaner extraction than PDF)
- DOCX import
- Sentence-level pause multiplier (comprehension aid — pause 2–3x at `.!?`)
- Word-length duration normalization (long words get more display time)
- Keyboard shortcuts (Space, arrows, +/-)
- Font size control for RSVP display

**Defer (v2+):**
- Chunk mode (2–3 words at once) — different paradigm, defer until 1-word mode is excellent
- Reading session history — only valuable once users return repeatedly
- Custom color themes
- Browser extension — separate codebase, separate release process

**Anti-features to reject explicitly:**
- User accounts / cloud sync (no backend, explicit out of scope)
- AI summarization (different product, expensive API)
- Annotation/highlighting (defeats the speed-reading framing)

### Architecture Approach

The architecture is layered: React UI layer subscribes to a Zustand store; the store is driven by a `useRSVPPlayback` hook managing a `setInterval`/`performance.now()` tick loop via `useRef`; document parsing runs in a dedicated Web Worker that loads the Rust WASM module once and accepts typed messages; a `DocumentService` singleton facades the Worker with a Promise-based API; the PWA service worker handles the Share Target POST and relays shared files/URLs to the app via Cache API. The tokenizer and ORP calculator run in JS on the main thread (fast enough, simpler than adding more WASM surface). The architecture research is grounded in the workspace's `rust-image-tools` reference implementation, giving the Worker/WASM pattern HIGH confidence.

**Major components:**
1. `Rust WASM module (rsvp-parser)` — parse_pdf / parse_epub / parse_docx, returns ParseResult {words, title}
2. `parser-worker.ts` — Web Worker, loads WASM once, dispatches parse messages, never runs on main thread
3. `DocumentService` — main-thread singleton, wraps Worker with Promise API (request IDs, transfer ArrayBuffers)
4. `RSVPController / rsvp-store.ts` — Zustand store: wordList, currentIndex, wpm, isPlaying + play/pause/seek actions
5. `useRSVPPlayback` — React hook managing the timing loop (setInterval keyed by performance.now(), visibilitychange handling)
6. `RSVPDisplay` — renders ORP three-span word at fixed focal point (CSS alignment critical)
7. `TextScroller` — full document text, scrolls current word into view, dimmed overlay during play
8. `ImportScreen` — file drop/picker + share target consumer (reads ?shared= URL param, retrieves from Cache API)
9. `service-worker.ts` — intercepts POST /share, caches file/URL, redirects to main app

**Key patterns to follow:**
- WASM always in a Web Worker — never on the main thread
- Transfer (not copy) Uint8Array to Worker via `transfer: [bytes.buffer]`
- Zustand selectors per component — subscribe to one word at a time, not the full wordList
- `performance.now()` for timing, not interval counting
- Lazy-load WASM modules — only initialize when first file import is triggered

### Critical Pitfalls

1. **WASM bundle size bloat** — Set `opt-level = "z"`, `lto = true`, `panic = "abort"` in Cargo.toml from the start; run `wasm-opt -Oz` in the build pipeline; split parsers into separate lazy-loaded WASM modules. Target <2 MB per module. Do this in Phase 1 before adding parser crates, not after.

2. **setInterval timing drift destroys WPM accuracy** — Use `performance.now()` to compute which word should be displaying (deadline-based scheduler), not a counter that increments by 1 per tick. Pause stores `elapsedAtPause`; resume sets `startTime = performance.now() - elapsedAtPause`. The setInterval approach is acceptable only for a throwaway proof-of-concept.

3. **PDF text extraction quality is unreliable** — PDFs from scanners (no text layer), multi-column layouts, and design tools will produce garbled or empty text. Always show a text preview before starting RSVP. Detect empty/very-short extraction and show a clear error. Test against at least 5 PDF types: simple ebook, academic paper, scanned document, LaTeX paper, design PDF.

4. **Web Share Target is unsupported on iOS** — This is a permanent limitation of Safari/WebKit. Design the import flow with iOS as a first-class path: paste input, "Open URL" entry, and `<input type="file">` must all work without Share Target. Share Target is a progressive enhancement on Android/desktop, not a requirement.

5. **ORP computed on raw character index** — Use `Intl.Segmenter` for grapheme clusters (handles Unicode, accented chars, ligatures). ORP index = `Math.max(0, Math.ceil(graphemes.length * 0.3) - 1)`. CSS alignment for the three-span display must pin the focal character to a fixed viewport X — test across words of lengths 1, 2, 3, 10, 20+ characters.

6. **WASM init blocking first paint** — Never `await init()` before `ReactDOM.render`. Initialize parser WASM lazily on first file import. Show a loading indicator inline in the import flow.

7. **Background tab throttling breaks RSVP** — Listen to `visibilitychange`; auto-pause on hide, show "Paused" state on return. Without this, `setInterval` clamps to 1s minimum in background tabs and the reading position drifts.

---

## Implications for Roadmap

Based on the dependency graph across all four research files, the build order is forced by hard dependencies. WASM must exist before parsing can be tested; parsing must work before the import UI can be validated; the RSVP engine must be stable before the full reading experience can be evaluated; PWA/Share Target comes last because it wraps the complete pipeline.

### Phase 1: WASM Build Infrastructure + Core Parser

**Rationale:** Everything else depends on Rust-to-WASM compilation working. PDF crate WASM compatibility is the highest-risk unknown in the project — it must be validated before any UI work begins. Establishing correct Cargo.toml profiles (size optimization, wasm-opt) here is cheap; retrofitting later is expensive.

**Delivers:** Verified Rust WASM module that parses at least one document format (start with EPUB — cleanest path) and returns a word array; documented fallback decision for PDF (pdf-extract vs. pdfium-render vs. PDF.js); WASM bundle size within target.

**Addresses:** Text paste, PDF import (validates pipeline)

**Avoids:** WASM bundle size bloat (Pitfall 1), WASM init blocking first paint (Pitfall 6), main thread blocking during parse (Anti-Pattern 1)

**Research flag:** NEEDS research-phase — PDF crate WASM compatibility is unverified; this is the most uncertain area in the entire project.

### Phase 2: Document Service + Parser Worker Integration

**Rationale:** Bridges the Rust WASM module to the React app. This layer must be correct before UI development begins — the Worker message protocol and DocumentService API define the contract that all import flows depend on.

**Delivers:** `parser-worker.ts` + `DocumentService` singleton; `tokenize.ts` + `format-detect.ts` pure utilities; end-to-end test confirming "drop file → words array" pipeline.

**Addresses:** PDF import, EPUB import, DOCX import, text paste (fallback in DocumentService)

**Avoids:** JSON serialization for WASM data exchange (Anti-Pattern 3), creating new WASM instance per parse (performance trap), `FileReader.readAsText()` for binary files (integration gotcha)

**Research flag:** Standard patterns — Worker/WASM pattern is well-documented and verified against workspace reference.

### Phase 3: RSVP Playback Engine

**Rationale:** The core product mechanic. Must be built after the word array pipeline is working (Phase 2 output) but before the import UI (needs something to read). The timing scheduler and ORP logic are architectural — they must be correct from the start.

**Delivers:** Zustand store (`rsvp-store.ts`); `useRSVPPlayback` hook with `performance.now()`-based scheduler and `visibilitychange` handling; `orp.ts` with Intl.Segmenter-based computation; `RSVPDisplay` component with three-span CSS alignment; `RSVPControls` (play/pause, WPM slider, jump backward); verified timing accuracy test (100 words at 300 WPM ≈ 20s ± 1s).

**Addresses:** ORP word display, play/pause, WPM control, jump backward, progress indicator

**Avoids:** setInterval drift (Pitfall 4), ORP on raw char index (Pitfall 5), background tab throttling (Pitfall 7), interval ID in Zustand (Anti-Pattern 2), word array in React state (Anti-Pattern 4)

**Research flag:** Standard patterns — timing and ORP are well-documented; confidence is MEDIUM on ORP formula (Spritz research, widely cited).

### Phase 4: Import UI + Dual-View Reading Experience

**Rationale:** With the playback engine working on hardcoded word lists, this phase wires real document import to the reader and adds the TextScroller dual-view component. The text preview step (before RSVP starts) must be included here — adding it after is a UX flow refactor.

**Delivers:** `ImportScreen` (file drop, file picker, text paste, share target consumer); `TextScroller` with current word highlight and play-dimming overlay; text preview before RSVP starts with error detection for empty/garbled extractions; "Loaded N words — ~X min at Y WPM" feedback after import.

**Addresses:** Dual-view (RSVP + full text), text paste import, file drag-and-drop, PDF/EPUB/DOCX import UX, progress indicator

**Avoids:** RSVP starting immediately without text preview (UX pitfall), no error handling for scanned PDFs (Pitfall 3), rendering full word array in DOM without virtualization (performance trap — use react-virtual or windowing for the TextScroller)

**Research flag:** Standard patterns — file import and drag-and-drop are well-documented browser APIs.

### Phase 5: PWA + Web Share Target

**Rationale:** Last because it wraps the complete import pipeline. Share Target handler in the service worker redirects to the ImportScreen, which must already be working correctly. PWA manifest and service worker caching also lock in the offline capability and installability.

**Delivers:** `vite-plugin-pwa` configuration with Workbox caching; `manifest.webmanifest` with `share_target` declaration; `service-worker.ts` Share Target handler (POST /share intercept, Cache API storage, redirect); `useShareTarget` hook for app startup consumption; iOS fallback validation (file picker + paste confirmed working without Share Target); PWA install verified on Android and iOS.

**Addresses:** Web Share Target, PWA installable, offline app shell, iOS graceful degradation

**Avoids:** Share Target treated as required feature (Pitfall 2), no fallback import UI on iOS (Pitfall 2), skipWaiting + clients.claim race conditions (from STACK.md)

**Research flag:** Standard patterns for Workbox caching; MEDIUM confidence for Share Target manifest field names — verify against current MDN before implementation.

### Phase 6: Polish, EPUB/DOCX, and v1.x Features

**Rationale:** After core PDF + text paste reading experience is validated with real users, add the remaining document types and quality-of-life features.

**Delivers:** EPUB import (highest quality extraction — add first); DOCX import; sentence-level pause multiplier; word-length duration normalization; keyboard shortcuts (Space, arrows, +/-); font size control; WPM persisted in localStorage; jump forward; Lighthouse TTI target <3s on mobile.

**Addresses:** EPUB import, DOCX import, reading quality improvements, power user features

**Avoids:** WASM lazy loading not implemented (Pitfall 6 — verify unused parsers not loaded in Phase 6)

**Research flag:** Standard patterns — these are additive features on top of a working pipeline.

### Phase Ordering Rationale

- WASM first because PDF crate compatibility is the highest-risk unknown; discovering it fails early avoids blocking all import UI work.
- Parser Worker before UI because it defines the API contract; UI work should not start on a moving interface.
- RSVP engine before import UI because the engine can be developed and tested against hardcoded word lists, and its correctness is foundational.
- Import UI before PWA because Share Target requires the full import pipeline to be working.
- PWA last because it is additive infrastructure — the app functions without it, and the service worker complexity should not be debugged simultaneously with document parsing.

### Research Flags

Needs research-phase during planning:
- **Phase 1 (WASM Build + PDF):** PDF crate WASM compilation is unverified — `pdf-extract` and `docx-rs` both rated LOW confidence. Validate crate selection before committing to implementation. Consider a time-boxed spike (1–2 days) as the first task in this phase.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Document Service):** Worker/WASM pattern is directly grounded in workspace reference implementation (`rust-image-tools`). HIGH confidence.
- **Phase 3 (RSVP Engine):** Timing and ORP are well-documented; Zustand state management is standard.
- **Phase 4 (Import UI):** File import APIs are well-documented browser standards.
- **Phase 5 (PWA):** vite-plugin-pwa is mature; Workbox strategies are well-documented. Verify manifest field names against current MDN.
- **Phase 6 (Polish):** Additive features on proven pipeline.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core frontend (Vite, React, Zustand, Tailwind, Radix) is HIGH — stable, widely documented. Rust crates (pdf-extract, docx-rs) are LOW — WASM compilation feasibility unverified. |
| Features | MEDIUM | ORP formula, competitor feature sets, and RSVP UX patterns are from training data. Well-documented domain. Verify competitor features against current app store listings. |
| Architecture | HIGH | WASM Worker pattern is verified against workspace rust-image-tools implementation. RSVP state machine and Web Share Target patterns are MEDIUM (training data, spec-aligned). |
| Pitfalls | HIGH | Timer drift, WASM bundle size, iOS Share Target non-support, PDF extraction limitations are all well-established, documented behaviors. Not speculative. |

**Overall confidence:** MEDIUM-HIGH. The architecture and pitfalls are solid. The main uncertainty is Rust crate WASM compatibility for PDF and DOCX parsing — this must be validated as the first engineering task.

### Gaps to Address

- **PDF crate WASM compatibility:** `pdf-extract` WASM compilation needs a verified spike before Phase 1 can commit to an implementation path. If it fails, fallback to `pdfium-render` (acceptable, larger binary) or PDF.js (pragmatic, breaks the Rust architecture). Document the decision and rationale when it's made.

- **iOS Share Target status:** Apple may have changed WebKit's Share Target support since August 2025. Verify against current iOS release notes at implementation time before finalizing Phase 5.

- **DOCX parsing quality:** `docx-rs` is less mature than PDF or EPUB crates. Add to Phase 1 spike scope — verify it compiles to WASM and produces readable text from a sample DOCX. May need to fall back to `mammoth.js` (JS library).

- **TextScroller virtualization threshold:** The pitfalls research flags DOM virtualization as needed for documents >5K words. Decide at Phase 4 planning whether to use `react-virtual` from the start or defer until performance tests confirm it's needed.

- **Version pinning:** All version numbers are from training data (August 2025). Before starting Phase 1, run `npm info [package] version` and `cargo search [crate]` to verify current versions, especially `vite-plugin-pwa` and `vite-plugin-wasm` for Vite 6 compatibility.

---

## Sources

### Primary (HIGH confidence)
- `rust-image-tools` (this workspace) — WASM Worker pattern, wasm-bindgen setup, serde-wasm-bindgen usage, ArrayBuffer transfer
- W3C Web Share Target specification — manifest `share_target` structure (spec is stable)
- MDN Page Visibility API — visibilitychange for background tab detection
- MDN performance.now() — high-resolution timer for scheduler
- PDF Specification (ISO 32000) — PDF coordinate-based text model; extraction order limitation

### Secondary (MEDIUM confidence)
- Training data on Vite 6, React 19, Zustand 5, Tailwind 4, Radix UI — stable ecosystems, well-documented
- Training data on Spritz ORP research — 30% position claim, ORP lookup table
- Training data on Spreeder, Reedy, ReadMe! feature sets — competitor analysis, may not reflect current state
- wasm-pack, wasm-bindgen docs (training data, August 2025) — patterns are stable
- vite-plugin-pwa docs (training data) — verify against current docs before implementation
- MDN Web Share Target (training data) — iOS non-support documented; verify against current iOS release notes

### Tertiary (LOW confidence)
- `pdf-extract` crate WASM compatibility — unverified; needs a build spike
- `docx-rs` crate WASM compatibility — unverified; needs a build spike
- Competitor feature currency — Spreeder and Reedy update frequently; verify against current app store listings

---

*Research completed: 2026-02-23*
*Ready for roadmap: yes*
