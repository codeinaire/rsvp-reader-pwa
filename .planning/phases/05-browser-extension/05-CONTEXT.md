# Phase 5: Browser Extension - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Package the existing RSVP app as a browser extension for Chrome and Firefox. A content script extracts the current page's article text using Readability.js and passes it to the existing React RSVP reader, which renders in a side panel. The PWA remains unchanged — the extension complements it for desktop web reading.

Safari is explicitly deferred to a future phase (requires Xcode + Apple Developer account).

</domain>

<decisions>
## Implementation Decisions

### Reader container
- Opens as a **side panel** (Chrome `sidePanel` API; Firefox `sidebar_action`)
- Panel **stays open across page navigations** — user explicitly closes it
- On open with no extracted text: show empty state with a **"Read this page" button** — no auto-extraction
- Reuse the **same compiled React app** (not a separate extension UI) — the extension bundles and loads the existing build
- Text handoff from content script to side panel via **`chrome.storage`** (session or local)
- Settings (WPM, theme) stored via **`chrome.storage.sync`** — syncs across browser profiles

### Text extraction
- Use **Readability.js** (Mozilla's article extraction library) — same algorithm as Firefox Reader View
- If Readability finds no article: show **"No article found on this page"** — do not fall back to full body text
- **Title is prepended** to the reading session (becomes the first words read)
- Output is **plain text only**, identical to what the user would get by pasting manually — no formatting hints preserved

### Browser scope
- Target: **Chrome and Firefox** in this phase
- **Single MV3 manifest** with browser-specific overrides (Firefox uses `browser_specific_settings`)
- Both browsers get a native panel: Chrome `sidePanel` + Firefox `sidebar_action`
- Extension lives in a **separate `/extension` directory** with its own build output (distinct from the PWA `/dist`)

### Activation trigger
- **Toolbar icon** toggles the side panel open/closed
- **Keyboard shortcut** defined in manifest (e.g., `Ctrl+Shift+R` / `Cmd+Shift+R`) — user-customizable via browser settings
- **Right-click context menu** on selected text: "Read selection with RSVP Reader" — sends just the selection to the reader (bypasses Readability)
- **No toolbar badge** — icon is always the same; Readability does not run proactively on page load

### Claude's Discretion
- Exact `chrome.storage` key names and storage timing (when extraction result is written vs read)
- Build tooling integration (how Vite or a separate bundler produces the extension package)
- Service worker vs background script internals
- WASM loading strategy inside the extension context (may differ from PWA)
- Exact keyboard shortcut default (Ctrl+Shift+R is a suggestion; researcher should check for conflicts)

</decisions>

<specifics>
## Specific Ideas

- The reader in the side panel should be the same experience as the PWA — same components, same engine, no stripped-down version
- Right-click → "Read selection" and toolbar icon → "Read this page" are two distinct activation paths that both end up at the same RSVP reader
- The extension must load unpacked in Chrome DevTools and Firefox about:debugging for dev testing (phase success criterion)

</specifics>

<deferred>
## Deferred Ideas

- Safari Web Extension — requires Xcode + Apple Developer account ($99/yr); defer to a dedicated Safari phase
- Proactive article detection badge on toolbar icon — adds background content script on all pages; out of scope for v1

</deferred>

---

*Phase: 05-browser-extension*
*Context gathered: 2026-02-26*
