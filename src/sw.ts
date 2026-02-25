import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

// Remove caches from outdated versions
cleanupOutdatedCaches()

// Precache all app assets injected by vite-plugin-pwa at build time.
// Includes JS chunks, CSS, HTML, SVGs, and WASM files (configured in vite.config.ts).
// No skipWaiting() — per project decision, new SW waits until all tabs close before activating.
precacheAndRoute(self.__WB_MANIFEST)
