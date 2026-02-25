---
phase: 04-pwa-web-share-target
plan: 03
subsystem: ui
tags: [react, react-router, idb-keyval, pwa, web-share-target, url-import, ios-fallback]

# Dependency graph
requires:
  - phase: 04-02
    provides: url-extractor.ts, document-persistence.ts (persistDocument/hydrateLastDocument), UrlLoader.tsx component

provides:
  - /load-url route registered in App.tsx routing tree
  - GET URL share detection (?url=/?text= query params) in ShareTargetHandler
  - DocumentHydrator component restoring last document from IndexedDB on startup
  - isValidHttpUrl helper for URL validation at module scope
  - URL input field (accordion) in EntryScreen for iOS manual URL entry
  - persistDocument called after every successful PDF and paste import

affects: [phase-04-04, any phase touching App.tsx routes or EntryScreen import flows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DocumentHydrator: side-effect-only null-returning component alongside ShareTargetHandler for app startup tasks"
    - "isValidHttpUrl at module scope: pure URL validation helper, not inside component"
    - "Fire-and-forget persistDocument: call without await, user navigation is immediate; background IndexedDB write"
    - "GET share target detection: URLSearchParams on window.location.search in useEffect runs-once"

key-files:
  created: []
  modified:
    - src/App.tsx
    - src/components/EntryScreen/EntryScreen.tsx

key-decisions:
  - "DocumentHydrator guards wordList.length > 0 — does not overwrite a freshly imported doc"
  - "GET share handler calls window.history.replaceState({}, '', '/') after navigation to clean URL bar"
  - "persistDocument is fire-and-forget (not awaited) — user navigation must not wait on IndexedDB write"
  - "URL input placed between PDF picker and paste section — iOS users discover it naturally"
  - "URL accordion uses same details/summary pattern as paste text — consistent secondary-path UX"

patterns-established:
  - "Side-effect-only null components (ShareTargetHandler, DocumentHydrator) registered at BrowserRouter level"
  - "URL validation reused in both App.tsx (isValidHttpUrl) and EntryScreen.handleUrlFetch for defense-in-depth"

requirements-completed: [IMPT-01, PWA-02, PWA-03]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 4 Plan 03: Wire UrlLoader Route, URL Share Detection, IndexedDB Hydration, and EntryScreen URL Input Summary

**All import paths wired end-to-end: /load-url route registered, GET URL share detection in ShareTargetHandler, DocumentHydrator restores last doc on startup, and EntryScreen URL input field enables iOS manual URL entry with persistDocument after every import.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T23:17:12Z
- **Completed:** 2026-02-25T23:19:24Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- App.tsx wired with four routes (/, /preview, /load-url, /read) and two side-effect components (ShareTargetHandler + DocumentHydrator)
- GET URL share target detection handles ?url= and ?text= query params from desktop Chrome and Android URL share intents
- DocumentHydrator on mount restores the last persisted document from IndexedDB for offline reading
- EntryScreen URL accordion input field gives iOS users a manual URL entry path (primary iOS fallback)
- persistDocument called (fire-and-forget) after every successful PDF import and paste import

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend App.tsx — URL share detection, /load-url route, and IndexedDB hydration** - `5d265d7` (feat)
2. **Task 2: Extend EntryScreen with URL input field and call persistDocument after every import** - `ddb537d` (feat)

## Files Created/Modified
- `/workspace/src/App.tsx` - Added UrlLoader import, /load-url route, isValidHttpUrl helper, GET URL share useEffect in ShareTargetHandler, DocumentHydrator component
- `/workspace/src/components/EntryScreen/EntryScreen.tsx` - Added persistDocument import, urlInput/isUrlOpen state, handleUrlFetch function, URL input accordion section, persistDocument calls after setDocument

## Decisions Made
- DocumentHydrator guards `wordList.length > 0` to prevent overwriting a freshly imported doc (e.g., from ShareTargetHandler which fires on the same mount cycle)
- GET share handler calls `window.history.replaceState({}, '', '/')` immediately after navigating to /load-url to clean the URL bar — clean app shell URL after share
- `persistDocument` is not awaited in EntryScreen — user navigates to /preview or /load-url immediately; IndexedDB write happens in background
- URL input accordion uses the same `details`/`summary` pattern as paste text for UI consistency; placed before paste section as it is the more common mobile path

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four routes are wired: /, /preview, /load-url, /read
- Full URL import flow complete: Android share target (POST via SW) + GET URL params + iOS manual entry
- Last document persisted after every import — offline reading enabled
- Phase 4 Plan 04 (human verification) can proceed: all PWA + URL import paths are user-testable

## Self-Check: PASSED

- FOUND: /workspace/src/App.tsx
- FOUND: /workspace/src/components/EntryScreen/EntryScreen.tsx
- FOUND: /workspace/.planning/phases/04-pwa-web-share-target/04-03-SUMMARY.md
- FOUND: commit 5d265d7 (Task 1)
- FOUND: commit ddb537d (Task 2)

---
*Phase: 04-pwa-web-share-target*
*Completed: 2026-02-25*
