# Phase 4: PWA + Web Share Target - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the app installable to home screen/desktop, fully offline-capable after installation, and reachable via the OS share sheet on Android and desktop Chrome. Users can share a webpage URL or PDF directly into the app. iOS users use the existing file picker and paste paths — no Share Target on iOS, no degraded experience either.

</domain>

<decisions>
## Implementation Decisions

### URL Extraction
- Client-side fetch + Readability library (Mozilla's or equivalent) — no server-side proxy
- On CORS block or parse failure: show a clear error message explaining why it failed, then offer the paste input as a fallback so the user can still read the content
- After successful extraction: show preview first (extracted text, word count, detected title) — same flow as PDF import — user taps Play to start RSVP
- Extract both title (page title or Open Graph title) and article body; title becomes the document name shown in preview

### Offline Scope
- After installation, the app shell loads and the last-imported document is fully readable offline
- Last document persisted across app closes (localStorage or IndexedDB) — not session-only
- WASM bundle pre-cached with the app shell at install time — not lazy-cached on first use
- New imports (URL or file) require a connection; PDF file picker technically works offline since the file is local (Claude's discretion on whether to explicitly support this)
- Update strategy: new service worker waits until all tabs close, then activates — update on next launch

### Share Target Flow
- Register Web Share Target for both URL/text shares and PDF file shares
- When app opens via share sheet: show a dedicated loading screen with the URL visible ("Fetching article from example.com…") — not just a spinner
- After extraction: land on preview screen (same as normal import flow)
- If user cancels/taps back from preview: land on the import screen (not close the app)
- iOS users: no special guidance needed — existing import screen already shows file picker and paste options clearly

### Install Prompt UX
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

</decisions>

<specifics>
## Specific Ideas

- The share-via-URL flow should feel seamless: user shares from browser → app opens → sees what's being fetched → gets a preview → hits Play. Minimal friction.
- CORS failure fallback to paste should feel like a graceful handoff, not an error dead-end — the user can always get content in via paste even if auto-extraction fails.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-pwa-web-share-target*
*Context gathered: 2026-02-25*
