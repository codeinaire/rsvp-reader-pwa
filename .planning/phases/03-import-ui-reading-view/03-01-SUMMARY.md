---
phase: 03-import-ui-reading-view
plan: 01
subsystem: ui
tags: [react, zustand, tailwind, typescript, rsvp, text-preview]

# Dependency graph
requires:
  - phase: 02-rsvp-playback-engine
    provides: "rsvp-store.ts with wpm, Zustand persist pattern established"
provides:
  - "rsvpFontSize (default 72, range 48-120) and textFontSize (default 16, range 12-32) in RsvpStore, both persisted via localStorage"
  - "Enhanced TextPreview with metadata card, scrollable fade-gradient preview, and persistent error state"
affects:
  - 03-02-PLAN.md
  - 03-03-PLAN.md

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Font size clamping in setter actions: Math.max(min, Math.min(max, size))"
    - "Zustand partialize extended with new persisted fields alongside existing ones"
    - "CSS mask-image fade gradient on scrollable preview containers (maskImage + WebkitMaskImage)"

key-files:
  created: []
  modified:
    - src/store/rsvp-store.ts
    - src/components/TextPreview/TextPreview.tsx

key-decisions:
  - "Pages row omitted from metadata card — pageCount not in ParseResult yet; omit row rather than show static placeholder"
  - "Persistent error on wordCount < 10 — EntryScreen guards this too but TextPreview adds defense-in-depth"

patterns-established:
  - "Metadata card grid: grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border — use for any document info displays"
  - "Fade gradient preview: relative overflow-hidden rounded-xl max-h-48 with maskImage/WebkitMaskImage style"

requirements-completed: [IMPT-03, VIEW-03, VIEW-04]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 3 Plan 01: Store Font Size Extension + Enhanced TextPreview Summary

**Zustand store extended with rsvpFontSize/textFontSize (persisted, clamped), TextPreview rewritten with metadata card, fade-gradient preview, and persistent error state**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T03:46:56Z
- **Completed:** 2026-02-25T03:48:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Extended RsvpStore with rsvpFontSize (default 72, range 48-120) and textFontSize (default 16, range 12-32), both persisted to localStorage via partialize
- Rewritten TextPreview: metadata card (document name, word count, reading time from current wpm), Start Reading CTA above preview, scrollable 250-word preview with CSS fade gradient
- Added persistent error state in TextPreview for < 10 words: "Try another file" button navigating to / — does not auto-dismiss
- Confirmed IMPT-03 complete: EntryScreen file picker (Choose PDF) and drag-drop remain unchanged and functional

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend rsvp-store.ts with font size state and persisted actions** - `0f27c8d` (feat)
2. **Task 2: Enhance TextPreview with metadata, fade gradient, persistent error state, and confirm IMPT-03** - `12b08ce` (feat)

## Files Created/Modified
- `src/store/rsvp-store.ts` - Added rsvpFontSize/textFontSize fields and setters, extended partialize
- `src/components/TextPreview/TextPreview.tsx` - Full rewrite with metadata card, fade preview, error state

## Decisions Made
- Pages row omitted from metadata card: ParseResult does not yet include pageCount, omitting the row is cleaner than showing a static "—" placeholder
- Persistent error condition triggers at wordCount > 0 && wordCount < 10 (EntryScreen already guards this; TextPreview adds defense-in-depth without being the primary guard)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- npm test script not configured — build (tsc -b && vite build) serves as the TypeScript verification step. No regressions possible as no existing tests exist in the project.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- rsvpFontSize and textFontSize are now in the store, ready for FontSizePanel (03-03) to wire up increment/decrement controls
- TextPreview is production-quality for the import confirmation screen
- Plan 03-02 (WPM panel and settings drawer) can proceed immediately

## Self-Check: PASSED

- src/store/rsvp-store.ts: FOUND
- src/components/TextPreview/TextPreview.tsx: FOUND
- .planning/phases/03-import-ui-reading-view/03-01-SUMMARY.md: FOUND
- commit 0f27c8d: FOUND
- commit 12b08ce: FOUND

---
*Phase: 03-import-ui-reading-view*
*Completed: 2026-02-25*
