# RSVP Reader

## What This Is

A Rapid Serial Visual Presentation (RSVP) Progressive Web App for speed reading. Users share web pages or import document files (PDF, EPUB, DOC, and other formats), and the app presents content word-by-word using a Spritz-style fixed focal point — the middle character of each word is highlighted red and held at a fixed screen position so the eye never moves.

Built with TypeScript + React on the frontend and Rust for document processing. Responsive across desktop and mobile.

## Core Value

One word at a time, eye never moves — read any content faster with zero friction to import.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can share a webpage from their browser into the app and read it via RSVP
- [ ] User can import a document file (PDF, EPUB, DOC) and read it via RSVP
- [ ] RSVP display shows one word at a time with Spritz-style ORP: word split as `left | RED focal char | right`, focal point fixed at same screen position
- [ ] User can control WPM speed, pause/resume, and jump back/forward through content
- [ ] RSVP view shows word display on top, scrollable full text below with current word highlighted
- [ ] Text area is dimmed/darkened while RSVP is actively playing
- [ ] App is installable as a PWA and works on desktop and mobile

### Out of Scope

- User accounts / authentication — personal tool, no server-side auth needed for v1
- Library / reading history — session only for v1, no persistence
- Native mobile app — PWA first, native later if needed
- Sync across devices — out of scope until library exists

## Context

- RSVP reading technique (popularized by Spritz) significantly improves reading speed by eliminating saccades — the eye movements between words. The focal character (ORP — Optimal Recognition Point) is approximately 30% from the start of the word, not literally the middle character index.
- PWA Web Share Target API works well on Android + desktop Chrome/Edge. iOS Safari support is limited but improving.
- Rust is used for document parsing/text extraction (via WebAssembly or a local service) since native Rust parsers for PDF/EPUB/DOCX are mature and performant.
- Personal tool first — no need for multi-user concerns in v1.

## Constraints

- **Tech Stack**: TypeScript + React (frontend), Rust (document processing) — user preference
- **Platform**: PWA first — enables share target, installable, no app store needed
- **Scope**: Session only for v1 — no backend, no auth, no persistence
- **Compatibility**: Must work on both desktop and mobile browsers (responsive layout)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA over native app | Faster to build, share target works, no app store friction | — Pending |
| Spritz-style fixed ORP | Better for reading speed than centered word; eye stays stationary | — Pending |
| Rust for document processing | Mature PDF/EPUB/DOCX parsers, WASM-compilable | — Pending |
| Session-only persistence | Simplifies v1 drastically; validate core reading experience first | — Pending |

---
*Last updated: 2026-02-23 after initialization*
