# ROADMAP: RSVP Reader

**Project:** RSVP Speed Reading PWA
**Core Value:** One word at a time, eye never moves — read any content faster with zero friction to import.
**Created:** 2026-02-23
**Depth:** Standard

---

## Phases

- [x] **Phase 1: WASM Pipeline + Document Service** - Prove Rust-to-WASM compilation works, validate PDF crate selection, establish the parsing infrastructure that all import flows depend on
- [ ] **Phase 2: RSVP Playback Engine** - Build the core reading mechanic: ORP display, timing scheduler, playback controls, and progress tracking
- [ ] **Phase 3: Import UI + Reading View** - Wire real document import to the reader and deliver the complete dual-view reading experience
- [ ] **Phase 4: PWA + Web Share Target** - Make the app installable, offline-capable, and reachable via the OS share sheet with iOS fallback

---

## Phase Details

### Phase 1: WASM Pipeline + Document Service

**Goal:** The Rust-to-WASM compilation pipeline is proven, PDF crate selection is locked, and text can travel from a raw file (or pasted string) through the parser Worker to a word array on the main thread.

**Depends on:** Nothing (first phase)

**Requirements:** DOCF-01, IMPT-04

**Success Criteria** (what must be TRUE):
1. User can paste raw text into the app and the text appears tokenized and ready to read (word count visible) without any file upload
2. User can load a text-layer PDF and the app extracts readable plain text — the extracted words array is logged or shown in a dev preview
3. A scanned or image-only PDF triggers a visible, user-facing error message explaining why it cannot be read
4. The compiled WASM bundle is under 2 MB and does not block the initial page render (parser initializes lazily)

**Plans:** 6/6 plans complete

Plans:
- [x] 01-01-PLAN.md — Project scaffold: Vite 7 + React + TypeScript app with WASM plugins and Rust workspace
- [x] 01-02-PLAN.md — PDF crate spike: attempt wasm-pack build, measure bundle, document crate decision (has checkpoint)
- [x] 01-03-PLAN.md — Zustand store + React Router routing shell (parallel with spike)
- [x] 01-04-PLAN.md — WASM Worker pipeline: worker-types, parser-worker, DocumentService, tokenize, format-detect
- [x] 01-05-PLAN.md — UI screens: EntryScreen, TextPreview, RSVPPlaceholder + wire App.tsx
- [x] 01-06-PLAN.md — Phase 1 human verification against all four success criteria (has checkpoint)

---

### Phase 2: RSVP Playback Engine

**Goal:** Users can read content word-by-word at their chosen speed with the ORP focal character pinned to a fixed screen position, accurate timing that does not drift, and full playback control.

**Depends on:** Phase 1

**Requirements:** RSVP-01, RSVP-02, RSVP-03, RSVP-04, CTRL-01, CTRL-02, CTRL-03, CTRL-04

**Success Criteria** (what must be TRUE):
1. Each word is displayed as three spans (left fragment / red focal character / right fragment) and the red character stays at the same fixed horizontal screen position for every word, including single-character words and 20+ character words
2. The WPM slider adjusts reading speed live — changing from 200 WPM to 500 WPM mid-session takes effect on the next word without restarting playback
3. Sentence-ending punctuation (period, question mark, exclamation mark) causes a perceptible pause before the next word; longer words take proportionally more display time than short ones
4. Reading progress is visible during playback (current word index and/or percentage), updating on every word change
5. User can pause, resume, and jump backward or forward using both on-screen controls and keyboard shortcuts (space to pause/resume, arrow keys to jump) — timing remains accurate after each action with no accumulated drift

**Plans:** 5/6 plans executed

Plans:
- [ ] 02-01-PLAN.md — TDD: computeOrp (ORP fragment split) and computeWordDelay (timing + sentence pause + length normalization)
- [ ] 02-02-PLAN.md — Zustand store extension: add wpm (persisted), isPlaying, currentWordIndex, jumpSize
- [ ] 02-03-PLAN.md — ORPDisplay (fixed focal column CSS grid) and ProgressBar (Word X / Y (Z%)) components
- [ ] 02-04-PLAN.md — PlaybackControls component: jump buttons, jump-size stepper, play/pause, WPM slider, presets
- [ ] 02-05-PLAN.md — RSVPReader assembly: scheduler + keyboard shortcuts + visibility auto-pause + App.tsx wiring
- [ ] 02-06-PLAN.md — Phase 2 human verification against all five success criteria (has checkpoint)

---

### Phase 3: Import UI + Reading View

**Goal:** Users can load a PDF by dropping it, picking it from device storage, or sharing it from another app, then confirm what was extracted before reading, and experience the complete dual-view layout with RSVP display above and synchronized scrolling text below.

**Depends on:** Phase 2

**Requirements:** IMPT-02, IMPT-03, VIEW-01, VIEW-02, VIEW-03, VIEW-04

**Success Criteria** (what must be TRUE):
1. After importing a PDF (via file picker or drag-and-drop), the user sees a text preview of the extracted content and a word count before RSVP starts — they can confirm quality or see a clear error if extraction failed
2. During RSVP playback, the current word is highlighted in the full text panel below the RSVP display, and the panel auto-scrolls to keep the current word in view
3. The full text panel is visually dimmed while RSVP is actively playing, making the focal display the clear visual priority, and returns to normal appearance when paused
4. User can adjust font size for both the RSVP word display and the full text panel independently
5. On mobile, the layout is usable: the RSVP display and controls are reachable without horizontal scrolling and the text panel is scrollable

**Plans:** 5 plans

Plans:
- [ ] 03-01-PLAN.md — Zustand store font size extension + TextPreview enhancement (metadata, fade preview, error state)
- [ ] 03-02-PLAN.md — Web Share Target: manifest.json + scoped service worker + App.tsx message listener
- [ ] 03-03-PLAN.md — TextPanel (word highlight, auto-scroll, dimming) + FontSizePanel + PlaybackControls gear icon
- [ ] 03-04-PLAN.md — RSVPReader dual-view layout rewrite + ORPDisplay dynamic font size
- [ ] 03-05-PLAN.md — Phase 3 human verification against all six requirements (has checkpoint)

---

### Phase 4: PWA + Web Share Target

**Goal:** The app is installable to the home screen or desktop, works fully offline after installation, and users on Android and desktop Chrome can share a webpage URL or PDF directly into the app — while iOS users have a fully functional import path without Share Target.

**Depends on:** Phase 3

**Requirements:** IMPT-01, PWA-01, PWA-02, PWA-03

**Success Criteria** (what must be TRUE):
1. On Android Chrome and desktop Chrome, the user can share a webpage URL from another app and it opens in RSVP Reader with the article text extracted and ready to read
2. On any platform, the user can install the app to their home screen or desktop and launch it as a standalone app (no browser chrome)
3. After installation, the app loads and the RSVP reader is fully functional without a network connection (offline app shell)
4. On iOS, where Web Share Target is unavailable, the user can import content using the file picker or paste input — these paths work identically to the Android/desktop experience and are not degraded

**Plans:** TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. WASM Pipeline + Document Service | 6/6 | Complete    | 2026-02-23 |
| 2. RSVP Playback Engine | 5/6 | In Progress|  |
| 3. Import UI + Reading View | 0/5 | Planned | - |
| 4. PWA + Web Share Target | 0/? | Not started | - |

---

## Requirement Coverage

| Requirement | Phase | Description |
|-------------|-------|-------------|
| DOCF-01 | Phase 1 | PDF import (text-layer; unsupported message for scanned PDFs) |
| IMPT-04 | Phase 1 | Paste raw text and begin reading |
| RSVP-01 | Phase 2 | ORP three-span display with fixed focal character position |
| RSVP-02 | Phase 2 | Pause at sentence-ending punctuation |
| RSVP-03 | Phase 2 | Word-length normalization of display duration |
| RSVP-04 | Phase 2 | Reading progress indicator (word X of Y / % complete) |
| CTRL-01 | Phase 2 | WPM slider |
| CTRL-02 | Phase 2 | Pause and resume playback |
| CTRL-03 | Phase 2 | Jump backward/forward (sentence or paragraph) |
| CTRL-04 | Phase 2 | Keyboard shortcuts (space, arrow keys) |
| IMPT-02 | Phase 3 | Share a PDF file via Web Share Target |
| IMPT-03 | Phase 3 | File picker button to open PDF from device storage |
| VIEW-01 | Phase 3 | Dual-view: RSVP display above, scrollable full text below with current word highlighted |
| VIEW-02 | Phase 3 | Full text panel dimmed while RSVP is playing |
| VIEW-03 | Phase 3 | Text preview after import, before RSVP starts |
| VIEW-04 | Phase 3 | Font size control for RSVP display and full text panel |
| IMPT-01 | Phase 4 | Share webpage URL via Web Share Target |
| PWA-01 | Phase 4 | Installable (Web App Manifest, Add to Home Screen) |
| PWA-02 | Phase 4 | Offline-capable (service worker caches app shell) |
| PWA-03 | Phase 4 | iOS fallback: file picker import when Share Target unavailable |

**Coverage: 20/20 v1 requirements mapped.**

---

*Roadmap created: 2026-02-23*
*Last updated: 2026-02-23 — Phase 1 complete: all four success criteria human-verified in production build (6/6 plans done)*
