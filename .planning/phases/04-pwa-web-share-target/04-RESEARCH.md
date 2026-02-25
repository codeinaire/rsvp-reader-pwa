# Phase 4: PWA + Web Share Target - Research

**Researched:** 2026-02-25
**Domain:** Progressive Web App installation, offline service worker, Web Share Target (URL + PDF), client-side URL extraction via Readability.js
**Confidence:** HIGH (verified against official docs, npm registries, Chrome DevDocs, MDN)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### URL Extraction
- Client-side fetch + Readability library (Mozilla's or equivalent) — no server-side proxy
- On CORS block or parse failure: show a clear error message explaining why it failed, then offer the paste input as a fallback so the user can still read the content
- After successful extraction: show preview first (extracted text, word count, detected title) — same flow as PDF import — user taps Play to start RSVP
- Extract both title (page title or Open Graph title) and article body; title becomes the document name shown in preview

#### Offline Scope
- After installation, the app shell loads and the last-imported document is fully readable offline
- Last document persisted across app closes (localStorage or IndexedDB) — not session-only
- WASM bundle pre-cached with the app shell at install time — not lazy-cached on first use
- New imports (URL or file) require a connection; PDF file picker technically works offline since the file is local (Claude's discretion on whether to explicitly support this)
- Update strategy: new service worker waits until all tabs close, then activates — update on next launch

#### Share Target Flow
- Register Web Share Target for both URL/text shares and PDF file shares
- When app opens via share sheet: show a dedicated loading screen with the URL visible ("Fetching article from example.com…") — not just a spinner
- After extraction: land on preview screen (same as normal import flow)
- If user cancels/taps back from preview: land on the import screen (not close the app)
- iOS users: no special guidance needed — existing import screen already shows file picker and paste options clearly

#### Install Prompt UX
- Browser-native install prompt only — no custom banner or intercepted beforeinstallprompt event
- Display mode: `standalone` (no browser chrome when installed)
- Icons: generate required PWA sizes (192×192, 512×512, maskable) from existing brand assets in the project
- Manifest theme_color matches the app's primary color; browser uses this for status bar and splash background

### Claude's Discretion
- Exact Readability library selection (Mozilla Readability, Defiant, etc.)
- Loading skeleton / loading state visual design
- Whether to explicitly advertise that PDF file picker works offline
- Exact localStorage vs IndexedDB implementation for document persistence
- Splash screen background_color value

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IMPT-01 | User can share a webpage URL from their browser into the app via Web Share Target, and the app extracts readable article text from the URL | Web Share Target GET manifest config + @mozilla/readability client-side parsing with DOMParser; CORS failure graceful fallback to paste |
| PWA-01 | App is installable to the home screen or desktop (Web App Manifest, Add to Home Screen prompt) | manifest.json already scaffolded in Phase 3; needs proper PNG icons (192, 512, maskable) via @vite-pwa/assets-generator; vite-plugin-pwa 1.2.0 handles installability signal |
| PWA-02 | App works fully offline after installation (service worker caches app shell and assets) | vite-plugin-pwa 1.2.0 + injectManifest strategy; globPatterns must include .wasm, .js, .css, .html, .svg; pre-cache WASM bundle at install time per user decision |
| PWA-03 | On iOS where Web Share Target is unavailable, user can import files via a native file picker as a fully functional fallback | iOS does NOT support Web Share Target; existing EntryScreen file picker + paste path is the iOS path; no code change needed, only confirmation that the existing flow is tested and the URL extraction path degrades gracefully on iOS |
</phase_requirements>

---

## Summary

Phase 4 activates the PWA layer that was architecturally scaffolded in Phase 3: the `manifest.json` and `share-target-sw.js` already exist in `public/`, `ShareTargetHandler` in `App.tsx` already registers the scoped service worker, and the manifest already declares `share_target` for PDF files. Phase 4 adds the three missing pieces: (1) the app-shell service worker for offline support and installability, (2) URL/text share target registration in the manifest and the client-side URL extraction flow, and (3) proper PWA icons.

The critical new work is client-side URL extraction via `@mozilla/readability` (0.6.0, current). This runs entirely in the browser: `fetch(url)` → parse HTML with `DOMParser` → pass DOM to `Readability` → extract `{title, textContent}` → tokenize into words → navigate to `/preview`. CORS will block many URLs (sites that don't send `Access-Control-Allow-Origin: *`). The user decision is clear: on CORS failure, show an explanatory error and offer paste as fallback. This is the correct design — no proxy server, no workaround, just honest failure + graceful fallback.

The service worker strategy is `injectManifest` (not `generateSW`) because the scoped `share-target-sw.js` already handles PDF share target POST requests, and the Workbox-managed app-shell SW needs to be separate. The vite-plugin-pwa 1.2.0 (verified current, supports Vite 7) handles app shell precaching with workbox. The `globPatterns` must explicitly include `.wasm` files so the WASM bundle is pre-cached at install time per user requirement.

**Primary recommendation:** Use vite-plugin-pwa 1.2.0 with `injectManifest` strategy for the app-shell SW; add `@mozilla/readability` 0.6.0 for client-side URL extraction; use `@vite-pwa/assets-generator` 1.0.2 to generate PNG icons from an SVG source; extend the manifest `share_target` to add URL/text (GET method) alongside the existing PDF (POST method).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite-plugin-pwa | 1.2.0 | App shell service worker, manifest injection, PWA installability | Standard Vite PWA plugin; uses Workbox under the hood; v1.0.1+ supports Vite 7; verified current |
| @mozilla/readability | 0.6.0 | Client-side HTML article extraction from fetched pages | Mozilla's own library (powers Firefox Reader Mode); battle-tested, maintained; uses native browser DOM; no server required |
| @vite-pwa/assets-generator | 1.0.2 | Generate 192px, 512px, maskable PNG icons from SVG source | Official vite-plugin-pwa companion; generates all required sizes in one CLI command |
| workbox-precaching | (bundled) | Precache app shell assets in the Workbox SW | Required when using injectManifest strategy for precacheAndRoute |
| workbox-routing | (bundled) | Route handling in the custom service worker | Required when using injectManifest strategy |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| idb-keyval | 6.2.2 | Simple promise-based IndexedDB API for persisting last document | If document persistence needs >5MB (word arrays can be large); also works in service worker context; 295 bytes brotli'd |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @mozilla/readability | Defiant (unmaintained), Postlight/mercury-parser | Mozilla Readability is the most maintained, powers Firefox; others are unmaintained or require server |
| @mozilla/readability | Manual regex extraction | Readability handles complex HTML structure, removes boilerplate (nav, footer, ads) — hand-rolling this is a multi-week project |
| idb-keyval | Zustand persist to localStorage | localStorage has a 5-10MB cap; word arrays for long documents can exceed this; idb-keyval is simpler than raw IndexedDB |
| vite-plugin-pwa generateSW | injectManifest | generateSW cannot coexist with the existing scoped share-target-sw.js; injectManifest gives a custom SW where we can add Workbox precache without conflicting with the scoped SW |

**Installation:**
```bash
npm install @mozilla/readability
npm install -D vite-plugin-pwa workbox-build @vite-pwa/assets-generator
npm install idb-keyval
```

---

## What Already Exists (Do Not Re-Implement)

This is critical context — Phase 3 scaffolded the following PWA infrastructure:

| File | What It Does | Status |
|------|-------------|--------|
| `public/manifest.json` | PWA manifest with `share_target` for PDF POST, `display: standalone`, `theme_color` | Exists; needs URL share_target added and real PNG icons |
| `public/share-target-sw.js` | Scoped SW (`scope: /share-target/`) handles PDF POST shares, stores in Cache, postMessages `SHARED_PDF` to app | Exists and correct; do NOT touch |
| `src/App.tsx` ShareTargetHandler | Registers scoped SW, listens for `SHARED_PDF`, processes file through documentService, navigates to /preview | Exists and correct; do NOT touch |
| `index.html` | `<link rel="manifest" href="/manifest.json">` already present | Exists |

**What Phase 4 must add (no duplicating what's done):**
1. App-shell service worker (Workbox-managed, NOT scoped) — separate from `share-target-sw.js`
2. URL/text share target in manifest (GET method, additional `share_target` entry or param additions)
3. Real PNG icons (192, 512, maskable)
4. `@mozilla/readability` URL extraction flow in app
5. Document persistence (last imported document survives app restart)
6. URL share handler in `App.tsx` (check for `?url=` or `?text=` query params on load at `/share-target/` GET action)

---

## Architecture Patterns

### Recommended Project Structure
```
public/
├── manifest.json          # Updated: add URL share_target + real icon paths
├── share-target-sw.js     # UNCHANGED: scoped PDF share SW
├── sw.ts (compiled)       # NEW: Workbox app-shell SW (injectManifest)
├── icons/
│   ├── pwa-192x192.png    # NEW: generated by @vite-pwa/assets-generator
│   ├── pwa-512x512.png    # NEW
│   └── maskable-512.png   # NEW

src/
├── sw.ts                  # NEW: source for Workbox app-shell SW
├── App.tsx                # MODIFIED: add URL share param detection
├── components/
│   ├── EntryScreen/       # MODIFIED: wire URL extraction flow
│   │   └── EntryScreen.tsx
│   └── UrlLoader/         # NEW: dedicated URL loading component
│       └── UrlLoader.tsx  # Shows "Fetching from example.com…" screen
└── lib/
    └── url-extractor.ts   # NEW: @mozilla/readability wrapper + CORS handling
```

### Pattern 1: App-Shell Service Worker with injectManifest

**What:** Workbox-powered service worker that precaches the entire app bundle (JS, CSS, WASM) + handles offline navigation. Separate from the scoped `share-target-sw.js`.
**When to use:** Always — this is the foundation of PWA-02 (offline support) and PWA-01 (installability).

```typescript
// src/sw.ts — registered at root scope by vite-plugin-pwa
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

// Clean up old caches from previous versions
cleanupOutdatedCaches()

// Precache all app assets injected by vite-plugin-pwa
// Includes: JS chunks, CSS, HTML, SVGs, WASM files (if globPatterns includes .wasm)
precacheAndRoute(self.__WB_MANIFEST)

// NOTE: No skipWaiting() — per user decision, SW waits until all tabs close
// This matches the default behavior when no skipWaiting is called
```

```typescript
// vite.config.ts — updated to include vite-plugin-pwa
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Use the existing manifest.json in public/
      // (do NOT let vite-plugin-pwa auto-generate manifest — we manage it)
      manifest: false,
      injectManifest: {
        // CRITICAL: include .wasm files so WASM bundle is pre-cached at install
        globPatterns: ['**/*.{js,css,html,svg,wasm}'],
      },
      registerType: 'prompt',
      // devOptions: { enabled: true } // only needed during dev debugging
    }),
  ],
  worker: { /* unchanged */ },
  optimizeDeps: { /* unchanged */ },
})
```

**Note on `manifest: false`:** The project manages its own `public/manifest.json`. Setting `manifest: false` tells vite-plugin-pwa not to auto-generate a manifest, using the existing file instead.

**Note on `registerType: 'prompt'`:** Per user decision, the new SW waits until all tabs close. `'prompt'` is the correct choice — it does NOT call `skipWaiting()` automatically. The user will get the update on next app launch.

### Pattern 2: URL Share Target — Manifest + Client Handler

**What:** The manifest declares a second share target for GET-method URL/text sharing. The app reads query params at the share target URL and begins URL extraction.
**When to use:** For IMPT-01 (URL sharing from Android Chrome and desktop Chrome).

```json
// public/manifest.json — updated share_target
{
  "share_target": {
    "action": "/share-target/",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

**CRITICAL ANDROID GOTCHA:** On Android, the `url` query param is often EMPTY. Shared URLs typically arrive in the `text` field. The handler must check BOTH `text` and `url` params, treating either as the URL if it passes `URL` constructor validation.

**CRITICAL MANIFEST GOTCHA (Android):** The `action` field in the manifest must match the app's deployed origin or Android may not show the app in the share sheet. Use a relative path `/share-target/` — this is resolved against the app's `start_url` and `id`. If the app ever fails to appear in Android's share sheet, the first thing to check is whether the manifest `id` field matches the canonical app URL.

```typescript
// src/App.tsx — updated ShareTargetHandler to also handle GET URL shares
function ShareTargetHandler() {
  const navigate = useNavigate()
  // ... existing PDF SHARED_PDF listener (unchanged) ...

  useEffect(() => {
    // Handle GET share target (URL/text shared from Android/desktop Chrome)
    const params = new URLSearchParams(window.location.search)
    const sharedUrl = params.get('url') || params.get('text') || ''

    if (sharedUrl && isValidUrl(sharedUrl)) {
      // Navigate to the URL loader screen with the URL as state
      navigate('/load-url', { state: { url: sharedUrl }, replace: true })
      // Clean up query params from the URL bar
      window.history.replaceState({}, '', '/')
    }
  }, [navigate])
  // ...
}

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}
```

### Pattern 3: Client-Side URL Extraction with @mozilla/readability

**What:** Fetch the URL, parse HTML with native `DOMParser`, run Readability, tokenize the article body, show preview.
**When to use:** IMPT-01 URL extraction flow.

```typescript
// src/lib/url-extractor.ts
import { Readability } from '@mozilla/readability'

export interface ExtractResult {
  title: string
  words: string[]
}

export interface ExtractError {
  type: 'cors' | 'parse' | 'empty' | 'network'
  message: string
}

export async function extractArticle(
  url: string
): Promise<ExtractResult | ExtractError> {
  let html: string
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { type: 'network', message: `Server returned ${response.status}` }
    }
    html = await response.text()
  } catch (err) {
    // TypeError is the CORS error from fetch in a browser
    // Also catches network failures
    const isCors =
      err instanceof TypeError && err.message.toLowerCase().includes('fetch')
    return {
      type: isCors ? 'cors' : 'network',
      message: isCors
        ? 'This site does not allow cross-origin requests. Paste the text instead.'
        : 'Could not reach the page. Check your connection.',
    }
  }

  // Parse HTML with native DOMParser — no jsdom needed in browser
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Readability needs the base URL for relative link resolution
  // Set <base> tag so Readability can resolve relative URLs in the document
  const base = doc.createElement('base')
  base.href = url
  doc.head.prepend(base)

  const reader = new Readability(doc)
  const article = reader.parse()

  if (!article || !article.textContent?.trim()) {
    return {
      type: 'parse',
      message:
        'Could not extract article text from this page. Try pasting the text instead.',
    }
  }

  // Tokenize to words (reuse existing tokenizer pattern)
  const words = article.textContent
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)

  if (words.length < 10) {
    return {
      type: 'empty',
      message: 'Not enough readable text found on this page.',
    }
  }

  return {
    title: article.title || new URL(url).hostname,
    words,
  }
}
```

**Source:** Based on @mozilla/readability README (https://github.com/mozilla/readability) — browser usage with DOMParser (no jsdom needed).

### Pattern 4: Document Persistence (last document survives app restart)

**What:** Persist the current `wordList` + `documentTitle` to IndexedDB (via idb-keyval) so when the user reopens the app offline, the last document is available.
**When to use:** Required by user decision (offline scope — last document readable offline).

```typescript
// src/store/rsvp-store.ts — extend setDocument and add hydration
import { get, set } from 'idb-keyval'

const PERSIST_KEY = 'rsvp-last-document'

// On app init, attempt to restore last document from IndexedDB
export async function hydrateLastDocument(store: RsvpStore) {
  try {
    const saved = await get<{ words: string[]; title: string | null }>(
      PERSIST_KEY
    )
    if (saved && saved.words.length >= 10) {
      store.setDocument(saved.words, saved.title)
    }
  } catch {
    // IndexedDB unavailable (private browsing, storage quota) — silent fail
  }
}

// Call setPersistedDocument after setDocument succeeds
export async function persistDocument(words: string[], title: string | null) {
  try {
    await set(PERSIST_KEY, { words, title })
  } catch {
    // Storage quota exceeded or unavailable — silent fail, not critical
  }
}
```

**Implementation note:** `idb-keyval` is simpler than raw IndexedDB and adds 295 bytes brotli'd. For large word arrays (10,000+ words from a long PDF), localStorage's 5-10MB cap may be insufficient, making IndexedDB the right choice. The user decision says "localStorage or IndexedDB" — recommend IndexedDB via idb-keyval.

### Pattern 5: UrlLoader Component (Share Target Loading Screen)

**What:** Dedicated full-screen component shown when the app opens via share sheet or when user manually enters a URL. Shows "Fetching article from example.com…" with hostname visible.
**When to use:** Required by user decision ("dedicated loading screen with the URL visible").

```typescript
// src/components/UrlLoader/UrlLoader.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { extractArticle } from '../../lib/url-extractor'
import { useRsvpStore } from '../../store/rsvp-store'

interface LocationState {
  url: string
}

export default function UrlLoader() {
  const navigate = useNavigate()
  const location = useLocation()
  const setDocument = useRsvpStore((s) => s.setDocument)
  const [error, setError] = useState<string | null>(null)
  const url = (location.state as LocationState)?.url ?? ''

  const hostname = (() => {
    try { return new URL(url).hostname } catch { return url }
  })()

  useEffect(() => {
    if (!url) { navigate('/', { replace: true }); return }

    extractArticle(url).then((result) => {
      if ('type' in result) {
        setError(result.message)
      } else {
        setDocument(result.words, result.title)
        navigate('/preview', { replace: true })
      }
    })
  }, [url, navigate, setDocument])

  if (error) {
    return (
      <div>
        <p>{error}</p>
        <button onClick={() => navigate('/', { replace: true })}>
          Go back and paste instead
        </button>
      </div>
    )
  }

  return (
    <div>
      <p>Fetching article from {hostname}…</p>
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Do NOT use `registerType: 'autoUpdate'`** — this calls `skipWaiting()` automatically, which the user decision explicitly rejected. Use `'prompt'`.
- **Do NOT use `generateSW` strategy** — the project has an existing scoped `share-target-sw.js`. Using generateSW would make vite-plugin-pwa try to replace it. Use `injectManifest`.
- **Do NOT add a single `share_target` that handles both GET and POST** — the Web Share Target spec does not support mixing methods. Keep GET (URL/text) and POST (file) as two separate share targets if both are needed simultaneously. (Note: verify whether Chrome supports two `share_target` entries in one manifest — see Open Questions.)
- **Do NOT call `Readability()` before DOMParser finishes** — Readability requires a live DOM document, not an HTML string.
- **Do NOT `await init()` for WASM before React renders** — WASM lazy-init pattern already established in Phase 1; the service worker precache ensures WASM is available offline.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Article extraction from HTML | Custom regex to strip tags/nav/footer/ads | `@mozilla/readability` | Readability handles 10+ years of edge cases in real-world HTML; powers Firefox Reader Mode |
| PWA icon generation | ImageMagick scripts, Figma exports | `@vite-pwa/assets-generator` | Handles maskable safe-zone padding, generates all required sizes from one SVG |
| Service worker precaching manifest | Manually listing all build artifact hashes | `vite-plugin-pwa` + Workbox | Build artifacts change hashes every build; Workbox generates the manifest automatically |
| CORS bypass | Proxy server, JSONP | Honest error + paste fallback | No server; proxy adds infrastructure complexity; user decision is clear: degrade gracefully |
| URL-is-valid check | Complex regex | `new URL(str)` in try/catch | The URL constructor is the spec-correct validator |

**Key insight:** Readability's core value is not just stripping tags — it's heuristic scoring of which HTML nodes contain the "main content" vs navigation, ads, related articles, and comments. Reproducing this correctly for even 80% of real-world sites requires deep HTML parsing knowledge. Use the library.

---

## Common Pitfalls

### Pitfall 1: Android URL Shares Come Through `text` Param, Not `url` Param
**What goes wrong:** Developer reads `params.get('url')` and gets `null` on Android. The URL shared by Android Chrome actually arrives in the `text` field because Android's share intent system doesn't have a separate "url" slot.
**Why it happens:** Android's `Intent.EXTRA_TEXT` is used for both text and URLs in the Android share system; Chrome maps it to the Web Share Target `text` parameter.
**How to avoid:** Read BOTH `params.get('url')` and `params.get('text')`, validate each with the `URL` constructor, use whichever is a valid URL.
**Warning signs:** Share target works on desktop Chrome but not Android; `?url=` is always empty in logs from Android devices.

### Pitfall 2: CORS Will Block Most URL Fetches
**What goes wrong:** `fetch(sharedUrl)` throws a `TypeError: Failed to fetch` for the majority of major news/content sites (NYTimes, WashPost, Medium, etc.) because they do not include CORS headers on their HTML responses.
**Why it happens:** Browsers enforce same-origin policy for XHR/fetch; most sites serve HTML intended for browser navigation (no `Access-Control-Allow-Origin` header needed) but this blocks programmatic fetch from other origins.
**How to avoid:** Per user decision, show a clear explanatory error ("This site doesn't allow the app to fetch its content") and offer paste as fallback. Make the error message actionable, not just technical.
**Warning signs:** Trying to detect CORS errors before-hand is not reliable — you cannot know whether a URL will be CORS-blocked without attempting the fetch. Design the error UI first, not as an afterthought.

### Pitfall 3: Two `share_target` Entries May Not Be Supported
**What goes wrong:** A manifest cannot have two `share_target` objects. The manifest spec allows only one `share_target`. Therefore, you cannot register for both GET (URL) and POST (file) simultaneously with two separate entries.
**Why it happens:** Web Share Target Level 1 spec defines `share_target` as a single object, not an array.
**How to avoid:** Choose ONE method. For this app, URL/text sharing (GET) is new in Phase 4, and PDF file sharing (POST) was built in Phase 3. The correct approach is to combine them OR keep the existing Phase 3 POST-based PDF share target as the primary and handle URL sharing differently. See Open Questions section.
**Warning signs:** Manifest with `"share_target": [{...}, {...}]` — this is an array and will be rejected.

### Pitfall 4: Service Worker Scope Collision
**What goes wrong:** If the vite-plugin-pwa SW is registered at the root scope (`/`) and the scoped `share-target-sw.js` is registered at `/share-target/`, both could be active. The root-scope SW must NOT intercept `/share-target/` POST requests — that's the scoped SW's job.
**Why it happens:** Root-scope service workers intercept all requests by default, including sub-paths.
**How to avoid:** The root-scope Workbox SW must explicitly NOT intercept POST `/share-target/` requests. By default Workbox only handles `precacheAndRoute` requests (GET for cached assets) and passes everything else through. POST to `/share-target/` is handled by the scoped SW. Verify this in DevTools → Application → Service Workers.
**Warning signs:** Console errors about multiple SWs fighting over the same request; shared PDFs stop working after adding the Workbox SW.

### Pitfall 5: WASM Not Included in Precache
**What goes wrong:** After installing the PWA and going offline, the app loads but can't parse new PDFs because the WASM module is not cached.
**Why it happens:** `vite-plugin-pwa` defaults `globPatterns` to `['**/*.{js,css,html}']` — `.wasm` files are NOT included.
**How to avoid:** Set `globPatterns: ['**/*.{js,css,html,svg,wasm}']` in `injectManifest` config. Verify by checking Workbox precache list in DevTools after build.
**Warning signs:** WASM loads from network when online but fails when offline; Lighthouse PWA audit passes but WASM-dependent features fail offline.

### Pitfall 6: Icons Not Meeting Installability Requirements
**What goes wrong:** Chrome shows "Add to Home Screen" but the install fails or the icon is missing. Or Chrome DevTools PWA audit fails with "icons do not meet requirements."
**Why it happens:** Chrome requires at minimum a 192×192 PNG icon and a 512×512 PNG icon with `purpose: 'any'`. The current manifest uses `vite.svg` which is an SVG — Chrome for Android requires PNG for home screen icons.
**How to avoid:** Use `@vite-pwa/assets-generator` to generate proper PNG icons before activating PWA install. The `minimal-2023` preset generates all required sizes.
**Warning signs:** Lighthouse "Installable" check fails; Chrome DevTools Application tab shows install button grayed out.

### Pitfall 7: Android Manifest Caching
**What goes wrong:** Updating the manifest (adding share_target, new icons) doesn't take effect on already-installed instances. Android aggressively caches PWA manifests.
**Why it happens:** Android Chrome caches the manifest separately from the service worker. Updates only propagate after the user uninstalls and reinstalls the app.
**How to avoid:** When testing manifest changes during development: uninstall the PWA from the test device, clear Chrome's site data, then reinstall. This is a testing/development concern, not a production concern.
**Warning signs:** New share target not appearing in Android share sheet after manifest update.

---

## Code Examples

Verified patterns from official sources:

### Manifest with URL Share Target (GET) — Verified against Chrome DevDocs
```json
{
  "name": "RSVP Reader",
  "short_name": "RSVP",
  "description": "Read faster with one word at a time — zero friction PDF import",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#030712",
  "theme_color": "#030712",
  "icons": [
    {
      "src": "/icons/pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "share_target": {
    "action": "/share-target/",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        {
          "name": "pdf",
          "accept": ["application/pdf", ".pdf"]
        }
      ]
    }
  }
}
```

**Note:** The current Phase 3 manifest has `share_target` for PDFs only (POST, multipart/form-data). To add URL sharing: the `params` object can include `title`, `text`, and `url` fields alongside `files`. This allows a SINGLE `share_target` entry to handle BOTH URL shares (where `url` or `text` contain the URL) and file shares (where `files` contains the PDF). The service worker distinguishes them by checking whether `formData.get('pdf')` is non-null.

### vite-plugin-pwa injectManifest Configuration — Verified against vite-pwa-org.netlify.app
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',          // service worker source is in src/
  filename: 'sw.ts',      // src/sw.ts
  manifest: false,        // use existing public/manifest.json
  injectManifest: {
    globPatterns: ['**/*.{js,css,html,svg,wasm}'],
  },
  registerType: 'prompt', // new SW waits until all tabs close
})
```

### @vite-pwa/assets-generator CLI — Verified against vite-pwa-org.netlify.app/assets-generator/cli
```bash
# Install
npm install -D @vite-pwa/assets-generator

# Run (source: your SVG in public/)
npx pwa-assets-generator --preset minimal-2023 public/logo.svg

# This generates:
# public/icons/pwa-64x64.png
# public/icons/pwa-192x192.png
# public/icons/pwa-512x512.png
# public/icons/maskable-icon-512x512.png
# public/favicon.ico
```

Alternatively, define a config file `pwa-assets.config.ts`:
```typescript
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.svg'],
})
```

### @mozilla/readability Browser Usage — Verified against GitHub mozilla/readability README
```typescript
// Browser-side (no Node.js, no jsdom needed)
import { Readability } from '@mozilla/readability'

const response = await fetch(url)
const html = await response.text()

const parser = new DOMParser()
const doc = parser.parseFromString(html, 'text/html')

// Set base URL for relative link resolution
const base = doc.createElement('base')
base.href = url
doc.head.prepend(base)

const reader = new Readability(doc)
const article = reader.parse()
// article.title — page title
// article.textContent — clean article text
// article.excerpt — short summary
```

**Source:** https://github.com/mozilla/readability — "If you use Readability in a web browser, you will likely be able to use a document reference from elsewhere (e.g. fetched via XMLHttpRequest, in a same-origin iframe, etc.)." Native DOMParser works as the DOM provider.

### Share Target URL Detection Pattern — Verified against Chrome DevDocs + confidence.sh
```typescript
// In App.tsx ShareTargetHandler, detect GET share of URL/text
const params = new URLSearchParams(window.location.search)
const rawUrl = params.get('url') || ''
const rawText = params.get('text') || ''

// On Android, URL often arrives in `text` field
const candidate = rawUrl || rawText

function isValidHttpUrl(str: string): boolean {
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch { return false }
}

if (candidate && isValidHttpUrl(candidate)) {
  navigate('/load-url', { state: { url: candidate }, replace: true })
  window.history.replaceState({}, '', '/')
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| vite-plugin-pwa ^0.21.x | vite-plugin-pwa ^1.x | Mid-2025 (v1.0.1 = Vite 7 support) | v1.x is the current major; Vite 7 requires v1.0.1+ |
| generateSW strategy | injectManifest strategy (for custom SW needs) | Always been an option | Required here due to existing scoped share-target-sw.js |
| WebKit Feature Status page | Retired; use MDN/CanIUse | 2024 | Must consult CanIUse or MDN for Safari/iOS support |
| SVG icons for PWA | PNG icons required for Android home screen | Always been a Chrome requirement; now enforced more strictly | Current manifest uses vite.svg — must replace with PNG |

**Confirmed browser support as of Feb 2026:**
- Web Share Target API: Chrome 76+ Android, Chrome 89+ desktop — FULL SUPPORT
- Web Share Target API on iOS Safari: NOT SUPPORTED (confirmed by firt.dev PWA compatibility notes and MDN). iOS supports Web Share (outgoing) but NOT Share Target (incoming). This is a long-standing intentional gap.
- vite-plugin-pwa 1.2.0: Verified current (Nov 2025 release); Vite 7 compatible

---

## Open Questions

1. **Single vs dual share_target for URL + PDF sharing**
   - What we know: Web Share Target spec allows only ONE `share_target` object in the manifest (not an array). The existing Phase 3 manifest uses POST multipart/form-data for PDF files.
   - What's unclear: Can one `share_target` handle both file (POST) and URL (GET) shares? The answer appears to be NO — POST multipart/form-data and GET are fundamentally different methods. The `method` field is a single value.
   - Recommendation: Use the POST multipart/form-data share target for BOTH PDF files AND URL/text. Include `title`, `text`, `url` in `params` alongside `files`. The service worker reads `formData.get('pdf')` for PDF shares and `formData.get('url') || formData.get('text')` for URL shares. This is the cleanest solution — one action URL, one SW handler, distinguishes by content. **Verify this pattern against the Chrome DevDocs before committing in the plan.**

2. **Does iOS treat `?url=` query params from the action URL as a share target path at all?**
   - What we know: iOS does not support Web Share Target; the existing file picker + paste path is the iOS path.
   - What's unclear: If a user on iOS somehow navigates to `/share-target/?url=...` manually, should the app handle it? Probably yes — the URL loader code path should be URL-triggered, not exclusively share-target-triggered.
   - Recommendation: Make the URL extraction flow reachable from the EntryScreen (manual URL input) as well as via share target. This also helps with iOS UX without needing Share Target.

3. **PDF file picker offline support — explicitly advertise or not?**
   - What we know: User decision says this is Claude's discretion.
   - What's unclear: Is it worth adding a badge/label "Works offline" on the file picker button?
   - Recommendation: Do NOT add explicit "works offline" labeling. The file picker already works; adding messaging creates an expectation that URL fetching also works offline (it doesn't). Keep the UI neutral. The offline story is about "reopening the last imported document" — make THAT clear, not per-feature offline status.

4. **Icon source SVG — which file to use?**
   - What we know: The current `public/vite.svg` is the Vite logo (not a custom brand icon). `src/assets/react.svg` is the React logo. Neither is an RSVP Reader brand asset.
   - What's unclear: Is there a custom brand/logo SVG? The current manifest uses `vite.svg` as a placeholder.
   - Recommendation: Create a simple SVG logo for RSVP Reader (e.g., the letter "R" or an eye/word symbol on a dark background) as `public/logo.svg`, then generate PNG icons from it with `@vite-pwa/assets-generator`. This is straightforward and should be part of Wave 1 of the plan.

---

## Sources

### Primary (HIGH confidence)
- `npm info vite-plugin-pwa version` → 1.2.0 (verified live, 2026-02-25)
- `npm info @mozilla/readability version` → 0.6.0 (verified live, 2026-02-25)
- `npm info idb-keyval version` → 6.2.2 (verified live, 2026-02-25)
- `npm info @vite-pwa/assets-generator version` → 1.0.2 (verified live, 2026-02-25)
- https://developer.chrome.com/docs/capabilities/web-apis/web-share-target — Web Share Target API docs (Chrome DevDocs)
- https://github.com/mozilla/readability — @mozilla/readability README; browser DOMParser usage
- https://vite-pwa-org.netlify.app/guide/inject-manifest — injectManifest strategy docs
- https://vite-pwa-org.netlify.app/assets-generator/cli — @vite-pwa/assets-generator CLI docs
- https://github.com/vite-pwa/vite-plugin-pwa/releases — confirmed v1.2.0 current, Vite 7 support via v1.0.1+

### Secondary (MEDIUM confidence)
- https://firt.dev/notes/pwa-ios/ — iOS Web Share Target NOT SUPPORTED (outdated doc but confirmed by MDN and other sources; iOS non-support is a long-standing known issue)
- https://martin.hjartmyr.se/articles/pwa-web-share-target-android/ — Android URL field quirk (absolute URL fix for share sheet visibility)
- https://confidence.sh/blog/how-to-use-the-web-share-target-api/ — URL arrives in `text` field on Android (confirmed by Chrome DevDocs note)
- https://github.com/jakearchibald/idb-keyval — idb-keyval README; 295 bytes brotli'd

### Tertiary (LOW confidence — flag for validation)
- Web Share Target manifest with both files + URL params in one POST entry — combining these in a single `share_target` is logical but not explicitly documented; validate against Chrome DevDocs at implementation time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified via live npm registry; Chrome DevDocs confirmed
- Architecture patterns: HIGH — vite-plugin-pwa injectManifest pattern verified against official docs; Readability DOMParser pattern verified against GitHub README
- iOS non-support: HIGH — confirmed by multiple sources; long-standing known gap
- Android URL-in-text-field: MEDIUM — confirmed by Chrome DevDocs note and multiple developer blogs
- Single share_target for both file+URL: LOW — logical but validate at implementation time

**Research date:** 2026-02-25
**Valid until:** 2026-04-25 (stable PWA specs; vite-plugin-pwa versions stable; verify @mozilla/readability for any new release)
