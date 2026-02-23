# Architecture Research

**Domain:** RSVP Speed Reading PWA (TypeScript + React + Rust WASM)
**Researched:** 2026-02-23
**Confidence:** HIGH (WASM pattern grounded in workspace's rust-image-tools reference implementation; Web Share Target and RSVP state patterns from training data, marked where lower confidence)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         React UI Layer                           │
│                                                                  │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │  ImportScreen  │  │   RSVPDisplay    │  │   TextScroller   │ │
│  │  (file / share)│  │ (focal word view)│  │ (full text below)│ │
│  └───────┬────────┘  └────────┬─────────┘  └────────┬─────────┘ │
│          │                   │                      │            │
│  ┌───────▼───────────────────▼──────────────────────▼─────────┐ │
│  │                     RSVPController                          │ │
│  │   (Zustand store: wordList, index, wpm, isPlaying, timer)  │ │
│  └───────────────────────────┬─────────────────────────────────┘ │
│                              │                                   │
│  ┌───────────────────────────▼─────────────────────────────────┐ │
│  │                   DocumentService (JS)                      │ │
│  │   Facade: routes file types → WASM worker or JS fallback    │ │
│  └───────────────────────────┬─────────────────────────────────┘ │
├──────────────────────────────┼───────────────────────────────────┤
│              Web Worker thread (dedicated, module type)          │
│                              │                                   │
│  ┌───────────────────────────▼─────────────────────────────────┐ │
│  │                    parser-worker.ts                         │ │
│  │  init() → loads WASM module once, then handles messages     │ │
│  │                                                             │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │        Rust WASM (wasm-bindgen output)              │   │ │
│  │  │   parse_pdf(bytes) → ParseResult                    │   │ │
│  │  │   parse_epub(bytes) → ParseResult                   │   │ │
│  │  │   parse_docx(bytes) → ParseResult                   │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────┤
│                       PWA Infrastructure                           │
│                                                                    │
│  ┌──────────────────┐  ┌────────────────────────────────────────┐ │
│  │  service-worker  │  │          manifest.json                 │ │
│  │  (Workbox/manual)│  │  share_target.action = /share          │ │
│  │  handles POST    │  │  share_target.enctype = multipart      │ │
│  │  /share requests │  │  share_target.params.files[0]          │ │
│  └──────────────────┘  └────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `ImportScreen` | Accepts file drop/picker, handles share target URL params, reads shared file from cache, initiates parse | `DocumentService` |
| `RSVPDisplay` | Renders the ORP-split focal word: left text, red focal char, right text, all aligned to fixed horizontal position | `RSVPController` (Zustand) |
| `TextScroller` | Full-document text view with current word highlighted and scrolled into view; dimmed while playing | `RSVPController` (Zustand) |
| `RSVPControls` | Play/pause button, WPM slider, jump forward/back buttons | `RSVPController` (Zustand) |
| `RSVPController` | Zustand store; owns `wordList`, `currentIndex`, `wpm`, `isPlaying`, `intervalRef`; drives the tick loop via `setInterval` | `RSVPDisplay`, `TextScroller`, `RSVPControls` |
| `DocumentService` | JS facade that sends parse requests to the WASM worker; returns typed `ParseResult` (words array + metadata); handles worker readiness promise | `parser-worker.ts` via `Worker.postMessage` |
| `parser-worker.ts` | Web Worker that loads the Rust WASM module on creation, then dispatches parse messages to Rust functions | Rust WASM module via `wasm-bindgen` imports |
| Rust WASM module | Compiled `rlib` + `cdylib`; exposes `parse_pdf`, `parse_epub`, `parse_docx`, `extract_plain_text`; returns structured data via `serde-wasm-bindgen` | Called synchronously from inside the Worker |
| `service-worker.ts` | Intercepts the POST to `/share` from the OS share sheet; caches the shared file bytes (or URL) into Cache API; redirects to main app | IndexedDB/Cache API, main app URL |

---

## WASM Integration Pattern

This pattern is directly derived from the working `rust-image-tools` implementation in this workspace.

### Pattern: WASM in a Dedicated Web Worker

**What:** Rust WASM is loaded inside a Web Worker (not the main thread). The main thread holds a `DocumentService` class that wraps the worker with a Promise-based request/response API keyed by numeric IDs.

**Why this over alternatives:**
- WASM `init()` is synchronous and blocks for 50-300ms on first load. Running it on the main thread causes a visible jank on the UI.
- Heavy parse operations (PDF: multi-MB files) must not block React rendering.
- Web Workers naturally isolate crashes — if the WASM module throws, the main thread survives.

**Build tooling:** `wasm-pack build --target bundler` produces the JS glue + `.wasm` file into `pkg/`. Vite's WASM plugin (or `vite-plugin-wasm`) handles `.wasm` imports with `?init` URL scheme inside the Worker module.

### Rust WASM Cargo.toml Requirements

```toml
[package]
name = "rsvp-parser"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]  # cdylib = WASM output; rlib = for unit tests

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1", features = ["derive"] }
serde-wasm-bindgen = "0.6"

# PDF parser (pure Rust, no C deps needed for WASM)
pdf-extract = "0.7"          # or lopdf for lower-level access

# EPUB parser
epub = "2"                   # or zip + xml parsing

# DOCX parser
docx-rs = "0.4"              # or zip + xml for simple extraction

[profile.release]
opt-level = "s"
lto = true
strip = true
```

**Important:** Disable any features that use OS threads (rayon, tokio multi-thread). WASM runs single-threaded by default.

### Rust WASM Public API (lib.rs pattern)

```rust
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct ParseResult {
    pub words: Vec<String>,
    pub total_word_count: usize,
    pub title: Option<String>,
}

#[wasm_bindgen]
pub fn parse_pdf(input: &[u8]) -> Result<JsValue, JsError> {
    let result = pdf::extract(input)
        .map_err(|e| JsError::new(&e.to_string()))?;
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&e.to_string()))
}

#[wasm_bindgen]
pub fn parse_epub(input: &[u8]) -> Result<JsValue, JsError> { ... }

#[wasm_bindgen]
pub fn parse_docx(input: &[u8]) -> Result<JsValue, JsError> { ... }
```

### Worker Message Protocol (TypeScript)

```typescript
// worker-types.ts

export enum ParseMessageType {
  Init = "init",
  ParseDocument = "parse_document",
  Error = "error",
}

// File type discriminant used to pick the correct Rust function
export type DocFormat = "pdf" | "epub" | "docx" | "txt";

// Main thread → Worker
export interface ParseRequest {
  type: ParseMessageType.ParseDocument;
  id: number;
  format: DocFormat;
  data: Uint8Array;  // Raw file bytes, transferred (zero-copy)
}

// Worker → Main thread
export interface ParseSuccessResponse {
  type: ParseMessageType.ParseDocument;
  id: number;
  success: true;
  words: string[];
  totalWordCount: number;
  title: string | null;
  parseMs: number;
}
```

### DocumentService (main thread facade)

```typescript
// document-service.ts

class DocumentService {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private readonly pending = new Map<number, { resolve, reject }>();
  private nextId = 1;

  constructor() {
    this.worker = new Worker(
      new URL('./parser-worker.ts', import.meta.url),
      { type: 'module' }
    );
    this.ready = new Promise((resolve, reject) => { /* init handshake */ });
    this.worker.onmessage = this.handleMessage.bind(this);
  }

  async parseFile(file: File): Promise<ParseResult> {
    await this.ready;
    const format = detectFormat(file.name, file.type);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const id = this.nextId++;
    // Transfer bytes to Worker (zero-copy, O(1))
    this.worker.postMessage({ type: 'parse_document', id, format, data: bytes }, [bytes.buffer]);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }
}

export const documentService = new DocumentService();
```

### Data Passing Rules

| Data Type | How to Pass | Why |
|-----------|-------------|-----|
| File bytes (input) | `Uint8Array` with `transfer: [bytes.buffer]` | Zero-copy; avoids doubling memory for multi-MB PDFs |
| Parsed result (output) | `serde_wasm_bindgen::to_value` → JS object | Structured, type-safe; avoids JSON stringify overhead |
| Errors | `JsError` → caught as JS `Error` | wasm-bindgen native error propagation |

---

## Text Processing Pipeline

```
Raw File (File object or URL string)
         │
         ▼
  [detectFormat()]           — inspect MIME type + file extension
         │
         ├─ PDF  → DocumentService.parseFile() ──────────────────────────┐
         ├─ EPUB → DocumentService.parseFile() ──────────────────────────┤
         ├─ DOCX → DocumentService.parseFile() ──────────────────────────┤
         └─ TXT  → DocumentService.parseText() (JS, no WASM needed) ─────┤
                                                                          │
                                    Worker receives Uint8Array            │
                                    Rust parse_*() called synchronously   │
                                    Returns ParseResult { words: [...] }  │
                                                                          │
         ◄─────────────────────────────────────────────────────────────── ┘
         │
         ▼
  [tokenizeWords(rawText)]   — split on whitespace, strip punctuation
         │                       for word count, preserve original for display
         ▼
  word[] array in JS memory  — flat array, index 0..N
         │
         ▼
  [RSVPController store]     — wordList: string[], currentIndex: number
         │
         ▼
  [computeORP(word)]         — ORP index ≈ max(0, floor(word.length * 0.3))
         │                       returns { left, focal, right }
         ▼
  [RSVPDisplay component]    — renders three <span> segments
                                left: grey, focal: red/bold, right: grey
                                all positioned with CSS so focal char
                                is always at screen center-x
```

### Tokenization Details

The tokenizer runs in JS (not Rust), because it is fast enough and benefits from being in the same thread as the React state:

```typescript
function tokenize(text: string): string[] {
  // Split on whitespace, filter empties
  return text
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);
}
```

Punctuation is NOT stripped from display words — "Hello," displays as "Hello," — because stripping changes the reading rhythm. The ORP calculation skips leading/trailing punctuation characters when finding the focal point.

### ORP Calculation

```typescript
// ORP = Optimal Recognition Point
// ~30% from start of word (not 50%), per Spritz research
function computeORP(word: string): { left: string; focal: string; right: string } {
  // Strip leading/trailing punctuation for index calculation
  const stripped = word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
  const orpIndex = Math.max(0, Math.floor(stripped.length * 0.3));

  // Map index back to original word (accounting for leading punctuation)
  const leadingPunct = word.length - word.trimStart().length;
  const actualIndex = leadingPunct + orpIndex;

  return {
    left: word.slice(0, actualIndex),
    focal: word[actualIndex] ?? word[0],
    right: word.slice(actualIndex + 1),
  };
}
```

---

## Web Share Target Architecture

**Confidence:** MEDIUM (training data; verified against MDN spec structure as of knowledge cutoff August 2025)

### How It Works

The Web Share Target API is a PWA capability that lets the OS "share" content (URLs, files) into an installed PWA the same way it shares to native apps. It requires:

1. An entry in `manifest.json` declaring the share target endpoint
2. A service worker that intercepts the POST request the browser sends to that endpoint
3. App logic that reads the shared data from the cache or URL params on load

### manifest.json Configuration

```json
{
  "name": "RSVP Reader",
  "short_name": "RSVP",
  "display": "standalone",
  "start_url": "/",
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        {
          "name": "file",
          "accept": [
            "application/pdf",
            "application/epub+zip",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
          ]
        }
      ]
    }
  }
}
```

### Service Worker: Share Intercept Flow

```
OS Share Sheet → Browser → POST /share (multipart) → Service Worker intercepts
                                                              │
                                                              ▼
                                                  Cache the file in Cache API
                                                  under a known key (e.g. "pending-share")
                                                              │
                                                              ▼
                                                  Return redirect to "/?shared=1"
                                                              │
                                                              ▼
                                                  Main app loads, checks ?shared=1
                                                  Reads file from cache
                                                  Sends to DocumentService.parseFile()
                                                  Clears the cache entry
```

### Service Worker Code Pattern

```typescript
// service-worker.ts
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/share' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }
  // ... normal cache-first strategy for assets
});

async function handleShareTarget(request: Request): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const sharedUrl = formData.get('url') as string | null;

  if (file) {
    // Store file bytes in Cache API for main thread to retrieve
    const cache = await caches.open('share-target-v1');
    const response = new Response(file, {
      headers: { 'Content-Type': file.type, 'X-Filename': file.name }
    });
    await cache.put('/pending-share', response);
    return Response.redirect('/?shared=file', 303);
  }

  if (sharedUrl) {
    // Store URL as text for JS-side fetch + readability extraction
    const cache = await caches.open('share-target-v1');
    await cache.put('/pending-share-url', new Response(sharedUrl));
    return Response.redirect('/?shared=url', 303);
  }

  return Response.redirect('/', 303);
}
```

### App Startup: Consuming the Share

```typescript
// In ImportScreen component, on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const sharedType = params.get('shared');

  if (sharedType === 'file') {
    consumeSharedFile();
  } else if (sharedType === 'url') {
    consumeSharedUrl();
  }
}, []);

async function consumeSharedFile() {
  const cache = await caches.open('share-target-v1');
  const response = await cache.match('/pending-share');
  if (!response) return;
  await cache.delete('/pending-share');
  const blob = await response.blob();
  const file = new File([blob], response.headers.get('X-Filename') ?? 'document', {
    type: blob.type
  });
  const result = await documentService.parseFile(file);
  rsvpStore.setWordList(result.words);
}
```

### Platform Support

| Platform | Support | Notes |
|----------|---------|-------|
| Android + Chrome/Edge | Full | File sharing works reliably; primary target |
| Desktop Chrome/Edge | Full | Installed PWA receives shares from OS |
| iOS Safari | Partial | Share Target not supported as of iOS 17; file import via picker is the fallback |
| Firefox | None | No Web Share Target support; file import only |

---

## RSVP State Management

### State Shape (Zustand store)

```typescript
interface RSVPState {
  // Document state
  wordList: string[];          // Flat array of all words from parsed document
  documentTitle: string | null;

  // Playback state
  currentIndex: number;        // Index into wordList of the word currently displayed
  isPlaying: boolean;
  wpm: number;                 // Words per minute, user-controlled (default: 300)

  // Internal (not in store, managed as ref)
  // intervalRef: React.MutableRefObject<number | null>

  // Actions
  setWordList: (words: string[], title?: string) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setWpm: (wpm: number) => void;
  jumpBackward: (n?: number) => void; // default: jump back 5 words
  jumpForward: (n?: number) => void;
  seek: (index: number) => void;      // jump to specific word (text panel click)
  reset: () => void;
}
```

### Tick Loop Pattern

The timing loop uses `setInterval` managed via a `useRef` (not inside Zustand). This is important: Zustand stores should not hold mutable refs. The interval drives `currentIndex` increments.

```typescript
// In RSVPController component (or custom hook useRSVPPlayback)
const intervalRef = useRef<number | null>(null);
const { wpm, isPlaying, currentIndex, wordList, pause } = useRSVPStore();

useEffect(() => {
  if (!isPlaying) {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return;
  }

  const msPerWord = 60_000 / wpm;
  intervalRef.current = window.setInterval(() => {
    useRSVPStore.getState().incrementIndex();
  }, msPerWord);

  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, [isPlaying, wpm]);  // Restart interval when WPM changes mid-play
```

**Why `setInterval` over `requestAnimationFrame`:**
- RAF runs at 60fps (16ms). A word at 300 WPM = 200ms interval. RAF would fire 12 times per word, requiring explicit time tracking and more complexity.
- `setInterval` with a ms-per-word period is simpler and sufficient. Drift is acceptable (10-20ms jitter per word is imperceptible).

**Why `useRSVPStore.getState()` inside the interval callback (not from closure):**
- Closure over `currentIndex` captures a stale value. Reading from `getState()` always gets the current store value.

### WPM Range and Constraints

```typescript
const WPM_MIN = 100;
const WPM_MAX = 1500;
const WPM_DEFAULT = 300;

// When WPM changes: clear old interval, start new one
// The useEffect dependency on `wpm` handles this automatically
```

---

## Component Breakdown

### Module Map

```
src/
├── components/
│   ├── ImportScreen/
│   │   ├── ImportScreen.tsx     # File drop, file picker, share target consumer
│   │   └── ImportScreen.css
│   ├── RSVPDisplay/
│   │   ├── RSVPDisplay.tsx      # ORP word renderer (three spans, fixed focal point)
│   │   └── RSVPDisplay.css      # CSS for focal-point horizontal lock
│   ├── RSVPControls/
│   │   ├── RSVPControls.tsx     # Play/pause, WPM slider, jump buttons
│   │   └── RSVPControls.css
│   └── TextScroller/
│       ├── TextScroller.tsx     # Full text, highlight current word, dim overlay
│       └── TextScroller.css
│
├── store/
│   └── rsvp-store.ts            # Zustand store (RSVPState + actions)
│
├── hooks/
│   ├── useRSVPPlayback.ts       # setInterval timing loop, subscribes to store
│   └── useShareTarget.ts        # Checks URL params on mount, fetches from cache
│
├── services/
│   └── document-service.ts     # DocumentService class (WASM worker facade)
│
├── workers/
│   ├── parser-worker.ts        # Web Worker: loads WASM, handles parse messages
│   └── worker-types.ts         # Shared message type definitions
│
├── lib/
│   ├── orp.ts                  # computeORP(word) → {left, focal, right}
│   ├── tokenize.ts             # tokenize(text) → string[]
│   └── format-detect.ts        # detectFormat(filename, mimeType) → DocFormat
│
├── pwa/
│   └── service-worker.ts       # Share Target handler + asset caching
│
└── App.tsx                     # Route: ImportScreen → RSVPView
```

### Rust Crate Structure

```
rsvp-parser/          # Cargo workspace root
├── Cargo.toml
└── crates/
    └── rsvp-parser/
        ├── Cargo.toml
        └── src/
            ├── lib.rs            # wasm-bindgen exports (parse_pdf, parse_epub, parse_docx)
            ├── pdf.rs            # PDF text extraction
            ├── epub.rs           # EPUB text extraction
            ├── docx.rs           # DOCX text extraction
            └── types.rs          # ParseResult struct (Serialize/Deserialize)
```

---

## Data Flow Summary

### Flow 1: File Import

```
User drops file onto ImportScreen
    ↓
ImportScreen reads File object
    ↓
documentService.parseFile(file)
    ↓ (async, crosses thread boundary)
parser-worker.ts receives { type, id, format, data: Uint8Array }
    ↓
Rust parse_pdf(data) / parse_epub(data) / parse_docx(data) — synchronous in Worker
    ↓
ParseResult { words: string[], title } serialized via serde-wasm-bindgen → JsValue
    ↓
postMessage(result) back to main thread
    ↓
documentService resolves Promise with ParseResult
    ↓
rsvpStore.setWordList(result.words, result.title)
    ↓
React re-renders: ImportScreen → RSVPView
```

### Flow 2: Share Target (Android/Desktop)

```
User: share webpage from Chrome → "RSVP Reader"
    ↓
Browser POSTs to /share with { url: "..." }
    ↓
Service Worker intercepts, stores URL in cache, redirects to /?shared=url
    ↓
App loads, useShareTarget hook detects ?shared=url
    ↓
Fetch the URL, extract readable text (JS: Readability.js or equivalent)
    ↓
tokenize(text) → string[]
    ↓
rsvpStore.setWordList(words)
```

### Flow 3: RSVP Playback

```
User clicks Play
    ↓
rsvpStore.play() → isPlaying = true
    ↓
useRSVPPlayback hook: isPlaying changed, starts setInterval(msPerWord)
    ↓
Each tick: rsvpStore.incrementIndex()
    ↓
RSVPDisplay re-renders: reads wordList[currentIndex], calls computeORP(word)
    ↓
Three <span> elements rendered with focal char in red at fixed screen position
    ↓
TextScroller re-renders: scrolls current word into view, word highlighted
    ↓
When currentIndex reaches wordList.length - 1: rsvpStore.pause(), show done state
```

---

## Recommended Project Structure: Build Order

Build components in dependency order — lower layers must exist before higher layers consume them.

| Phase | What to Build | Why This Order |
|-------|--------------|----------------|
| 1 | Rust WASM crate + wasm-pack build | Everything above depends on parsing working |
| 2 | `parser-worker.ts` + `document-service.ts` + `worker-types.ts` | WASM integration layer; verify file → words pipeline works end-to-end with a test PDF |
| 3 | `tokenize.ts`, `orp.ts`, `format-detect.ts` | Pure functions; easy to unit test, needed by display layer |
| 4 | Zustand store `rsvp-store.ts` | State container; needed by all UI components |
| 5 | `RSVPDisplay` + `RSVPControls` + `useRSVPPlayback` | Core reading experience; can test with hardcoded word list |
| 6 | `TextScroller` | Secondary display, depends on store |
| 7 | `ImportScreen` (file picker + drag/drop path) | Ties document service to the store |
| 8 | PWA manifest + `service-worker.ts` + `useShareTarget` | Share target is last; requires the full pipeline to be working |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Calling WASM on the Main Thread

**What people do:** Import and call wasm-bindgen functions directly in React components or service files.

**Why it's wrong:** WASM `init()` blocks the main thread for 50-300ms on cold load. Heavy parse operations (multi-MB PDFs) can block for 500ms+, freezing the UI and causing dropped frames.

**Do this instead:** Always run WASM inside a Web Worker. Expose it via the `DocumentService` Promise API.

### Anti-Pattern 2: Storing `setInterval` ID in Zustand

**What people do:** Put `intervalRef` or timer IDs inside the Zustand store's state object.

**Why it's wrong:** Mutable browser timer IDs are not serializable state. Storing them in Zustand triggers unnecessary re-renders and makes time-travel debugging impossible.

**Do this instead:** Keep the interval as a `useRef` inside a dedicated `useRSVPPlayback` hook. Zustand stores only serializable state (`isPlaying`, `wpm`, `currentIndex`).

### Anti-Pattern 3: JSON Serialization for WASM Data Exchange

**What people do:** Use `JSON.stringify` / `JSON.parse` to pass data between JS and WASM, or to transfer data between the Worker and main thread.

**Why it's wrong:** For a 200,000-word book, the words array is ~1MB+ as JSON. Stringify/parse adds 10-50ms overhead on top of parsing. Transferring the byte buffer for the input file doubles memory usage.

**Do this instead:**
- Input file bytes: Use `transfer: [bytes.buffer]` to transfer (not copy) the `ArrayBuffer` to the Worker.
- WASM output: Use `serde-wasm-bindgen` to go directly from Rust struct to JS object without JSON serialization.

### Anti-Pattern 4: Storing the Full Word Array in React State

**What people do:** `useState<string[]>` for the word list in a component.

**Why it's wrong:** A 50,000-word book would trigger React reconciliation on every index change during playback, because React compares the array reference. Even if words don't change, the component tree under the array re-renders.

**Do this instead:** Store `wordList` in Zustand. `RSVPDisplay` uses a `useRSVPStore(s => s.wordList[s.currentIndex])` selector — a primitive string selector that only causes the display component to re-render when the specific word changes. Other components hold independent selectors.

### Anti-Pattern 5: ORP at the Literal Middle Character

**What people do:** Calculate focal character as `Math.floor(word.length / 2)`.

**Why it's wrong:** The Spritz ORP is not the midpoint. It's ~30% from the start. "Hello" midpoint = index 2 ('l'); ORP = index 1 ('e'). The 50% alignment causes sub-optimal visual recognition and looks wrong compared to user expectations from Spritz.

**Do this instead:** Use `Math.max(0, Math.floor(wordLength * 0.3))` as the ORP index.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| React main thread ↔ WASM Worker | `postMessage` + structured clone / transfer | One-way data flow; Worker is stateless between calls |
| `DocumentService` ↔ React components | Promise API (async/await) | Service is a singleton; components call it, don't subscribe |
| Zustand store ↔ React components | `useRSVPStore(selector)` subscriptions | Selectors keep re-renders minimal |
| Service Worker ↔ main app | Cache API + URL query params | Simple, no direct messaging needed for v1 |

### No External Services

This is a fully client-side app for v1. No APIs, no backend, no auth. All computation happens in the browser.

---

## Scalability Considerations

This is a local-first PWA. "Scale" means handling larger documents, not more users.

| Concern | Approach |
|---------|---------|
| Very large files (>20MB PDF) | Stream parse in Rust if possible; show progress via Worker messages |
| Long books (100k+ words) | Flat `string[]` handles 100k words fine in JS heap; ~4MB at 40 chars/word avg |
| WPM precision at high speeds | At 1500 WPM, interval = 40ms. `setInterval` jitter ±5ms is ~12% error. Acceptable for v1; use `performance.now()` drift correction if needed later |
| iOS fallback | File picker (`<input type="file">`) covers iOS since share target is unsupported |

---

## Sources

- **rust-image-tools (this workspace):** `/Users/nousunio/Repos/Learnings/claude-code/rust-image-tools/` — direct source for WASM Worker pattern, `wasm-bindgen` setup, `serde-wasm-bindgen` usage, message transfer pattern. Confidence: HIGH (inspected source).
- **wasm-bindgen crate:** `wasm-bindgen = "0.2"` (from Cargo.toml in workspace). Confidence: HIGH.
- **Web Share Target API (MDN/web.dev spec):** Training data, knowledge cutoff August 2025. manifest.json `share_target` structure and service worker intercept pattern. Confidence: MEDIUM — verify manifest field names against current MDN before implementation.
- **Zustand pattern:** Training data. Confidence: MEDIUM — verify selector API with current Zustand docs.
- **RSVP ORP algorithm:** Based on published Spritz research (~30% from word start). Confidence: MEDIUM — the 30% figure is widely cited in RSVP literature.

---

*Architecture research for: RSVP Speed Reading PWA*
*Researched: 2026-02-23*
