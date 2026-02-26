# Phase 5: Browser Extension - Research

**Researched:** 2026-02-26
**Domain:** Cross-browser extension (Chrome MV3 + Firefox MV3), side panel API, Readability.js content script, Vite extension build
**Confidence:** MEDIUM-HIGH (Chrome APIs HIGH via official docs; Firefox compatibility MEDIUM via MDN + verified sources; WASM in side panel HIGH via official Chrome docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Reader container:** Opens as a side panel (Chrome `sidePanel` API; Firefox `sidebar_action`). Panel stays open across page navigations — user explicitly closes it. On open with no extracted text: show empty state with a "Read this page" button — no auto-extraction. Reuse the same compiled React app (not a separate extension UI). Text handoff from content script to side panel via `chrome.storage` (session or local). Settings (WPM, theme) stored via `chrome.storage.sync`.
- **Text extraction:** Use Readability.js (@mozilla/readability). If Readability finds no article: show "No article found on this page" — do not fall back to full body text. Title is prepended to the reading session. Output is plain text only.
- **Browser scope:** Chrome and Firefox only. Single MV3 manifest with browser-specific overrides (Firefox uses `browser_specific_settings`). Extension lives in a separate `/extension` directory with its own build output.
- **Activation trigger:** Toolbar icon toggles side panel. Keyboard shortcut defined in manifest. Right-click context menu on selected text: "Read selection with RSVP Reader". No toolbar badge.

### Claude's Discretion

- Exact `chrome.storage` key names and storage timing
- Build tooling integration (how Vite produces the extension package)
- Service worker vs background script internals
- WASM loading strategy inside the extension context (may differ from PWA)
- Exact keyboard shortcut default (Ctrl+Shift+R is a suggestion; researcher should check for conflicts)

### Deferred Ideas (OUT OF SCOPE)

- Safari Web Extension — requires Xcode + Apple Developer account; defer to a dedicated Safari phase
- Proactive article detection badge on toolbar icon — out of scope for v1
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXT-01 | User can click the extension icon on any webpage in Chrome or Firefox and start reading the page in the RSVP reader — no copy-paste required | Chrome sidePanel API + Firefox sidebar_action + content script → chrome.storage → side panel React app |
| EXT-02 | The extension packages and loads the existing WASM parser and React RSVP components without modification to the core reading engine | Extension pages (side panel) support WASM with `wasm-unsafe-eval` CSP; vite-plugin-web-extension handles build; existing React app reused as side panel entry point |
| EXT-03 | The extension can be loaded unpacked in Chrome DevTools and Firefox about:debugging for development testing | vite-plugin-web-extension supports HMR + unpacked load in both browsers via `TARGET=chrome vite build` and `TARGET=firefox vite build` |
| EXT-04 | Text extraction from a standard article page produces the same word array as pasting the text manually would | @mozilla/readability 0.6.0 in content script: `document.cloneNode(true)` → `new Readability(clone).parse()` → `textContent` → same `tokenize()` function as PWA |
</phase_requirements>

---

## Summary

Phase 5 packages the existing React/WASM RSVP reader as a Chrome and Firefox browser extension. The core mechanic is: a content script clones the live DOM, runs Readability.js on the clone to extract article text, writes the extracted text to `chrome.storage.session`, and the side panel React app reads from storage to populate its `useRsvpStore`. The existing WASM PDF parsing pipeline is irrelevant to the extension's text extraction path — Readability runs in the content script on the live DOM, no WASM involved.

The build strategy is a separate `/extension` directory with its own `vite.config.ts` using `vite-plugin-web-extension` (v4.x by aklinker1). This plugin reads `manifest.json`, discovers all entry points (background service worker, content script, side panel HTML), and builds them as a Vite multi-entry output. The same React components, Zustand store, and Tailwind CSS from the PWA are imported directly — no duplication. The side panel's React tree mounts into `panel.html` and initializes from `chrome.storage` instead of from URL params or IndexedDB hydration.

The critical platform difference: Chrome uses `sidePanel` permission + `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` in the service worker, while Firefox uses `sidebar_action` manifest key + `browser.sidebarAction.toggle()` in the background script's action click listener. These are incompatible APIs; `vite-plugin-web-extension`'s browser-template manifest system handles building the correct variant per target. The `chrome.storage.session` API is available in both browsers (Firefox added support, confirmed via MDN August 2025), but content script access requires `chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" })` called once from the service worker.

**Primary recommendation:** Use `vite-plugin-web-extension` (aklinker1, v4.x) in `/extension` with a browser-template manifest. Content script runs Readability.js (pure JS, no WASM). Side panel is the existing React app compiled as an extension page with `wasm-unsafe-eval` CSP for the WASM PDF parser worker.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite-plugin-web-extension | 4.x (aklinker1) | Extension build tooling: manifest-driven multi-entry Vite build, HMR, Chrome/Firefox multi-target | Most mature, actively maintained, TypeScript-first, supports React + any framework, v4 is current |
| @mozilla/readability | 0.6.0 (already in package.json) | Article extraction in content script | Already a project dependency; same library as Firefox Reader View; works on live DOM clone |
| webextension-polyfill | 0.12.x | Unified `browser.*` API namespace for Chrome + Firefox | Chrome uses `chrome.*`; Firefox uses `browser.*` (Promise-based); polyfill normalizes both |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cross-env | 7.x | Cross-platform `TARGET=chrome`/`TARGET=firefox` env vars in npm scripts | Required for Windows build scripts |
| @types/chrome | latest | TypeScript types for chrome.* APIs | Extension TypeScript compilation |
| @types/firefox-webext-browser | latest | TypeScript types for browser.* (Firefox) | If using webextension-polyfill with TypeScript |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vite-plugin-web-extension (aklinker1) | samrum/vite-plugin-web-extension | samrum's version is less actively maintained; aklinker1 v4 has better HMR and Firefox MV3 support |
| vite-plugin-web-extension (aklinker1) | WXT framework | WXT is heavier abstraction; overkill when we already have a Vite project; vite-plugin-web-extension slots into existing Vite config |
| webextension-polyfill | Manual browser detection | Polyfill eliminates all `typeof chrome !== 'undefined'` guards; promise API is cleaner |
| chrome.storage.session | chrome.storage.local | session is cleared when browser closes (correct for ephemeral extracted text); local persists unnecessarily |

**Installation:**
```bash
# In /extension directory:
npm install --save-dev vite-plugin-web-extension cross-env @types/chrome
npm install webextension-polyfill @mozilla/readability
```

Note: `@mozilla/readability` is already in the root `package.json`. The extension can either reference the root `node_modules` (workspace) or install its own copy.

---

## Architecture Patterns

### Recommended Project Structure

```
/extension/
├── manifest.json            # Browser-template manifest (uses {{chrome}}/{{firefox}} prefixes)
├── package.json             # Own scripts: build:chrome, build:firefox, dev:chrome, dev:firefox
├── vite.config.ts           # Uses vite-plugin-web-extension, wasm(), tailwindcss()
├── tsconfig.json            # Extends root tsconfig; adds chrome/browser globals
├── src/
│   ├── background.ts        # Service worker (Chrome) / background script (Firefox)
│   ├── content-script.ts    # Runs on web pages: Readability extraction → chrome.storage
│   ├── panel/
│   │   ├── panel.html       # Side panel entry point HTML
│   │   ├── panel.tsx        # React root: mounts existing App components, reads from storage
│   │   └── panel.css        # Tailwind entry (same as PWA main.css)
│   └── context-menu.ts      # (optional) If context-menu handler needs its own module
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── dist-chrome/             # Chrome build output (gitignored)
    dist-firefox/            # Firefox build output (gitignored)
```

The panel imports existing PWA components directly:
```typescript
// extension/src/panel/panel.tsx
import RSVPReader from '../../../src/components/RSVPReader/RSVPReader'
import TextPreview from '../../../src/components/TextPreview/TextPreview'
import EntryScreen from '../../../src/components/EntryScreen/EntryScreen'
import { useRsvpStore } from '../../../src/store/rsvp-store'
```

### Pattern 1: Browser-Template Manifest

**What:** Single `manifest.json` with `{{chrome}}` and `{{firefox}}` prefix keys. `vite-plugin-web-extension` strips irrelevant keys at build time.
**When to use:** Always — this is the lock-in-aware approach that avoids two separate manifests diverging.

```json
{
  "manifest_version": 3,
  "name": "RSVP Reader",
  "version": "1.0.0",
  "description": "Read any webpage faster, one word at a time.",

  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },

  "action": {
    "default_icon": "icons/icon-48.png",
    "default_title": "RSVP Reader"
  },

  "background": {
    "{{chrome}}.service_worker": "src/background.ts",
    "{{firefox}}.scripts": ["src/background.ts"]
  },

  "{{chrome}}.side_panel": {
    "default_path": "src/panel/panel.html"
  },
  "{{firefox}}.sidebar_action": {
    "default_panel": "src/panel/panel.html",
    "default_title": "RSVP Reader",
    "default_icon": "icons/icon-48.png"
  },

  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["src/content-script.ts"],
    "run_at": "document_idle"
  }],

  "permissions": [
    "{{chrome}}.sidePanel",
    "storage",
    "activeTab",
    "contextMenus",
    "scripting"
  ],

  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Open RSVP Reader"
    }
  },

  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  },

  "web_accessible_resources": [{
    "resources": ["*.wasm"],
    "matches": ["<all_urls>"]
  }],

  "{{firefox}}.browser_specific_settings": {
    "gecko": {
      "id": "rsvp-reader@extension",
      "strict_min_version": "109.0"
    }
  }
}
```

### Pattern 2: Content Script — Extract and Store

**What:** Content script clones the live DOM (required — Readability modifies the DOM it receives), runs Readability, tokenizes the result using the same `tokenize()` function as the PWA, and writes to `chrome.storage.session`.
**When to use:** On user activation (toolbar icon click triggers `chrome.tabs.sendMessage` from background, or on `chrome.runtime.onMessage` in content script).

```typescript
// Source: @mozilla/readability README + MDN content script docs
// extension/src/content-script.ts
import { Readability } from '@mozilla/readability'
import { tokenize } from '../../../src/lib/tokenize'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_PAGE') {
    extractAndStore()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true // keep channel open for async response
  }

  if (message.type === 'EXTRACT_SELECTION') {
    const selected = window.getSelection()?.toString().trim() ?? ''
    if (selected.length > 0) {
      const words = tokenize(selected)
      chrome.storage.session.set({
        'rsvp-ext-words': words,
        'rsvp-ext-title': 'Selected text'
      })
      sendResponse({ ok: true })
    } else {
      sendResponse({ ok: false, error: 'No text selected' })
    }
    return false
  }
})

async function extractAndStore() {
  // CRITICAL: clone before passing to Readability — it modifies the DOM
  const documentClone = document.cloneNode(true) as Document
  const reader = new Readability(documentClone)
  const article = reader.parse()

  if (!article || !article.textContent?.trim()) {
    await chrome.storage.session.set({
      'rsvp-ext-words': [],
      'rsvp-ext-title': null,
      'rsvp-ext-error': 'no-article'
    })
    return
  }

  const words = tokenize(article.textContent)
  const title = article.title?.trim() || document.title || location.hostname

  await chrome.storage.session.set({
    'rsvp-ext-words': words,
    'rsvp-ext-title': title,
    'rsvp-ext-error': null
  })
}
```

### Pattern 3: Background Service Worker — Side Panel + Context Menu

**What:** Service worker handles toolbar icon → open side panel, context menu registration, and relaying messages to content scripts. For Firefox, uses `browser.sidebarAction.toggle()` instead of `chrome.sidePanel.open()`.

```typescript
// Source: Chrome sidePanel docs + MDN sidebarAction docs
// extension/src/background.ts
import browser from 'webextension-polyfill'

// Enable side panel toggle on action icon click (Chrome only — Firefox uses sidebar_action natively)
// @ts-ignore — chrome.sidePanel may not exist in Firefox types
if (typeof chrome !== 'undefined' && chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

  // Allow content scripts to access session storage
  chrome.storage.session.setAccessLevel({
    accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
  })
}

// Firefox: toggle sidebar on action click
// @ts-ignore — browser.sidebarAction may not exist in Chrome types
if (typeof browser !== 'undefined' && browser.sidebarAction) {
  browser.action.onClicked.addListener(() => {
    browser.sidebarAction.toggle()
  })
}

// Register context menu on installation
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'read-selection',
    title: 'Read selection with RSVP Reader',
    contexts: ['selection']
  })
})

// Handle context menu click: send EXTRACT_SELECTION to content script
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'read-selection' && tab?.id) {
    browser.tabs.sendMessage(tab.id, { type: 'EXTRACT_SELECTION' })
  }
})
```

### Pattern 4: Side Panel React App — Read from Storage

**What:** The side panel is the existing React app with a custom entry point that reads initial state from `chrome.storage.session` instead of IndexedDB/URL hydration.

```typescript
// extension/src/panel/panel.tsx
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useRsvpStore } from '../../../src/store/rsvp-store'
import RSVPReader from '../../../src/components/RSVPReader/RSVPReader'
import TextPreview from '../../../src/components/TextPreview/TextPreview'
import EntryScreen from '../../../src/components/EntryScreen/EntryScreen'
import '../../../src/index.css'

type PanelView = 'entry' | 'preview' | 'read'

function PanelApp() {
  const [view, setView] = useState<PanelView>('entry')
  const { setDocument, wordList } = useRsvpStore()

  useEffect(() => {
    // Listen for new extracted content written by content script
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'session') return
      if (changes['rsvp-ext-words']) {
        const words = changes['rsvp-ext-words'].newValue as string[]
        const title = changes['rsvp-ext-title']?.newValue as string | null
        if (words && words.length >= 10) {
          setDocument(words, title)
          setView('preview')
        }
      }
    })

    // Also read current storage value on mount (in case panel opens after extraction)
    chrome.storage.session.get(['rsvp-ext-words', 'rsvp-ext-title']).then((data) => {
      const words = data['rsvp-ext-words'] as string[] | undefined
      const title = data['rsvp-ext-title'] as string | null
      if (words && words.length >= 10) {
        setDocument(words, title)
        setView('preview')
      }
    })
  }, [setDocument])

  if (view === 'entry') return <EntryScreen onReadPage={handleReadPage} />
  if (view === 'preview') return <TextPreview onStart={() => setView('read')} />
  return <RSVPReader />

  function handleReadPage() {
    // Ask content script to extract current page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_PAGE' })
      }
    })
  }
}

createRoot(document.getElementById('root')!).render(<PanelApp />)
```

### Pattern 5: Vite Config for Extension

```typescript
// extension/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import tailwindcss from '@tailwindcss/vite'
import webExtension from 'vite-plugin-web-extension'

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    tailwindcss(),
    webExtension({
      browser: process.env.TARGET ?? 'chrome',
      manifest: 'manifest.json',
    }),
  ],
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
  optimizeDeps: {
    exclude: ['rsvp-parser'],
  },
  // Output to different dirs per browser
  build: {
    outDir: process.env.TARGET === 'firefox' ? 'dist-firefox' : 'dist-chrome',
  },
})
```

### Anti-Patterns to Avoid

- **Running Readability on the un-cloned `document`:** Readability mutates the DOM it receives. Always `document.cloneNode(true)` first — the page will break visually if you pass the live document.
- **Using `chrome.storage.sync` for extracted text:** `sync` has an 8 KB max item size. A 5,000-word article is ~30 KB. Use `session` (10 MB limit) for text handoff; keep `sync` only for WPM/theme settings.
- **Spawning the WASM parser Web Worker from a content script:** Content scripts run in an isolated world without extension page privileges. The WASM worker is only needed for PDF parsing (not needed in the extension — extension only extracts web pages via Readability). Keep WASM/Worker in the side panel page context where it works.
- **Using `Ctrl+Shift+R` as the keyboard shortcut:** This is the hard-reload shortcut in both Chrome and Firefox — it cannot be overridden by an extension and creates immediate confusion. Use `Ctrl+Shift+Y` or `Alt+Shift+R` instead.
- **Calling `chrome.sidePanel.open()` without a user gesture:** The `open()` method requires a user gesture (click, keyboard shortcut). Cannot be called from a message handler that doesn't trace back to a user action.
- **Injecting the full React bundle as a content script:** Content scripts have limited CSP and cannot run React's reconciler reliably. The side panel is the correct React mounting point — content scripts must be lightweight JS only.
- **Forgetting `setAccessLevel` for `chrome.storage.session`:** By default, content scripts cannot read or write `chrome.storage.session`. Call `chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })` once in the service worker on install.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-entry Vite extension build | Custom Rollup config for each entry point | `vite-plugin-web-extension` | Handles manifest parsing, entry discovery, HMR, browser targeting automatically |
| Article text extraction from DOM | Custom DOM traversal and heuristics | `@mozilla/readability` (already installed) | Readability handles thousands of article layouts; hand-rolled heuristics fail on edge cases |
| Chrome/Firefox API normalization | `typeof chrome !== 'undefined'` guards everywhere | `webextension-polyfill` | Eliminates callback-vs-promise differences; same code in both browsers |
| Browser-specific manifest variants | Two separate manifest.json files | `vite-plugin-web-extension` browser templates | Single source of truth; divergence between two files causes bugs |

**Key insight:** The "don't hand-roll" principle here applies especially to the build system. Vite doesn't natively understand extension manifests — every file in `manifest.json` needs to be an entry point in the Rollup build. `vite-plugin-web-extension` automates this discovery and is the only sane path.

---

## Common Pitfalls

### Pitfall 1: Readability Modifies the Live DOM

**What goes wrong:** Passing `document` directly to `new Readability(document).parse()` in the content script removes elements from the actual web page, breaking the site visually.
**Why it happens:** Readability strips ads, nav, sidebars, footers from whatever document it receives — this is expected behavior but destructive on the live DOM.
**How to avoid:** Always `const clone = document.cloneNode(true) as Document` and pass the clone.
**Warning signs:** Web page visually breaks after extraction (elements disappear).

### Pitfall 2: `chrome.storage.session` Not Accessible from Content Script by Default

**What goes wrong:** Content script calls `chrome.storage.session.set(...)` and it silently fails or throws "Access to storage item denied."
**Why it happens:** MV3 restricts session storage to trusted extension contexts (service worker, extension pages) by default.
**How to avoid:** In background service worker on install: `chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })`.
**Warning signs:** `chrome.runtime.lastError` in the content script with access denied message; panel never updates.

### Pitfall 3: Ctrl+Shift+R Hard-Reload Conflict

**What goes wrong:** The keyboard shortcut does nothing (Chrome/Firefox intercepts it before the extension sees it).
**Why it happens:** `Ctrl+Shift+R` is the browser's built-in hard-reload shortcut and cannot be overridden by extensions.
**How to avoid:** Use `Ctrl+Shift+Y` (available in both browsers) or `Alt+Shift+R`. Check Chrome's `chrome://extensions/shortcuts` page and Firefox's `about:addons` shortcut list.
**Warning signs:** Shortcut works in `chrome://extensions/shortcuts` UI but does nothing on actual web pages.

### Pitfall 4: WASM Worker Path Resolution in Extension Context

**What goes wrong:** `new Worker(new URL('../workers/parser-worker.ts', import.meta.url), { type: 'module' })` fails in the side panel because the URL resolves incorrectly relative to the extension's origin (`chrome-extension://[id]/...`).
**Why it happens:** `import.meta.url` in an extension page is `chrome-extension://[id]/panel/panel.js`. The relative URL must still resolve correctly after Vite bundles the extension.
**How to avoid:** `vite-plugin-web-extension` handles this if `parser-worker.ts` is listed as a `web_accessible_resource` or if Vite's worker bundling emits it as a named chunk. Verify that the worker file appears in the extension output and that `web_accessible_resources` in `manifest.json` covers it.
**Warning signs:** Worker throws `NetworkError` or `Failed to fetch` on creation; console error referencing extension origin.

### Pitfall 5: Side Panel Not Opening on Toolbar Click (Chrome)

**What goes wrong:** Clicking the extension icon does nothing; side panel never opens.
**Why it happens:** In Chrome, `setPanelBehavior({ openPanelOnActionClick: true })` must be called before the user clicks. This must happen in the service worker (which can wake on installation or first use), not in the panel page.
**How to avoid:** Call `chrome.sidePanel.setPanelBehavior(...)` at the top level of `background.ts` so it runs whenever the service worker wakes.
**Warning signs:** No side panel appears; no errors in the background service worker console.

### Pitfall 6: Firefox MV3 Sidebar Needs Explicit `action` Listener

**What goes wrong:** Clicking the extension toolbar icon in Firefox opens a popup or does nothing, instead of toggling the sidebar.
**Why it happens:** Firefox's `sidebar_action` doesn't automatically bind to the toolbar icon click — you must call `browser.sidebarAction.toggle()` from an `action.onClicked` listener.
**How to avoid:** In `background.ts`, register `browser.action.onClicked.addListener(() => browser.sidebarAction.toggle())` for Firefox only (detected via `typeof browser.sidebarAction !== 'undefined'`).
**Warning signs:** Extension works in Chrome but toolbar icon click does nothing in Firefox.

### Pitfall 7: `chrome.storage.sync` Item Size Limit

**What goes wrong:** Writing a long extracted word array to `chrome.storage.sync` throws `QUOTA_BYTES_PER_ITEM quota exceeded`.
**Why it happens:** `sync` has an 8,192-byte limit per item. A typical article is tens of thousands of characters.
**How to avoid:** Use `chrome.storage.session` (10 MB limit) for extracted text. Only store WPM (`number`) and theme (`string`) in `sync`.
**Warning signs:** `chrome.runtime.lastError` with quota message; panel never receives the word list.

### Pitfall 8: Content Script Not Injected on Restricted Pages

**What goes wrong:** Extraction fails on `chrome://`, `about:`, `file://`, and extension pages.
**Why it happens:** Content scripts are blocked from chrome:// pages and new tab pages by browser policy. `matches: ["<all_urls>"]` doesn't include these.
**How to avoid:** Catch `tabs.sendMessage` errors; show "This page cannot be read" in the panel empty state.
**Warning signs:** `Error: Could not establish connection. Receiving end does not exist.` when sending message to tab.

---

## Code Examples

Verified patterns from official sources:

### Chrome sidePanel — Enable Toggle on Icon Click

```typescript
// Source: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
// In background service worker:
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))
```

### Chrome sidePanel — Open Programmatically (requires user gesture)

```typescript
// Source: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
// From a context menu handler (which counts as a user gesture):
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  await chrome.sidePanel.open({ tabId: tab.id })
})
```

### Firefox sidebarAction Toggle

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction/toggle
browser.action.onClicked.addListener(() => {
  browser.sidebarAction.toggle()
})
```

### chrome.storage.session — Set Access Level for Content Scripts

```typescript
// Source: https://developer.chrome.com/docs/extensions/reference/api/storage
// In background service worker, call once:
chrome.storage.session.setAccessLevel({
  accessLevel: chrome.storage.AccessLevel.TRUSTED_AND_UNTRUSTED_CONTEXTS
})
```

### chrome.storage.session — Listen for Changes in Side Panel

```typescript
// Source: https://developer.chrome.com/docs/extensions/reference/api/storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes['rsvp-ext-words']) {
    const newWords = changes['rsvp-ext-words'].newValue as string[]
    // Update React store
  }
})
```

### Readability.js in Content Script

```typescript
// Source: https://github.com/mozilla/readability — README
import { Readability } from '@mozilla/readability'

// MUST clone — Readability mutates the document it receives
const documentClone = document.cloneNode(true) as Document
const reader = new Readability(documentClone)
const article = reader.parse()
// article.textContent — plain text, article.title — page title
```

### vite-plugin-web-extension Build Commands

```json
// extension/package.json scripts
{
  "scripts": {
    "dev:chrome": "TARGET=chrome vite",
    "dev:firefox": "TARGET=firefox vite",
    "build:chrome": "TARGET=chrome vite build",
    "build:firefox": "TARGET=firefox vite build"
  }
}
```

### Manifest: Browser-Template Key Syntax

```json
// Fields prefixed with {{chrome}} appear only in Chrome build
// Fields prefixed with {{firefox}} appear only in Firefox build
{
  "background": {
    "{{chrome}}.service_worker": "src/background.ts",
    "{{firefox}}.scripts": ["src/background.ts"]
  }
}
```

### content_security_policy for WASM in Extension Pages

```json
// manifest.json — required for WASM in side panel worker
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MV2 background.js (persistent) | MV3 service worker (event-driven, sleeps) | Chrome 2022; Firefox MV3 ~2024 | Service worker may sleep between events; don't store in-memory state — use `chrome.storage.session` |
| `chrome.browserAction` (MV2) | `chrome.action` (MV3) | MV3 | Unified action API; `browser_action` and `page_action` merged |
| `unsafe-eval` for WASM | `wasm-unsafe-eval` directive | Chrome 103 / Firefox 102 | WASM is now permitted without `unsafe-eval`; use the specific directive |
| Single manifest per browser | Browser-template manifests | `vite-plugin-web-extension` v2+ | One file, browser-prefix syntax, builds emit correct variants |
| MV2 `browser_action` in Firefox | MV3 `action` with `sidebar_action` | Firefox MV3 support ~2024 | `browser_action` deprecated in Firefox MV3 from Firefox 118+ |

**Deprecated/outdated:**
- `browser_style` in `sidebar_action`: Deprecated in Firefox 118 (MV3). Omit this key.
- `applications` manifest key: Renamed to `browser_specific_settings`. Use the new name.
- Persistent background scripts (`"persistent": true`) in MV2: Not available in MV3.

---

## Open Questions

1. **Does `webextension-polyfill` correctly normalize `browser.sidebarAction` for Chrome (where it doesn't exist)?**
   - What we know: The polyfill normalizes `chrome.*` → `browser.*` for standard APIs. `sidebarAction` is Firefox-only.
   - What's unclear: Whether the polyfill stubs or throws when `browser.sidebarAction` is called in Chrome.
   - Recommendation: In background.ts, guard all `sidebarAction` calls with `typeof browser.sidebarAction !== 'undefined'` regardless of polyfill behavior.

2. **Does the existing WASM parser Web Worker path (`new URL('../workers/parser-worker.ts', import.meta.url)`) work unmodified inside the extension side panel?**
   - What we know: Vite resolves worker URLs at build time from `import.meta.url`. In an extension, the origin is `chrome-extension://[id]`. The relative path must still resolve correctly.
   - What's unclear: Whether `vite-plugin-web-extension` correctly emits the worker file as a separate chunk and whether `web_accessible_resources` needs to list it.
   - Recommendation: Test this early in Wave 1 (extension scaffold task). If the worker path breaks, the fallback is to not use the WASM PDF parser in the extension — the extension only needs Readability (pure JS) for web page extraction.

3. **Does `chrome.storage.session` need to be polyfilled for Firefox?**
   - What we know: MDN confirms Firefox supports `browser.storage.session` (page last modified August 2025). The `webextension-polyfill` maps `chrome.*` → `browser.*`.
   - What's unclear: Exact minimum Firefox version for `storage.session`. Firefox's MV3 minimum is ~109.
   - Recommendation: Set `strict_min_version: "109.0"` in `browser_specific_settings.gecko` and test manually in Firefox after building.

4. **Can the extension's side panel share the PWA's `localStorage`-backed Zustand store (for WPM persistence)?**
   - What we know: Extension pages have their own storage origin (`chrome-extension://[id]`), separate from the PWA's origin. `localStorage` in the side panel reads/writes extension-origin storage, not the PWA's localStorage.
   - What's unclear: Nothing — they are definitely separate storage origins.
   - Recommendation: The side panel should use `chrome.storage.sync` for WPM/theme (user-decided). Implement a thin adapter that reads/writes `chrome.storage.sync` in the panel context, bypassing the Zustand `persist` middleware which uses `localStorage`. Or override the `storage` option in `createJSONStorage` to point to a chrome.storage adapter.

5. **What keyboard shortcut is safe?**
   - What we know: `Ctrl+Shift+R` / `Cmd+Shift+R` = hard reload — BLOCKED in both browsers. Extension shortcuts must use `Ctrl` or `Alt` as base modifier.
   - Recommendation: Use `Ctrl+Shift+Y` (Windows/Linux) / `Cmd+Shift+Y` (Mac) — not reserved by Chrome or Firefox. Alternatively `Alt+Shift+R`. Make this Claude's discretion to finalize in the build task.

---

## Sources

### Primary (HIGH confidence)

- https://developer.chrome.com/docs/extensions/reference/api/sidePanel — sidePanel API, `setPanelBehavior`, `open()` method, user gesture requirement
- https://developer.chrome.com/docs/extensions/reference/api/storage — storage quota limits, `setAccessLevel`, `onChanged`
- https://developer.chrome.com/docs/extensions/mv3/manifest/content_security_policy/ — `wasm-unsafe-eval` CSP directive
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sidebar_action — Firefox sidebar_action properties
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings — Firefox extension ID requirements
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction — `sidebarAction.toggle()` API
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts — content script capabilities and isolation
- https://github.com/mozilla/readability — Readability.js API: `cloneNode` requirement, `parse()` return shape
- https://vite-plugin-web-extension.aklinker1.io/ — v4 plugin capabilities, browser template manifests

### Secondary (MEDIUM confidence)

- https://vite-plugin-web-extension.aklinker1.io/guide/supporting-multiple-browsers.html — browser template manifest syntax `{{chrome}}/{{firefox}}` confirmed in official docs
- MDN `storage.session` (August 2025) — Firefox supports `browser.storage.session`
- Chrome docs: `sidePanel` available from Chrome 114; `setPanelBehavior` available; `open()` requires user gesture (Chrome 116+)

### Tertiary (LOW confidence, needs validation)

- `Ctrl+Shift+Y` not reserved — inferred from official shortcut lists + search results; should be verified by loading a test extension in both browsers
- `vite-plugin-web-extension` WASM compatibility — `vite-plugin-wasm` is listed as compatible in the plugin docs but no explicit WASM extension example found; treat as LOW until validated in spike

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against official docs and npm current versions
- Chrome sidePanel API: HIGH — official Chrome developer docs
- Firefox sidebar_action: HIGH — MDN official docs
- WASM in extension pages: HIGH — official Chrome CSP docs confirm `wasm-unsafe-eval`
- `vite-plugin-web-extension` browser template syntax: HIGH — verified in official guide
- `chrome.storage.session` access level: HIGH — Chrome API reference
- Firefox `storage.session` support: MEDIUM — MDN confirms, but exact version threshold not pinned
- WASM worker path in extension context: LOW — needs empirical validation in Wave 1 spike task
- Keyboard shortcut `Ctrl+Shift+Y` availability: MEDIUM — inferred from browser shortcut lists, not exhaustively tested

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable APIs; Chrome extension APIs are stable, Firefox MV3 is maturing)
