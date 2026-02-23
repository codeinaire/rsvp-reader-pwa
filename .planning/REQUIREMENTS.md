# Requirements: RSVP Reader

**Defined:** 2026-02-23
**Core Value:** One word at a time, eye never moves — read any content faster with zero friction to import.

## v1 Requirements

### RSVP Display

- [ ] **RSVP-01**: User sees one word at a time in a 3-span ORP display (left fragment | red focal character | right fragment) with the focal character held at the same fixed screen position for every word
- [ ] **RSVP-02**: Playback pauses briefly at sentence-ending punctuation (periods, question marks, exclamation marks) for natural reading rhythm
- [ ] **RSVP-03**: Words longer than average are displayed proportionally slower than the WPM setting (word-length normalization)
- [ ] **RSVP-04**: User can see reading progress (word X of Y and/or % complete) during RSVP playback

### Controls

- [ ] **CTRL-01**: User can adjust reading speed via a WPM slider
- [ ] **CTRL-02**: User can pause and resume RSVP playback
- [ ] **CTRL-03**: User can jump backward or forward through content (sentence or paragraph level)
- [ ] **CTRL-04**: User can control playback via keyboard shortcuts (space to pause/resume, arrow keys to jump)

### Import

- [ ] **IMPT-01**: User can share a webpage URL from their browser into the app via Web Share Target, and the app extracts readable article text from the URL
- [ ] **IMPT-02**: User can share a PDF file from another app into the RSVP Reader via Web Share Target
- [ ] **IMPT-03**: User can open a file (PDF) directly from device storage using a file picker button within the app
- [ ] **IMPT-04**: User can paste raw text directly into the app and begin reading it immediately via RSVP

### Document Formats

- [ ] **DOCF-01**: User can import and read PDF files (text-layer PDFs; scanned/image PDFs show a clear unsupported message)

### Reading View

- [ ] **VIEW-01**: RSVP word display is shown at the top of the screen; scrollable full document text is shown below with the current word highlighted and auto-scrolled into view
- [ ] **VIEW-02**: The full text area is visually dimmed/darkened while RSVP is actively playing, reducing distraction from the focal display
- [ ] **VIEW-03**: After importing a document, user sees a text preview of the extracted content before starting RSVP, allowing them to confirm extraction quality
- [ ] **VIEW-04**: User can adjust font size for both the RSVP word display and the full text panel

### PWA

- [ ] **PWA-01**: App is installable to the home screen or desktop (Web App Manifest, Add to Home Screen prompt)
- [ ] **PWA-02**: App works fully offline after installation (service worker caches app shell and assets)
- [ ] **PWA-03**: On iOS where Web Share Target is unavailable, user can import files via a native file picker as a fully functional fallback

## v2 Requirements

### Document Formats

- **DOCF-02**: User can import and read EPUB files
- **DOCF-03**: User can import and read DOCX (Word) files
- **DOCF-04**: User can import and read plain text (.txt) files

### Library

- **LIB-01**: App remembers documents and reading progress across sessions
- **LIB-02**: User can view a library of previously imported documents
- **LIB-03**: User can resume reading from where they left off

### Personalization

- **PERS-01**: App remembers user's preferred WPM setting across sessions
- **PERS-02**: User can switch between light and dark themes

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Personal tool, no server-side auth in v1 |
| Cloud sync across devices | Requires backend; defer to post-v1 |
| Native iOS / Android app | PWA first; native only if PWA proves insufficient |
| Scanned PDF / OCR | High complexity; text-layer PDFs cover most cases |
| EPUB / DOCX in v1 | PDF covers primary use case; defer to v2 |
| Reading history persistence | Session-only for v1; validate core experience first |
| Social / sharing reading progress | Out of scope entirely for personal tool |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| RSVP-01 | — | Pending |
| RSVP-02 | — | Pending |
| RSVP-03 | — | Pending |
| RSVP-04 | — | Pending |
| CTRL-01 | — | Pending |
| CTRL-02 | — | Pending |
| CTRL-03 | — | Pending |
| CTRL-04 | — | Pending |
| IMPT-01 | — | Pending |
| IMPT-02 | — | Pending |
| IMPT-03 | — | Pending |
| IMPT-04 | — | Pending |
| DOCF-01 | — | Pending |
| VIEW-01 | — | Pending |
| VIEW-02 | — | Pending |
| VIEW-03 | — | Pending |
| VIEW-04 | — | Pending |
| PWA-01 | — | Pending |
| PWA-02 | — | Pending |
| PWA-03 | — | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 0
- Unmapped: 20 ⚠️ (roadmap not yet created)

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-23 after initial definition*
