import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

// Activate immediately on install so offline works after the first visit without
// requiring the user to close and reopen all tabs. Without this, the SW enters
// "waiting" state on first install and the app shell is never served from cache
// until the user manually closes every tab.
// @ts-expect-error — TypeScript's narrowed 'self' alias doesn't expose the full
// ServiceWorkerGlobalScope interface in this compilation unit; both methods exist at runtime.
self.addEventListener('install', () => void self.skipWaiting())

// Remove caches from outdated versions
cleanupOutdatedCaches()

// Precache all app assets injected by vite-plugin-pwa at build time.
// Includes JS chunks, CSS, HTML, SVGs, and WASM files (configured in vite.config.ts).
// No skipWaiting() — per project decision, new SW waits until all tabs close before activating.
precacheAndRoute(self.__WB_MANIFEST)
