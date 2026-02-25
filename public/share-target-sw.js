// public/share-target-sw.js
// Scoped service worker for Web Share Target (IMPT-02).
// Handles POST requests to /share-target/ sent by Android Chrome when user
// shares a PDF into RSVP Reader from the system share sheet.
//
// Activation: This SW is registered by App.tsx with scope '/share-target/'.
// It only intercepts fetch events within that scope.
// Full share target functionality requires PWA installation (Phase 4).

const CACHE_NAME = 'share-target-v1'

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only handle POST requests to /share-target/ — let all other requests pass through
  if (event.request.method !== 'POST' || url.pathname !== '/share-target/') {
    return
  }

  event.respondWith(
    (async () => {
      try {
        const formData = await event.request.formData()
        const file = formData.get('pdf')

        if (file && file instanceof File) {
          // Store the shared file in Cache API temporarily
          // The main thread will retrieve it via the SHARED_PDF message
          const cache = await caches.open(CACHE_NAME)
          await cache.put('/shared-pdf', new Response(file, {
            headers: { 'Content-Type': file.type || 'application/pdf' }
          }))

          // Notify all open app windows about the shared file
          const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          for (const client of clients) {
            client.postMessage({
              type: 'SHARED_PDF',
              filename: file.name,
              size: file.size,
            })
          }
        }
      } catch (err) {
        // Silently fail — the redirect below still returns the user to the app
        console.error('[share-target-sw] Error handling shared file:', err)
      }

      // Always redirect back to the app root after handling the share
      return Response.redirect('/?shared=1', 303)
    })()
  )
})
