---
phase: 03-import-ui-reading-view
plan: "04"
subsystem: ui
tags: [react, tailwind, zustand, rsvp, dual-view, dvh, font-size]

# Dependency graph
requires:
  - phase: 03-03
    provides: TextPanel, FontSizePanel, PlaybackControls gear toggle — assembled here
  - phase: 03-01
    provides: rsvpFontSize + textFontSize in Zustand store — consumed by ORPDisplay and TextPanel
provides:
  - Dual-view reading layout (sticky RSVP zone h-[40dvh] + independent TextPanel scroll)
  - ORPDisplay dynamic font size reading from Zustand store (rsvpFontSize)
  - Complete /read screen assembling all Phase 3 sub-components
affects: [phase-04-pwa, reading-experience, layout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "h-dvh on outer container for mobile browser chrome adaptability over h-screen/100vh"
    - "sticky top-0 inside overflow-hidden flex container for zone-level sticky (not window-level fixed)"
    - "flex-shrink-0 on sticky zone to prevent compression below intended height"
    - "Dynamic fontSize as number (px) via React inline style — CSS treats number as px automatically"

key-files:
  created: []
  modified:
    - src/components/RSVPReader/RSVPReader.tsx
    - src/components/RSVPReader/ORPDisplay.tsx

key-decisions:
  - "Removed nested dark panel (bg-gray-900) from ORPDisplay — RSVP zone bg-gray-950 provides background, double-card avoided"
  - "sticky top-0 z-10 on RSVP zone inside overflow-hidden container — scroll context is TextPanel's own overflow-y-auto, not window"
  - "fontSize: rsvpFontSize (number) in inline style — React/CSS treats numeric pixel value correctly without 'px' suffix"

patterns-established:
  - "Dual-view RSVP layout: h-dvh flex-col container, sticky 40dvh zone + flex-1 scrollable text panel"
  - "Store-driven font sizing: numeric px value from Zustand, applied as inline style number"

requirements-completed: [VIEW-01, VIEW-02, VIEW-04]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 3 Plan 04: Dual-View RSVPReader Layout Summary

**Dual-view reading layout assembled: sticky RSVP zone (h-[40dvh]) with dynamic font size ORPDisplay above an independently scrollable TextPanel, wired into the /read route**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-25T03:55:43Z
- **Completed:** 2026-02-25T03:56:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- ORPDisplay.tsx updated to read `rsvpFontSize` from Zustand store — replaces hardcoded `'4.5rem'` with dynamic number value (default 72px)
- Removed redundant nested dark panel from ORPDisplay — RSVP zone container in RSVPReader provides the background
- RSVPReader.tsx rewritten with dual-view layout: sticky RSVP zone (`h-[40dvh]`) containing ProgressBar + ORPDisplay + PlaybackControls above a border divider and TextPanel that fills remaining viewport height with independent scroll
- Used `h-dvh` on outer container for correct mobile browser chrome handling
- All existing side effects preserved: scheduler, keyboard shortcuts, visibilitychange, guard redirect

## Task Commits

1. **Task 1: Update ORPDisplay to use rsvpFontSize from Zustand store** - `aa4ed5b` (feat)
2. **Task 2: Rewrite RSVPReader with dual-view layout** - `e4bb00c` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/components/RSVPReader/ORPDisplay.tsx` - Added `useRsvpStore` import, replaced hardcoded `'4.5rem'` with `rsvpFontSize` from store, removed nested bg-gray-900 panel
- `src/components/RSVPReader/RSVPReader.tsx` - Added `TextPanel` import, replaced single-column centered layout with `h-dvh flex-col` dual-view: sticky RSVP zone + divider + TextPanel

## Decisions Made

- **Removed nested dark panel from ORPDisplay:** The outer `bg-gray-900 rounded-2xl py-10 px-12` wrapper in ORPDisplay created a double-card visual against the RSVP zone's `bg-gray-950`. Removed — RSVP zone provides the background context.
- **`sticky top-0` inside `overflow-hidden` container:** The outer `flex flex-col h-dvh overflow-hidden` container is the scroll context. `sticky` on the RSVP zone child correctly pins it within that container. TextPanel's own `overflow-y-auto` handles its independent scroll — this is the correct dual-scroll pattern. Not `position: fixed`.
- **`fontSize: rsvpFontSize` (number):** React inline style accepts a numeric value for pixel lengths; CSS treats it as `72px`. No `'px'` suffix needed.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Build passed cleanly on first attempt for both tasks.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All Phase 3 components are assembled in the /read screen
- The dual-view layout is complete: sticky RSVP zone + scrollable text panel
- Font size controls (RSVP and text) are independently adjustable and persist via localStorage
- Phase 3 Plan 05 (if any) or Phase 4 (PWA) can proceed
- No blockers

---
*Phase: 03-import-ui-reading-view*
*Completed: 2026-02-25*

## Self-Check: PASSED

- FOUND: src/components/RSVPReader/ORPDisplay.tsx
- FOUND: src/components/RSVPReader/RSVPReader.tsx
- FOUND: .planning/phases/03-import-ui-reading-view/03-04-SUMMARY.md
- FOUND: commit aa4ed5b (Task 1)
- FOUND: commit e4bb00c (Task 2)
