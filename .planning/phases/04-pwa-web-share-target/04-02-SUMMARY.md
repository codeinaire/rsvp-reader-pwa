---
phase: 04-pwa-web-share-target
plan: 02
subsystem: ui
tags: [readability, idb-keyval, indexeddb, cors, article-extraction, pwa, url-import]

# Dependency graph
requires:
  - phase: 03-rsvp-reader-ui
    provides: useRsvpStore with setDocument action and /preview route
  - phase: 04-pwa-web-share-target-plan-01
    provides: PWA foundation with service worker and manifest

provides:
  - Client-side URL article extraction via @mozilla/readability (src/lib/url-extractor.ts)
  - IndexedDB document persistence via idb-keyval (src/lib/document-persistence.ts)
  - UrlLoader screen component showing hostname during fetch and error state with back button

affects:
  - 04-03-pwa-web-share-target (wires UrlLoader route and EntryScreen URL input)

# Tech tracking
tech-stack:
  added:
    - "@mozilla/readability@^0.6.0 — client-side article extraction using Readability algorithm"
    - "idb-keyval@^6.2.2 — minimal IndexedDB key-value wrapper for document persistence"
  patterns:
    - "ExtractResult | ExtractError union return type — caller checks 'type' in result to distinguish success from error"
    - "Silent IndexedDB failure — try/catch around all idb-keyval calls; storage quota / private browsing never crashes app"
    - "Cancellation boolean ref in useEffect — prevents setState after unmount when async fetch resolves late"
    - "DOMParser + Readability in browser — no jsdom; native DOMParser handles HTML; base element set for relative URL resolution"

key-files:
  created:
    - src/lib/url-extractor.ts
    - src/lib/document-persistence.ts
    - src/components/UrlLoader/UrlLoader.tsx
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "DOMParser used in browser — no jsdom dependency needed; Readability operates on native Document"
  - "CORS errors detected by TypeError message substring match (fetch/cors/network) — browsers do not expose CORS details"
  - "idb-keyval over localStorage for word arrays — localStorage 5-10 MB cap exceeded by long PDF word lists"
  - "words.length >= 10 guard in hydrateLastDocument — rejects corrupted or stub entries"
  - "cancelled boolean in UrlLoader useEffect — minimal cancel signal without AbortController complexity"

patterns-established:
  - "url-extractor: fetch -> DOMParser -> Readability -> whitespace tokenize -> length guard"
  - "document-persistence: silent try/catch on all IndexedDB operations"

requirements-completed:
  - IMPT-01
  - PWA-02
  - PWA-03

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 4 Plan 02: URL Extraction Library and UrlLoader Screen Summary

**Client-side URL article extraction via @mozilla/readability with IndexedDB persistence using idb-keyval, and a UrlLoader loading screen showing the hostname while fetching**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T23:13:04Z
- **Completed:** 2026-02-25T23:14:39Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `url-extractor.ts` — fetches a URL, parses article text via Readability, returns typed ExtractResult or ExtractError (cors/parse/empty/network) with actionable error messages
- Created `document-persistence.ts` — persists/hydrates last imported document in IndexedDB via idb-keyval with fully silent failure handling
- Created `UrlLoader.tsx` — transient loading screen that shows the hostname of the URL being fetched, navigates to /preview on success, and shows a back button with error message on failure

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create url-extractor.ts + document-persistence.ts** - `0ef9b81` (feat)
2. **Task 2: Create UrlLoader component with hostname display and error fallback** - `7aa3003` (feat)

## Files Created/Modified

- `src/lib/url-extractor.ts` — extractArticle() function with cors/parse/empty/network error discrimination
- `src/lib/document-persistence.ts` — persistDocument() and hydrateLastDocument() via idb-keyval
- `src/components/UrlLoader/UrlLoader.tsx` — loading screen component with hostname display, bounce indicator, and error state
- `package.json` — added @mozilla/readability and idb-keyval dependencies
- `package-lock.json` — updated lockfile

## Decisions Made

- Used native browser `DOMParser` inside `extractArticle` instead of jsdom — no Node.js environment simulation needed in the browser; Readability works directly with a native Document
- CORS errors detected by checking that the thrown TypeError message contains 'fetch', 'cors', or 'network' — browsers deliberately do not expose CORS reason in JavaScript, so substring matching on the generic TypeError is the only available signal
- `idb-keyval` chosen over localStorage for persisting word arrays because localStorage's 5–10 MB cap is insufficient for long PDF documents
- `cancelled` boolean flag in UrlLoader's useEffect prevents setting error state after component unmounts — minimal pattern without needing AbortController

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both library files and the component compiled cleanly on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/lib/url-extractor.ts`, `src/lib/document-persistence.ts`, and `src/components/UrlLoader/UrlLoader.tsx` are ready to be wired by Plan 03
- Plan 03 will add the `/load-url` route in App.tsx and add a URL input field to EntryScreen
- No blockers

---
*Phase: 04-pwa-web-share-target*
*Completed: 2026-02-25*
