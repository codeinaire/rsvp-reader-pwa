# Phase 3: Import UI + Reading View - Research

**Researched:** 2026-02-25
**Domain:** Web Share Target API, dual-view CSS layout, word-highlight scroll sync, font size persistence
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Import confirmation screen**
- Show both a scrollable text preview (~200-300 words, fading at bottom) AND a metadata summary (filename, page count, word count, estimated reading time)
- Single "Start Reading" CTA — loads into RSVP at the user's last WPM setting
- Error state: clear message explaining why extraction failed (e.g., "This PDF appears to be scanned — no text layer found") + "Try another file" button

**Dual-view layout split**
- Fixed proportions: RSVP zone ~40% of viewport height, full text panel ~60%
- RSVP zone is sticky — stays fixed at top while only the text panel scrolls
- Subtle divider line between the two zones
- Mobile: stack vertically with the same proportions (RSVP above, text panel below); text panel is independently scrollable

**Text panel sync + dimming**
- During RSVP playback: reduce opacity on the entire text panel (~40-50%), returning to full when paused
- Current word highlighted with a background highlight (marker-style), visible even with panel dimmed
- Auto-scroll only triggers when the highlighted word would go off-screen (not continuously centered)
- User can manually scroll the text panel during playback; auto-scroll resumes after a short delay

**Font size controls**
- Settings/gear icon in the control area opens a small panel with font size adjustments
- +/- step buttons (not a slider or presets)
- Fully independent controls: separate +/- pairs for "RSVP word" and "Full text"
- Font size preferences persist to localStorage between sessions

### Claude's Discretion
- Exact step sizes for font size increments
- Transition/animation timing for dimming and auto-scroll
- Loading skeleton for the text panel
- Exact visual treatment of the background word highlight color
- How "estimated reading time" is calculated and formatted

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IMPT-02 | User can share a PDF file from another app into the RSVP Reader via Web Share Target | Web Share Target requires PWA installation + service worker; ONLY works on Android Chrome/Edge; NOT on iOS Safari — needs manifest `share_target` with POST + multipart/form-data, service worker to intercept and cache the file, then postMessage to main thread |
| IMPT-03 | User can open a file (PDF) directly from device storage using a file picker button within the app | Already partially implemented in EntryScreen (file input + drag-drop); Phase 3 migrates this to the reading view and ensures it also works via drag-drop on the main entry — no new dependency, native HTML `<input type="file">` |
| VIEW-01 | RSVP word display is shown at the top of the screen; scrollable full document text is shown below with the current word highlighted and auto-scrolled into view | Sticky top zone (40dvh) + scrollable bottom panel (60dvh); `position: sticky` or flex+overflow layout; word ref array + `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` |
| VIEW-02 | The full text area is visually dimmed/darkened while RSVP is actively playing | Tailwind `transition-opacity duration-300` on the text panel container; opacity driven by `isPlaying` from Zustand store; highlight stays visible via higher contrast background |
| VIEW-03 | After importing a document, user sees a text preview of the extracted content before starting RSVP, allowing them to confirm extraction quality | TextPreview component already exists; Phase 3 enhances it with: scrollable preview (~200-300 words), fade-at-bottom gradient, word count, filename, page count, estimated reading time, and better error handling |
| VIEW-04 | User can adjust font size for both the RSVP word display and the full text panel | Settings panel triggered from gear icon; +/- step buttons for two independent sizes; persisted to localStorage via Zustand `persist` middleware extending the existing `partialize` |
</phase_requirements>

---

## Summary

Phase 3 adds three distinct feature areas to the existing codebase: (1) Web Share Target file receipt (IMPT-02), (2) enhanced import confirmation screen (VIEW-03 + existing IMPT-03), and (3) the complete dual-view reading layout with word sync, dimming, and font size controls (VIEW-01, VIEW-02, VIEW-04).

The most constrained area is **IMPT-02 (Web Share Target)**: this requires a PWA service worker, a web app manifest, and only works on installed Android Chrome/Edge PWAs — iOS Safari does not support `share_target` as of 2026. Since Phase 4 owns PWA/service worker work (PWA-01, PWA-02), IMPT-02 is technically a Phase 4 dependency. The planner must decide whether to implement the manifest `share_target` entry now (with the service worker stub deferred to Phase 4) or defer IMPT-02 entirely to Phase 4. Given the CONTEXT.md locks IMPT-02 into Phase 3 scope, the recommended approach is to implement the manifest entry and the service-worker fetch handler for the share target path in Phase 3, documenting that share receipt only activates after Phase 4 installs the service worker. The file picker and drag-drop (IMPT-03) need no new dependencies — EntryScreen already implements both.

The **dual-view layout** (VIEW-01) uses CSS sticky positioning on the RSVP zone with `dvh` units for reliable mobile viewport sizing, and an overflow-y scrollable bottom panel. Word highlighting uses a ref array (one ref per word span) and `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` triggered by `currentWordIndex` changes — only when the element is not already visible. Manual scroll detection uses a boolean flag set on `scroll` events and cleared after 2 seconds, pausing auto-scroll during that window. **Font size persistence** extends the existing Zustand store's `partialize` to include two new keys: `rsvpFontSize` and `textFontSize`.

**Primary recommendation:** Build Phase 3 as three focused work streams: (A) TextPreview enhancement + manifest share_target entry, (B) dual-view RSVPReader layout replacement, (C) font size settings panel + Zustand extension. No new npm packages are needed — all patterns are achievable with existing React 19, Zustand 5, Tailwind CSS 4, and browser-native APIs.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 (installed) | Component rendering, hooks | Already in project |
| Zustand | 5.0.11 (installed) | Font size + settings state persistence | Already in project; `partialize` extended to include `rsvpFontSize`, `textFontSize` |
| Tailwind CSS 4 | via @tailwindcss/vite 4.2.0 (installed) | Layout, opacity transitions, dvh units, arbitrary values | Already in project |
| React Router 7 | 7.13.0 (installed) | Existing routes (/preview, /read); no new routes needed | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `scrollIntoView` (built-in) | Browser API | Auto-scroll highlighted word into view | In text panel word tracking; use `block: 'nearest'` to avoid centering when already visible |
| `dvh` CSS units (built-in) | Baseline 2023 | Accurate viewport height on mobile (avoids browser chrome overlap) | For the 40dvh RSVP zone and 60dvh text panel — more accurate than `vh` on mobile |
| Web Share Target (service worker + manifest) | Browser API | Receive shared PDFs from other apps on Android | For IMPT-02; requires PWA installation and service worker — Phase 4 provides the SW |
| `localStorage` (built-in) | Browser API | Font size persistence via Zustand persist middleware | Via existing Zustand `partialize` extension |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `scrollIntoView` | `scrollTo` with `getBoundingClientRect` | Both work; `scrollIntoView({ block: 'nearest' })` is simpler and handles the "only scroll if off-screen" requirement natively |
| CSS `dvh` with `h-[40dvh]` arbitrary class | `vh` units or JS-computed heights | `dvh` adapts to mobile browser chrome without JavaScript; `vh` is 100 on mobile regardless of visible chrome — causes layout overlap |
| Extending existing Zustand store `partialize` | Separate settings store | One store is simpler; `partialize` can return multiple keys; project pattern established in Phase 1-2 |
| Hand-rolled file sharing handler | Workbox | Workbox adds ~30KB for features not needed in Phase 3; raw fetch event listener is sufficient and consistent with project no-dependency preference |
| `position: sticky` for RSVP zone | `position: fixed` with padding offset | `sticky` is easier to implement in a flex column container; `fixed` requires body padding adjustments and interferes with scroll containment |

**Installation:** No new npm packages required for Phase 3. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── EntryScreen/
│   │   └── EntryScreen.tsx          # Unchanged — file picker + drag-drop already implemented
│   ├── TextPreview/
│   │   └── TextPreview.tsx          # ENHANCED: add fade-gradient, reading time, page count, error state
│   ├── RSVPReader/
│   │   ├── RSVPReader.tsx           # REPLACED: new dual-view layout (RSVP zone sticky + scrollable text panel)
│   │   ├── ORPDisplay.tsx           # UNCHANGED (rsvpFontSize passed as prop or read from store)
│   │   ├── PlaybackControls.tsx     # EXTENDED: add gear icon + FontSizePanel toggle
│   │   ├── ProgressBar.tsx          # UNCHANGED
│   │   ├── TextPanel.tsx            # NEW: scrollable full-text panel with word highlighting + dimming
│   │   └── FontSizePanel.tsx        # NEW: +/- buttons for RSVP word and full text font sizes
│   └── ...
├── store/
│   └── rsvp-store.ts               # EXTENDED: add rsvpFontSize, textFontSize to state + persist
└── public/
    └── manifest.json               # NEW or UPDATED: add share_target for IMPT-02
```

### Pattern 1: Dual-View Layout (VIEW-01) — Sticky RSVP + Scrollable Text Panel

**What:** The reading screen splits viewport into two fixed-proportion zones. The RSVP zone is sticky and never scrolls. The text panel scrolls independently.

**How to implement:** Use a full-height flex column container with `h-dvh` (not `h-screen` which maps to `100vh`). The RSVP zone gets `h-[40dvh] flex-shrink-0 sticky top-0`. The text panel gets `h-[60dvh] overflow-y-auto`. A divider `border-t` separates them.

**Why `dvh` matters on mobile:** On mobile Safari and Chrome, the `vh` unit includes the browser chrome (URL bar), so `100vh` overflows below the visible area. `dvh` (Dynamic Viewport Height) updates as the browser chrome shows/hides, keeping the layout within the visible area. Tailwind 4 supports arbitrary `dvh` values via `h-[40dvh]`.

**Example:**
```tsx
// src/components/RSVPReader/RSVPReader.tsx
export default function RSVPReader() {
  return (
    <div className="flex flex-col h-dvh bg-gray-950 overflow-hidden">
      {/* RSVP zone — sticky top ~40% */}
      <div className="h-[40dvh] flex-shrink-0 flex flex-col items-center justify-center
                      sticky top-0 z-10 bg-gray-950 px-4 gap-4">
        <ProgressBar />
        <ORPDisplay word={currentWord} />
        <PlaybackControls />
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800 flex-shrink-0" />

      {/* Text panel — scrollable bottom ~60% */}
      <TextPanel />
    </div>
  )
}
```

**Note on `sticky` vs `fixed`:** `position: sticky` works correctly here because the scroll container is the text panel div, not the window. The RSVP zone is a sibling of the scrollable panel, not a parent, so it sticks to the top of the outer non-scrolling flex container.

### Pattern 2: Word Highlighting + Auto-Scroll (VIEW-01)

**What:** Each word in the text panel is a `<span>` with a ref. When `currentWordIndex` changes, the corresponding span gets a highlight class applied and `scrollIntoView` is called only if it is not already visible.

**Performance:** Applying highlight via direct DOM mutation (not state) avoids re-rendering all ~10,000 word spans on every word advance. Use `useEffect` with `currentWordIndex` as dependency, but do NOT store all refs in React state — use a mutable ref array.

**Manual scroll detection:** Listen to `scroll` events on the text panel container element. When a scroll event fires, set a `userScrolledRef = true` and schedule a `setTimeout` to clear it after 2000ms. In the auto-scroll effect, skip `scrollIntoView` when `userScrolledRef.current === true`. This resumes auto-scroll after 2 seconds of no manual scroll.

**Example:**
```tsx
// src/components/RSVPReader/TextPanel.tsx
export function TextPanel() {
  const wordList = useRsvpStore((s) => s.wordList)
  const currentWordIndex = useRsvpStore((s) => s.currentWordIndex)
  const isPlaying = useRsvpStore((s) => s.isPlaying)
  const textFontSize = useRsvpStore((s) => s.textFontSize)

  // Ref array: one per word span — populated via callback ref pattern
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

  // Manual scroll detection
  const userScrolledRef = useRef(false)
  const scrollResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Auto-scroll: trigger when currentWordIndex changes
  useEffect(() => {
    const el = wordRefs.current[currentWordIndex]
    if (!el) return
    if (userScrolledRef.current) return // user took control — skip

    // scrollIntoView with block: 'nearest' = only scrolls if off-screen
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentWordIndex])

  // Manual scroll listener on panel
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    function onScroll() {
      userScrolledRef.current = true
      if (scrollResumeTimer.current) clearTimeout(scrollResumeTimer.current)
      scrollResumeTimer.current = setTimeout(() => {
        userScrolledRef.current = false
      }, 2000)
    }

    panel.addEventListener('scroll', onScroll, { passive: true })
    return () => panel.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      ref={panelRef}
      className={[
        'h-[60dvh] overflow-y-auto px-4 py-4',
        'transition-opacity duration-300',
        isPlaying ? 'opacity-50' : 'opacity-100',
      ].join(' ')}
    >
      <p className="leading-relaxed text-gray-200" style={{ fontSize: textFontSize }}>
        {wordList.map((word, i) => (
          <span
            key={i}
            ref={(el) => { wordRefs.current[i] = el }}
            className={i === currentWordIndex
              ? 'bg-yellow-300 text-gray-900 rounded px-0.5'
              : ''}
          >
            {word}{' '}
          </span>
        ))}
      </p>
    </div>
  )
}
```

**Critical: ref array population.** Use the callback ref pattern (`ref={(el) => { wordRefs.current[i] = el }}`), not `useRef` per-word. This avoids creating thousands of individual ref objects.

**Critical: avoid re-rendering all spans on index change.** The word list is fixed for a session. Applying highlight class changes via `useEffect` direct DOM manipulation is far more performant than updating a `highlightedIndex` state that would force a full re-render of all spans. Use `classList.add/remove` directly:

```tsx
// Alternative: direct DOM mutation for highlight (avoids re-rendering entire word list)
useEffect(() => {
  // Remove old highlight
  const prev = wordRefs.current[previousIndexRef.current]
  if (prev) {
    prev.style.backgroundColor = ''
    prev.style.color = ''
  }
  // Apply new highlight
  const curr = wordRefs.current[currentWordIndex]
  if (curr) {
    curr.style.backgroundColor = '#fde047'  // yellow-300
    curr.style.color = '#111827'            // gray-900
  }
  previousIndexRef.current = currentWordIndex
}, [currentWordIndex])
```

The choice between CSS class update and direct style mutation depends on implementation comfort — both avoid re-rendering the word list. Direct style mutation is documented as a valid React pattern (transcript-audio sync, Metaview article). If Tailwind classes are used, `classList.add/remove` with Tailwind class names is cleaner.

### Pattern 3: Text Panel Dimming (VIEW-02)

**What:** Apply opacity transition to the full text panel based on `isPlaying`.

**Implementation:** One Tailwind class switch on the panel container. The user decision specifies 40-50% opacity while playing. The highlight must remain visible — yellow on gray-900 text maintains sufficient contrast even at 50% opacity.

```tsx
// In TextPanel.tsx — opacity driven by isPlaying
const opacityClass = isPlaying ? 'opacity-50' : 'opacity-100'

<div className={`transition-opacity duration-300 ${opacityClass}`}>
```

**Timing:** `duration-300` (300ms transition) is the Tailwind default for smooth but not sluggish transitions. This is Claude's discretion — 200-400ms range is reasonable.

### Pattern 4: Font Size Controls + Persistence (VIEW-04)

**What:** Two settings (rsvpFontSize, textFontSize) persisted to localStorage via Zustand, controlled by +/- buttons in a settings panel toggled from a gear icon.

**Store extension:** Extend the existing `rsvp-store.ts` to add font size fields and include them in the `partialize` return:

```typescript
// src/store/rsvp-store.ts — Phase 3 additions
export interface RsvpStore {
  // ... existing Phase 1+2 fields ...

  // Settings (Phase 3 — persisted)
  rsvpFontSize: number  // default: 72 (in px, matching existing ~4.5rem)
  textFontSize: number  // default: 16 (in px, matching text-base)

  // Actions — Phase 3 settings
  setRsvpFontSize: (size: number) => void
  setTextFontSize: (size: number) => void
}

// In partialize:
partialize: (state) => ({
  wpm: state.wpm,
  rsvpFontSize: state.rsvpFontSize,
  textFontSize: state.textFontSize,
}),
```

**Step size (Claude's discretion):** 4px steps for text panel (12→16→20→24→28px range). 8px steps for RSVP word (56→64→72→80→88→96px range). Min/max clamps prevent extreme values.

**FontSizePanel component:**
```tsx
// src/components/RSVPReader/FontSizePanel.tsx
export function FontSizePanel() {
  const rsvpFontSize = useRsvpStore((s) => s.rsvpFontSize)
  const textFontSize = useRsvpStore((s) => s.textFontSize)
  const setRsvpFontSize = useRsvpStore((s) => s.setRsvpFontSize)
  const setTextFontSize = useRsvpStore((s) => s.setTextFontSize)

  return (
    <div className="flex flex-col gap-3 p-3 bg-gray-800 rounded-xl border border-gray-700">
      {/* RSVP word font size */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-gray-400">RSVP word</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setRsvpFontSize(Math.max(48, rsvpFontSize - 8))}>−</button>
          <span className="text-sm text-gray-300 tabular-nums w-10 text-center">
            {rsvpFontSize}px
          </span>
          <button onClick={() => setRsvpFontSize(Math.min(120, rsvpFontSize + 8))}>+</button>
        </div>
      </div>

      {/* Full text font size */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-gray-400">Full text</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setTextFontSize(Math.max(12, textFontSize - 4))}>−</button>
          <span className="text-sm text-gray-300 tabular-nums w-10 text-center">
            {textFontSize}px
          </span>
          <button onClick={() => setTextFontSize(Math.min(32, textFontSize + 4))}>+</button>
        </div>
      </div>
    </div>
  )
}
```

**Gear icon toggle:** The gear icon in `PlaybackControls.tsx` toggles a local `showFontPanel` state. The font panel renders absolutely positioned (or in a details/summary) to avoid disrupting the controls layout.

### Pattern 5: Web Share Target (IMPT-02)

**What:** Enable the PWA to appear in Android's system share sheet and receive shared PDF files from other apps.

**Hard constraint:** Web Share Target ONLY works on:
- Installed Android Chrome/Chromium-based browsers (WebAPK)
- Installed Edge on Android
- Does NOT work on iOS Safari — `share_target` is not supported in WebKit (confirmed by open WebKit bug #194593 and WebKit standards-positions issue #11)
- Requires PWA installation (manifest + service worker)

**Implementation approach for Phase 3 (pre-PWA):**

Since Phase 4 owns the service worker and PWA manifest (`vite-plugin-pwa`), Phase 3 should implement the **share target manifest entry** and the **service worker fetch handler logic** as a standalone file that Phase 4 will register. This avoids blocking IMPT-02 entirely while respecting Phase 4's service worker ownership.

Step 1 — Add to `public/manifest.json` (create if not exists):
```json
{
  "name": "RSVP Reader",
  "short_name": "RSVP",
  "start_url": "/",
  "display": "standalone",
  "share_target": {
    "action": "/share-target/",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
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

Step 2 — Add service worker fetch handler (in the Phase 4 service worker file, or as a separate scoped SW registered in Phase 3):
```javascript
// In service worker
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method === 'POST' && url.pathname === '/share-target/') {
    event.respondWith((async () => {
      const formData = await event.request.formData()
      const file = formData.get('pdf')
      if (file) {
        // Store file in Cache API temporarily
        const cache = await caches.open('share-target-v1')
        await cache.put('/shared-pdf', new Response(file))
        // Notify all clients
        const clients = await self.clients.matchAll({ type: 'window' })
        for (const client of clients) {
          client.postMessage({ type: 'SHARED_PDF', filename: file.name })
        }
      }
      // Redirect to app root
      return Response.redirect('/', 303)
    })())
  }
})
```

Step 3 — App listens for service worker message:
```typescript
// In App.tsx or a useEffect in EntryScreen/RSVPReader
navigator.serviceWorker?.addEventListener('message', async (event) => {
  if (event.data?.type === 'SHARED_PDF') {
    // Retrieve from cache and process via documentService
    const cache = await caches.open('share-target-v1')
    const response = await cache.match('/shared-pdf')
    if (response) {
      const blob = await response.blob()
      const file = new File([blob], event.data.filename, { type: 'application/pdf' })
      // route to documentService.parseFile(file) then navigate('/preview')
    }
  }
})
```

**Realistic scope for Phase 3:** Implement manifest entry + service worker handler stub + app-side message listener. Full share activation requires Phase 4 service worker registration. Document this dependency clearly in the plan.

### Pattern 6: TextPreview Enhancement (VIEW-03)

**What:** The existing `TextPreview` component shows a 200-word preview and word count. Phase 3 enhances it to match the user decisions: scrollable preview with fade gradient, metadata summary (filename, page count, word count, estimated reading time), and clear error state.

**Fade-at-bottom gradient:** A CSS `mask-image` gradient over the preview container:
```tsx
// Fade gradient on text preview container
<div
  className="relative overflow-hidden rounded-xl"
  style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
>
  <p>{previewText}</p>
</div>
```

**Estimated reading time calculation (Claude's discretion):** `Math.ceil(wordCount / wpm)` minutes, using the user's current WPM setting. E.g., at 250 WPM, 1000 words = 4 minutes. Display as "~4 min read" or "4–5 min read" (range based on WPM ± 20%).

**Page count:** The WASM parser already returns a `title` field. It does not currently return page count. The `ParseResult` interface (`document-service.ts`) could be extended to include `pageCount: number | null`. This requires changes to both the Rust WASM crate and the TypeScript types. **Assess at implementation time** — if page count is expensive or complex to add to the Rust parser, display "Unknown pages" gracefully. `pdf-extract` / lopdf may expose page count without expensive full parse.

**Error state:** The existing `showError` in EntryScreen auto-dismisses after 4 seconds. The TextPreview error state should be persistent (not auto-dismissing) with a "Try another file" button that navigates back to `/`. The error case on TextPreview arises if `wordList.length < 10` (already guarded in EntryScreen), so the TextPreview error path may not be reachable given existing guards — but display "No readable text found" if somehow navigated to with an empty/short word list.

### Anti-Patterns to Avoid

- **Rendering word spans as React state array:** Don't store `highlightedWordIndex` in React state and conditionally apply className in the word list render. At 10,000+ words, this re-renders the entire word list on every word advance (every 200ms at 300 WPM). Use direct DOM mutation via the ref array or a single `useRef` for the previously-highlighted element.
- **Using `scrollIntoView({ block: 'center' })` always:** Continuously centering the highlighted word creates jarring scroll behavior at normal reading speeds. Use `block: 'nearest'` — only scrolls when the word leaves the visible area.
- **Setting `opacity` via inline styles from React state:** Works but less clean than Tailwind classes. Using `transition-opacity` with class toggling gets CSS hardware acceleration for free.
- **Using `100vh` for the dual-view layout on mobile:** The `vh` unit includes browser chrome on mobile, causing the bottom of the layout to be cut off or overlap with the browser nav bar. Use `h-dvh` (dynamic viewport height) or `h-[100dvh]` with arbitrary Tailwind syntax. Tailwind 4 supports `h-dvh` natively.
- **`position: fixed` for RSVP zone with scrollable panel below:** Fixed positioning takes the element out of flow and requires the remaining content to have top padding equal to the fixed element's height. With `position: sticky` on a flex child, height calculations are automatic.
- **Not clamping font size min/max:** Without clamps, repeated `+` clicks could push font size to absurd values. Apply `Math.max(min, Math.min(max, newSize))` in setters or in the store action.
- **Assuming Web Share Target works on iOS:** iOS Safari does not support `share_target`. Do not treat IMPT-02 as covering iOS — it is Android-only. The iOS fallback is IMPT-03 (file picker), which is already implemented.
- **Scoped service worker for share target causing import failures:** If a scoped service worker is used for the share target path, ensure it does not intercept app shell requests. Use the `scope` option on `navigator.serviceWorker.register()` to limit to `/share-target/` path only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font size persistence | Manual `localStorage.getItem/setItem` in effects | Zustand `persist` with extended `partialize` | Handles hydration timing, serialization. Project already uses this pattern for `wpm`. |
| Word scroll tracking | Intersection Observer or complex visibility math | `scrollIntoView({ block: 'nearest' })` | Native API handles "is element visible?" logic internally. No manual `getBoundingClientRect` needed. |
| Manual scroll detection debouncing | Complex scroll event + velocity calculations | Simple `boolean ref + setTimeout(2000)` flag pattern | The user decision specifies "resume after a short delay" — a 2s timeout on a ref is the minimal correct solution |
| Word span highlighting (performance) | React state `highlightedIndex` causing list re-render | Direct DOM mutation via `wordRefs.current[i].style.*` or `classList` | Avoids re-rendering thousands of word spans at 300+ WPM |
| Share target file transfer SW↔page | Custom protocol or polling | `Cache API` + `client.postMessage()` | Established pattern per Chrome docs; Cache stores binary cleanly, postMessage signals presence |

**Key insight:** The word list rendering is a pure function of `wordList` (which never changes during a session). Highlight state is NOT part of the React tree's render concerns — it's a DOM mutation triggered by the scheduler. Treating it as React state creates an O(n) re-render on every word advance.

---

## Common Pitfalls

### Pitfall 1: Word Ref Array Growing Stale After Document Reset

**What goes wrong:** When the user navigates back to `/` and imports a new document, `wordList` changes. The ref array `wordRefs.current` retains entries from the old document. New renders mount new word spans but old refs may point to detached DOM nodes.

**Why it happens:** The ref array is a mutable object — React does not reset it when the component re-renders with a new `wordList`. Old indices from the previous document remain in the array.

**How to avoid:** Reset the ref array when `wordList` changes: `useEffect(() => { wordRefs.current = [] }, [wordList])`. The callback ref pattern (`ref={(el) => { wordRefs.current[i] = el }}`) will re-populate the array as the new word spans mount.

**Warning signs:** Auto-scroll jumps to wrong position, or console warnings about accessing null refs.

### Pitfall 2: `scrollIntoView` on Unmounted or Hidden Panel

**What goes wrong:** If the user is on a different route or the component is unmounted, `scrollIntoView` on a ref that references a detached DOM element throws a silent error or does nothing unexpected.

**Why it happens:** The scheduler continues to advance `currentWordIndex` in the Zustand store even if RSVPReader is not mounted. If the word panel is conditionally rendered, refs may be null.

**How to avoid:** Always null-check: `if (!el) return` before calling `el.scrollIntoView(...)`. The existing guard redirect in RSVPReader (`navigate('/')` if `wordList.length === 0`) prevents most of this, but null checks remain necessary.

### Pitfall 3: Opacity Transition Fight Between User Pause and Auto-Resume

**What goes wrong:** If playback auto-pauses (background tab) and then the user manually resumes, the opacity may flash from 50% → 100% → 50% in rapid succession during the transition, creating a flicker.

**Why it happens:** CSS `transition-opacity` takes 300ms. If `isPlaying` toggles faster than 300ms, transitions stack.

**How to avoid:** 300ms transitions are shorter than any realistic user interaction sequence. This is unlikely to be visible in practice. If it becomes an issue, increase the transition duration to 500ms or remove it — opacity change without animation is also acceptable.

### Pitfall 4: Web Share Target Manifest Entry Before Service Worker Registration

**What goes wrong:** Adding `share_target` to the manifest without a registered service worker means the PWA appears in the share sheet but crashes on receipt.

**Why it happens:** The browser registers share targets on PWA install. Without a service worker intercepting the POST to `/share-target/`, the browser tries to load that URL and gets a 404.

**How to avoid:** Either register a minimal scoped service worker in Phase 3 (scoped to `/share-target/` only) alongside the manifest entry, or defer the manifest `share_target` entry entirely to Phase 4. The safest approach for Phase 3 is to add both the manifest entry AND a scoped minimal service worker for just the share target path — this is independent of the full PWA service worker Phase 4 will add.

### Pitfall 5: `h-dvh` Not Supported in Older Mobile Browsers

**What goes wrong:** On iOS Safari 15 and Chrome Android pre-108, `dvh` is not supported. The layout falls back to `auto` height, causing the RSVP zone to not fill 40% of the viewport.

**Why it happens:** `dvh` was introduced as Baseline 2023 — most modern browsers support it but iOS 15 (still in some use) does not.

**How to avoid:** Use `h-screen` (maps to `100vh`) as a fallback before `h-dvh`. In Tailwind, `h-[40dvh]` can be paired with a JS fallback or accepted as-is since iOS 16+ (2022 release) supports `dvh`. The project's target is modern mobile browsers — this is acceptable.

```tsx
// Option: CSS custom property fallback (handles older browsers)
// In index.css: :root { --vh: 1vh; }
// Use JS to set: document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
// Then: h-[calc(40*var(--vh,1vh))]
// This is over-engineering for 2026 target support — use h-[40dvh] directly.
```

### Pitfall 6: Page Count from WASM Parser — Scope Risk

**What goes wrong:** Adding `pageCount` to `ParseResult` requires changes to: Rust WASM crate, `ParseResult` TypeScript interface, `document-service.ts`, `parser-worker.ts`, and `TextPreview.tsx`. This cascades across multiple files.

**Why it happens:** The current `ParseResult` does not include page count. lopdf (used by pdf-extract) does expose page count but requires API changes through the entire stack.

**How to avoid:** Treat `pageCount` as optional: `pageCount?: number`. If not available, display "page count unavailable." This lets Phase 3 ship without a full WASM API change. Alternatively, count pages from the word array heuristically (not reliable but avoids WASM changes).

**Recommendation:** Add `pageCount?: number | null` to `ParseResult` as an optional field. Implement it in Rust if the lopdf API is simple (it likely is: `doc.get_pages().len()`). If Rust compilation fails or adds complexity, ship with `null` and display nothing. This is Claude's discretion.

---

## Code Examples

Verified patterns from official sources and existing project conventions:

### Dual-View Layout (h-dvh + sticky + overflow-y)
```tsx
// Source: Tailwind CSS docs (h-dvh), MDN position sticky
// Project convention: dark background (gray-950), existing RSVPReader color scheme
<div className="flex flex-col h-dvh bg-gray-950 overflow-hidden">
  {/* RSVP zone: sticky top, flex-shrink-0 prevents compression */}
  <div className="h-[40dvh] flex-shrink-0 sticky top-0 z-10 bg-gray-950
                  flex flex-col items-center justify-center gap-4 px-4">
    {/* ProgressBar, ORPDisplay, PlaybackControls */}
  </div>

  {/* Divider */}
  <div className="border-t border-gray-800 flex-shrink-0" />

  {/* Text panel: fills remaining height, scrolls independently */}
  <div className="flex-1 overflow-y-auto">
    {/* word spans */}
  </div>
</div>
```

### Word Ref Array Pattern (callback ref, avoids thousands of useRef calls)
```tsx
// Source: React docs on callback refs
// Pattern: mutable array populated by callback ref on each span
const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

// Reset when wordList changes
useEffect(() => {
  wordRefs.current = new Array(wordList.length).fill(null)
}, [wordList.length])

// In render:
{wordList.map((word, i) => (
  <span
    key={i}
    ref={(el) => { wordRefs.current[i] = el }}
  >
    {word}{' '}
  </span>
))}
```

### Auto-Scroll with Manual Override
```tsx
// Source: MDN scrollIntoView docs + flag-based detection pattern
const userScrolledRef = useRef(false)
const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

// Listen for manual scroll
useEffect(() => {
  const panel = panelRef.current
  if (!panel) return
  const onScroll = () => {
    userScrolledRef.current = true
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => { userScrolledRef.current = false }, 2000)
  }
  panel.addEventListener('scroll', onScroll, { passive: true })
  return () => panel.removeEventListener('scroll', onScroll)
}, [])

// Auto-scroll on word advance
useEffect(() => {
  if (userScrolledRef.current) return
  const el = wordRefs.current[currentWordIndex]
  if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}, [currentWordIndex])
```

### Zustand Store Extension for Font Sizes (extends existing partialize)
```typescript
// Source: Zustand docs + existing rsvp-store.ts pattern
// Extends partialize: (state) => ({ wpm: state.wpm })
// to:
partialize: (state) => ({
  wpm: state.wpm,
  rsvpFontSize: state.rsvpFontSize,
  textFontSize: state.textFontSize,
}),

// New defaults:
rsvpFontSize: 72,  // ~4.5rem, matching current ORPDisplay hardcoded value
textFontSize: 16,  // text-base equivalent

// New actions:
setRsvpFontSize: (size) => set({ rsvpFontSize: Math.max(48, Math.min(120, size)) }),
setTextFontSize: (size) => set({ textFontSize: Math.max(12, Math.min(32, size)) }),
```

### Text Panel Opacity Dimming
```tsx
// Source: Tailwind CSS docs (transition-opacity, duration)
// transition-opacity + duration-300 confirmed working in Tailwind v4
<div
  className={[
    'flex-1 overflow-y-auto transition-opacity duration-300',
    isPlaying ? 'opacity-50' : 'opacity-100',
  ].join(' ')}
>
```

### TextPreview Fade-at-Bottom Gradient
```tsx
// Source: CSS mask-image pattern (standard browser API)
// Creates illusion of text fading out at bottom of preview window
<div
  className="relative overflow-hidden max-h-48"
  style={{
    maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
  }}
>
  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
    {previewText}
  </p>
</div>
```

### Estimated Reading Time Calculation
```typescript
// Source: Standard reading speed calculation convention
// Claude's discretion: using user's WPM setting
function estimatedReadTime(wordCount: number, wpm: number): string {
  const minutes = Math.ceil(wordCount / wpm)
  return minutes === 1 ? '~1 min read' : `~${minutes} min read`
}
// Usage in TextPreview: estimatedReadTime(wordList.length, wpm) where wpm from useRsvpStore
```

### Web Share Target Manifest Entry
```json
// public/manifest.json (to be created or updated)
// Source: Chrome for Developers Web Share Target docs
// Note: Both MIME type AND extension required per Chrome Android behavior
{
  "share_target": {
    "action": "/share-target/",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
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

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `100vh` for full-screen mobile layouts | `100dvh` (dynamic viewport height) | CSS Baseline 2023, Tailwind 3.4+ | Prevents layout cut-off by mobile browser chrome (address bar, nav bar) |
| `setInterval` for scroll sync | `scrollIntoView({ block: 'nearest' })` on index change | Always best practice | Native browser optimization; "nearest" avoids unnecessary scroll when word is visible |
| React state for highlight index causing full list re-render | Direct DOM mutation via refs | Community best practice for high-frequency updates | O(1) DOM operation vs O(n) re-render at 300+ WPM |
| `localStorage.getItem/setItem` directly | Zustand `persist` middleware `partialize` | Zustand 4+ | Handles hydration, serialization; project already uses this pattern |

**Deprecated/outdated:**
- Web Share Target on iOS: Still not supported as of 2026 (WebKit bug #194593 open). Do not implement iOS-specific share target.
- `vh` units for full-viewport mobile layouts: Use `dvh`. `vh` includes hidden browser chrome on mobile.

---

## Open Questions

1. **Should IMPT-02 (Web Share Target) include a Phase 3 scoped service worker, or defer SW entirely to Phase 4?**
   - What we know: Share target requires a service worker intercepting POST at `/share-target/`. Without it, the manifest entry is inert (no crash because no PWA install yet). Phase 4 owns service worker work.
   - What's unclear: Whether a scoped service worker registered only for `/share-target/` in Phase 3 would conflict with the full-app service worker Phase 4 adds.
   - Recommendation: Implement the manifest `share_target` entry in Phase 3 AND add the service worker fetch handler code as a file, but defer `navigator.serviceWorker.register()` to Phase 4. This means IMPT-02 is architecturally complete in Phase 3 but not functional until Phase 4 activates the service worker. Document this clearly in Phase 3 verification criteria.

2. **Page count from WASM parser: implement or skip?**
   - What we know: lopdf (used by pdf-extract) exposes page count via `doc.get_pages().len()`. Adding this to the Rust WASM function is ~3 lines of Rust. The TypeScript interface chain requires updates across 3 files.
   - What's unclear: Whether this cross-layer change fits Phase 3's scope without introducing regression risk in the WASM pipeline.
   - Recommendation: Implement page count as optional (`pageCount?: number | null`). Add to Rust, worker message types, and ParseResult. If it fails compilation, fall back to null with graceful UI ("–" instead of a count).

3. **Word span rendering performance at large document sizes**
   - What we know: A 100,000-word document (a novel) renders 100,000 `<span>` elements. Initial render may take 500ms-2s depending on device. Subsequent renders are fine (word list never changes).
   - What's unclear: Whether the initial render hang is acceptable UX or requires virtualization.
   - Recommendation: Implement without virtualization for Phase 3. Measure at implementation time using a large PDF. If render time exceeds 2s, add a loading skeleton and defer text panel rendering with `requestIdleCallback`. Virtualization (react-virtual/react-window) is a Phase 3+ enhancement only if needed.

4. **Manual scroll resume delay: 2 seconds appropriate?**
   - What we know: User decision specifies "auto-scroll resumes after a short delay." 2 seconds is Claude's discretion.
   - What's unclear: Whether 2 seconds feels right in practice.
   - Recommendation: Start at 2000ms. This is easy to tune at implementation time — it's a single constant.

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs — `share_target` manifest member — https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target — confirmed: requires PWA installation, experimental API, limited browser support
- Chrome for Developers — Web Share Target API — https://developer.chrome.com/docs/capabilities/web-apis/web-share-target — confirmed: service worker required for POST file handling, Cache API + postMessage pattern for page delivery
- web.dev — Receive Shared Files pattern — https://web.dev/patterns/files/receive-shared-files — confirmed: multipart/form-data, service worker intercept, Cache storage, redirect 303
- MDN Web Docs — `Element.scrollIntoView()` — https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView — confirmed: `block: 'nearest'` only scrolls when element is off-screen, `behavior: 'smooth'` for animation
- Tailwind CSS docs — height utilities — https://tailwindcss.com/docs/height — confirmed: `h-dvh` native class, arbitrary `h-[40dvh]` syntax supported
- Tailwind CSS docs — transition-property — https://tailwindcss.com/docs/transition-property — confirmed: `transition-opacity` and `duration-300` work in Tailwind v4 without breaking changes
- WebKit bug tracker — Bug #194593 — https://bugs.webkit.org/show_bug.cgi?id=194593 — confirmed: Web Share Target not implemented in WebKit/Safari as of research date
- WebKit standards-positions — Issue #11 — https://github.com/WebKit/standards-positions/issues/11 — confirmed: Apple has not committed to implementing Web Share Target

### Secondary (MEDIUM confidence)
- Tailscan blog — Tailwind CSS dynamic viewport unit classes — https://tailscan.com/blog/tailwind-css-dynamic-viewport-unit-classes — confirms `h-dvh` added in Tailwind 3.4, works in v4
- Metaview blog — Syncing a Transcript with Audio in React — https://www.metaview.ai/resources/blog/syncing-a-transcript-with-audio-in-react — confirms direct DOM mutation via refs pattern for high-frequency word highlighting; avoids React re-render cycle

### Tertiary (LOW confidence)
- Multiple WebSearch results on manual scroll detection — general community pattern (boolean flag + setTimeout) — consistent across multiple sources but no authoritative spec reference

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed; no new packages needed
- Architecture patterns: HIGH — dual-view layout, scrollIntoView, Zustand partialize, all verified against official docs and existing project conventions
- Web Share Target (IMPT-02): HIGH (implementation) / MEDIUM (iOS limitation) — confirmed by WebKit bug tracker and Chrome docs; iOS non-support verified by multiple authoritative sources
- Pitfalls: HIGH — DOM mutation vs React state pitfall, dvh vs vh on mobile, web share target SW requirement all verified against official sources
- Word panel performance at large documents: LOW — no authoritative data on span count performance in React 19; recommendation to measure at implementation time

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (30 days — Web Share Target iOS status unlikely to change; other APIs stable)
