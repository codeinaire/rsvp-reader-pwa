---
phase: 04-pwa-web-share-target
plan: 01
subsystem: pwa
tags: [vite-plugin-pwa, workbox, service-worker, pwa, icons, manifest, web-share-target]

# Dependency graph
requires:
  - phase: 03-import-ui-reading-view
    provides: completed app shell (React/Vite), manifest.json skeleton with share_target, share-target-sw.js

provides:
  - Workbox app-shell service worker (src/sw.ts -> dist/sw.js) precaching all assets including WASM
  - PNG icons (192x192, 512x512, maskable-512x512) in public/icons/
  - Updated manifest.json with real PNG icon paths and extended share_target (title/text/url/files)
  - vite-plugin-pwa injectManifest configuration wired to src/sw.ts

affects:
  - 04-02 (iOS fallback UI)
  - 04-03 (verification/install prompt)
  - 04-04 (final phase verification)

# Tech tracking
tech-stack:
  added:
    - vite-plugin-pwa 1.2.0 (Vite PWA integration, injectManifest strategy)
    - workbox-build (Workbox precache manifest injection)
    - "@vite-pwa/assets-generator 1.0.2 (SVG-to-PNG icon generation)"
  patterns:
    - injectManifest strategy: src/sw.ts compiled and injected with precache list at build time
    - App-shell service worker separate from share-target-sw.js (different scopes)
    - registerType: 'prompt' — no skipWaiting, new SW waits for tabs to close

key-files:
  created:
    - src/sw.ts
    - public/logo.svg
    - public/icons/pwa-192x192.png
    - public/icons/pwa-512x512.png
    - public/icons/maskable-icon-512x512.png
    - public/icons/pwa-64x64.png
    - public/icons/apple-touch-icon-180x180.png
    - public/favicon.ico
  modified:
    - vite.config.ts
    - public/manifest.json
    - package.json

key-decisions:
  - "injectManifest strategy chosen (not generateSW) to allow custom src/sw.ts with full Workbox API control"
  - "manifest: false in VitePWA config — keep project-managed public/manifest.json, do not auto-generate"
  - "globPatterns includes .wasm to ensure WASM bundle is pre-cached at install time"
  - "Icons moved to public/icons/ subdirectory to match manifest /icons/ src paths"
  - "share_target extended with title/text/url params — single POST action handles both PDF and URL shares"
  - "registerType: prompt means new SW waits (no auto-reload disruption)"

patterns-established:
  - "App-shell SW (src/sw.ts) compiled by vite-plugin-pwa into dist/sw.js with injected precache manifest"
  - "WASM file explicitly included in globPatterns to ensure offline availability"

requirements-completed: [PWA-01, PWA-02]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 4 Plan 01: PWA Foundation Summary

**Workbox app-shell service worker with injectManifest, real PNG icons from SVG logo, and extended share_target for PDF + URL sharing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T23:08:22Z
- **Completed:** 2026-02-25T23:10:34Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Installed vite-plugin-pwa and configured injectManifest strategy pointing to src/sw.ts
- Created Workbox service worker precaching all 9 app assets including the 1042 KB WASM bundle
- Generated real PNG icons (192x192, 512x512, maskable-512x512) from RSVP Reader brand SVG logo
- Updated manifest.json to reference PNG icons (replacing vite.svg placeholder) and extended share_target with title/text/url params for URL-based sharing alongside existing PDF file sharing

## Task Commits

Each task was committed atomically:

1. **Task 1: Install vite-plugin-pwa, create src/sw.ts, update vite.config.ts** - `12b93da` (feat)
2. **Task 2: Create SVG logo, generate PNG icons, update manifest** - `b937ece` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `src/sw.ts` — Workbox app-shell service worker: cleanupOutdatedCaches + precacheAndRoute(self.__WB_MANIFEST)
- `vite.config.ts` — Added VitePWA plugin with injectManifest strategy, srcDir/filename pointing to src/sw.ts, .wasm in globPatterns
- `package.json` — Added vite-plugin-pwa, workbox-build, @vite-pwa/assets-generator to devDependencies
- `public/logo.svg` — RSVP Reader brand SVG: dark (#030712) background, red "R" (Georgia serif, 300px)
- `public/manifest.json` — Updated icons array (PNG paths), extended share_target params
- `public/icons/pwa-192x192.png` — 192x192 PNG for PWA install (any)
- `public/icons/pwa-512x512.png` — 512x512 PNG for PWA install (any)
- `public/icons/maskable-icon-512x512.png` — 512x512 maskable PNG for adaptive icons
- `public/icons/pwa-64x64.png` — 64x64 favicon-size PNG
- `public/favicon.ico` — ICO file generated alongside PNGs

## Decisions Made

- Used `injectManifest` strategy (not `generateSW`) to keep full control of src/sw.ts Workbox API usage
- Set `manifest: false` so VitePWA does not overwrite the project-managed public/manifest.json
- Included `.wasm` in `globPatterns` to ensure WASM bundle is in the precache manifest for offline operation
- Icons generated to public/ root by assets-generator tool, then manually moved to public/icons/ to match manifest src paths
- `registerType: 'prompt'` (no auto-reload) — aligns with project preference to avoid disrupting users mid-session
- Extended share_target with single POST action including title/text/url params alongside files — the service worker distinguishes PDF vs URL shares by checking formData.get('pdf') nullability

## Deviations from Plan

None - plan executed exactly as written. Icons were generated to public/ root (not public/icons/) by the CLI tool, but the plan explicitly anticipated this case ("If the CLI doesn't generate to `public/icons/`, check its output and move files accordingly") so the move was part of the planned execution.

## Issues Encountered

None - both tasks completed successfully on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PWA foundation complete: dist/sw.js with 9 precache entries (including WASM), PNG icons in place, manifest valid
- dist/manifest.json confirms PNG icons (not vite.svg) and extended share_target
- Ready for Phase 4 Plan 02 (iOS fallback UI) and Plan 03 (install prompt / verification)

## Self-Check: PASSED

All files verified present:
- src/sw.ts: FOUND
- vite.config.ts: FOUND
- public/logo.svg: FOUND
- public/manifest.json: FOUND
- public/icons/pwa-192x192.png: FOUND
- public/icons/pwa-512x512.png: FOUND
- public/icons/maskable-icon-512x512.png: FOUND
- dist/sw.js: FOUND
- .planning/phases/04-pwa-web-share-target/04-01-SUMMARY.md: FOUND

All commits verified:
- 12b93da: feat(04-01): install vite-plugin-pwa and create Workbox app-shell SW
- b937ece: feat(04-01): add RSVP Reader SVG logo, PNG icons, update manifest

---
*Phase: 04-pwa-web-share-target*
*Completed: 2026-02-25*
