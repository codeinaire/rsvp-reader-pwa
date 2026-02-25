---
phase: 03-import-ui-reading-view
plan: 03
subsystem: ui
tags: [react, zustand, tailwind, dom-mutation, scrollIntoView, rsvp]

# Dependency graph
requires:
  - phase: 03-01
    provides: rsvpFontSize/textFontSize in Zustand store with clamped setters

provides:
  - TextPanel.tsx: scrollable word-list panel with DOM-mutation highlight, auto-scroll, opacity dimming
  - FontSizePanel.tsx: +/- font size controls for rsvpFontSize and textFontSize
  - PlaybackControls.tsx: gear icon toggle that shows/hides FontSizePanel as absolute overlay

affects:
  - 03-04  # RSVPReader layout rewrite consumes TextPanel and the updated PlaybackControls

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Callback ref array pattern for large DOM lists (no per-word useRef, mutable array populated on render)
    - Direct DOM mutation for highlight (style property writes bypass React reconciler for O(1) update)
    - Manual scroll detection via boolean ref + setTimeout reset (2s window before auto-scroll resumes)
    - Local state toggle for panel visibility (showFontPanel useState, absolute overlay positioning)

key-files:
  created:
    - src/components/RSVPReader/TextPanel.tsx
    - src/components/RSVPReader/FontSizePanel.tsx
  modified:
    - src/components/RSVPReader/PlaybackControls.tsx

key-decisions:
  - "Direct DOM mutation for word highlight avoids O(n) React re-render at 300+ WPM with 10,000+ word documents"
  - "Callback ref pattern (wordRefs.current[i] = el) preferred over per-word useRef to avoid thousands of hook calls"
  - "scrollIntoView({ block: 'nearest' }) chosen over 'center' to prevent jarring movement when word is already visible"
  - "FontSizePanel positioned absolute bottom-full right-0 so it floats above controls without affecting layout flow"

patterns-established:
  - "DOM mutation pattern: useEffect on index change → remove prev highlight → apply curr highlight → scrollIntoView"
  - "Manual scroll gate: passive scroll listener sets boolean ref, setTimeout resets after 2s inactivity"
  - "Opacity dimming via Tailwind class toggle (not inline style) for CSS hardware-accelerated transition"

requirements-completed: [VIEW-01, VIEW-02, VIEW-04]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 3 Plan 03: TextPanel, FontSizePanel, and PlaybackControls Gear Toggle Summary

**Scrollable word-list TextPanel with DOM-mutation highlight and auto-scroll, FontSizePanel with clamped +/- controls, and PlaybackControls extended with gear icon toggle**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T03:51:26Z
- **Completed:** 2026-02-25T03:53:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- TextPanel renders all words as spans using callback ref pattern, applies word highlight via direct DOM mutation (not React state) for O(1) performance at high WPM
- Auto-scroll via `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` with 2s manual scroll override timer
- Opacity dimming via Tailwind class toggle (opacity-50/opacity-100) driven by isPlaying — CSS hardware-accelerated
- FontSizePanel provides +/- controls for rsvpFontSize (8px steps, 48-120px clamped) and textFontSize (4px steps, 12-32px clamped)
- PlaybackControls extended with gear icon button (local showFontPanel state) that toggles FontSizePanel as an absolute overlay above the controls bar

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TextPanel.tsx** - `eac6c5f` (feat)
2. **Task 2: Create FontSizePanel and extend PlaybackControls** - `f3f1bac` (feat)

## Files Created/Modified
- `src/components/RSVPReader/TextPanel.tsx` - Scrollable full-text panel with callback ref array, DOM-mutation highlight, auto-scroll, and opacity dimming
- `src/components/RSVPReader/FontSizePanel.tsx` - Font size +/- controls for RSVP word display and full text panel
- `src/components/RSVPReader/PlaybackControls.tsx` - Extended with useState import, FontSizePanel import, showFontPanel toggle state, and gear icon SVG button

## Decisions Made
- Direct DOM mutation for word highlight — avoids O(n) React re-render at 300+ WPM on documents with 10,000+ words
- Callback ref pattern (`wordRefs.current[i] = el`) — populates single mutable array on render, avoids thousands of individual useRef objects
- `scrollIntoView({ block: 'nearest' })` — only scrolls if the target word would go off-screen, prevents jarring continuous centering
- FontSizePanel positioned `absolute bottom-full right-0 mb-2 z-20` — floats above controls without affecting layout flow

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npm test` script does not exist in package.json — used `npx vitest run` directly. All 24 existing tests (scheduler.test.ts and orp.test.ts) passed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TextPanel, FontSizePanel, and updated PlaybackControls are ready for assembly in 03-04 dual-view layout rewrite
- All three components are store-connected and independently testable
- No blockers

---
*Phase: 03-import-ui-reading-view*
*Completed: 2026-02-25*

## Self-Check: PASSED

- FOUND: src/components/RSVPReader/TextPanel.tsx
- FOUND: src/components/RSVPReader/FontSizePanel.tsx
- FOUND: src/components/RSVPReader/PlaybackControls.tsx
- FOUND: .planning/phases/03-import-ui-reading-view/03-03-SUMMARY.md
- FOUND: commit eac6c5f (Task 1)
- FOUND: commit f3f1bac (Task 2)
