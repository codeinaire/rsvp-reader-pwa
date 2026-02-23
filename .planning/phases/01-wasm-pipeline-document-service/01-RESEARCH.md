# Phase 1: WASM Pipeline + Document Service - Research

**Researched:** 2026-02-23
**Domain:** Rust-to-WASM compilation pipeline, PDF text extraction, Vite + Web Worker WASM integration
**Confidence:** MEDIUM-HIGH (WASM Worker pattern HIGH via workspace reference; PDF crate WASM compat MEDIUM-LOW due to active issues; JS stack versions verified against npm/crates.io)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### App Entry Screen
- Import is the hero action — file picker/drag-and-drop zone is the primary CTA
- Share Target (sharing from mobile browser) is the #1 priority for the overall product — entry screen design should anticipate it even though it ships in Phase 4
- Paste text is secondary — accessible but not prominent (copy-paste is friction-heavy on mobile)
- Basic header: app name + settings icon at top, import content below
- System default theme (matches OS light/dark preference)
- Back button in the reader returns to the entry screen; entry screen is not destroyed

#### Loading & Parse Feedback
- WASM initialization: silent — UI just works, import button disabled until ready, no spinner or message
- PDF processing: spinner over the import area while processing
- Long-running PDF (5+ seconds): add a patience message after ~3 seconds ("Large file, this may take a moment...")
- Cancel button visible during PDF processing — user can abort mid-parse
- Error messages: actionable — message + suggestion (e.g., "This PDF can't be read — it may be scanned or image-based. Try a different PDF or paste the text instead")
- Errors auto-dismiss after a few seconds
- Entry screen resets to fresh state each visit — no persisted error state

#### Text Preview Screen
- Shows: first paragraph of extracted text (quality check) + word count at top
- Read-only — user cannot edit extracted text
- "Start Reading" button at the top, above the preview text
- In Phase 1 (no RSVP yet): "Start Reading" navigates to a placeholder RSVP screen to make the phase testable end-to-end

### Claude's Discretion
- Exact visual design, color palette, typography (within system default theme constraint)
- Specific spinner/loading animation style
- Auto-dismiss timing (a few seconds = ~3-4s is fine)
- Drag-and-drop visual feedback details

### Deferred Ideas (OUT OF SCOPE)
- Share Target (share webpage URL from browser) — Phase 4
- Paste text as a prominent import option — reconsidered; paste is in scope as IMPT-04 but should not be the hero action per user preference
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOCF-01 | User can import and read PDF files (text-layer PDFs; scanned/image PDFs show a clear unsupported message) | PDF crate spike protocol, pdf-extract 0.10.0 + lopdf wasm_js feature, pdfium-render fallback, empty-text detection pattern |
| IMPT-04 | User can paste raw text directly into the app and begin reading it immediately via RSVP | Plain-text path in DocumentService bypasses WASM entirely; tokenize() in JS on main thread; no spike needed |
</phase_requirements>

---

## Summary

Phase 1 establishes the foundational WASM pipeline and delivers two user-visible features: paste-text import and text-layer PDF import. The paste path is trivial — no WASM required, pure JS tokenization. The PDF path is the high-risk unknown: `pdf-extract 0.10.0` depends on `lopdf 0.38` with the `wasm_js` feature enabled, which theoretically targets `wasm32-unknown-unknown`, but lopdf's WASM compilation has known dependency issues (getrandom 0.3.x, simd-adler32 in no_std) that are still open as of late October 2025. The phase must begin with a time-boxed spike to validate whether `wasm-pack build --target bundler` succeeds for pdf-extract before committing to implementation.

The WASM Worker pattern is well-proven by the workspace's `rust-image-tools` reference implementation (Parcel, not Vite, but the Rust/Worker side is identical). The RSVP project uses Vite 7 (the current stable as of Feb 2026, not Vite 6 as originally assumed). `vite-plugin-wasm` supports Vite 2–7 and the Worker must be configured in both `plugins` and `worker.plugins`. The wasm-pack target is `--target bundler` for Vite (not `--target web` as used in the reference implementation) — this is a critical distinction.

The text preview screen, entry screen UI, and placeholder RSVP screen are also in scope. These are straightforward React + Tailwind 4.2 components. The focus of research is the WASM pipeline; UI components follow patterns from the architecture research.

**Primary recommendation:** Spike pdf-extract WASM compilation first (time-boxed to 2 hours). If it compiles and produces readable text from a test PDF, proceed. If it fails, fall back to pdfium-render (WASM-first design, pre-compiled binary available, higher fidelity but larger bundle). Do not proceed to implementation until the spike decision is documented.

---

## Standard Stack

### Core — Verified Versions (2026-02-23)

| Library | Verified Version | Purpose | Source |
|---------|-----------------|---------|--------|
| Vite | 7.3.1 (current stable) | Build tool + dev server | vite.dev/releases |
| React | 19.2.4 | UI framework | react.dev |
| TypeScript | ^5.x | Type safety + WASM generated types | verified via npm |
| wasm-pack | 0.14.0 (Jan 2025) | Rust-to-WASM toolchain | github.com/rustwasm/wasm-pack |
| wasm-bindgen | 0.2.111 (Feb 2026) | Rust↔JS FFI glue | crates.io |
| vite-plugin-wasm | ^3.x (supports Vite 2–7) | WASM ESM integration in Vite | github.com/Menci/vite-plugin-wasm |
| vite-plugin-top-level-await | 1.6.0 | Top-level await polyfill | npm |
| Zustand | 5.0.11 | State management | npm |
| Tailwind CSS | ^4.2.0 | Utility-first styling | npm |
| @tailwindcss/vite | ^4.2.0 | First-party Vite plugin (no PostCSS) | npm |

### Rust Crates — Verified Versions

| Crate | Verified Version | Purpose | WASM Confidence | Source |
|-------|-----------------|---------|-----------------|--------|
| wasm-bindgen | 0.2.111 | JS FFI | HIGH | crates.io |
| serde | 1.x | Serialization | HIGH | crates.io |
| serde-wasm-bindgen | 0.6.x | Rust struct → JsValue | HIGH | crates.io, used in workspace ref |
| pdf-extract | 0.10.0 (Oct 2025) | PDF text extraction | MEDIUM-LOW | crates.io API |
| lopdf | 0.39.0 (Jan 2026) | PDF manipulation (dep of pdf-extract) | LOW-MEDIUM | crates.io API |
| epub | 2.1.5 (Oct 2025) | EPUB parsing | MEDIUM | crates.io API |

### Supporting Libraries (Phase 1 UI)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-progress | ^1.x | Loading indicator | PDF processing spinner |
| vite-plugin-pwa | ^0.21+ | PWA support (needed even in Phase 1 for manifest) | Optional in Phase 1; add if PWA baseline needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdf-extract | pdfium-render | Higher fidelity, WASM-first design; larger binary (~5-40MB); requires pre-compiled WASM binary download |
| pdf-extract | PDF.js (Mozilla) | JS library, no Rust; mature and battle-tested; breaks pure-Rust architecture decision |
| vite-plugin-wasm | Manual fetch/instantiate | More control, more complexity; plugin handles edge cases |
| `--target bundler` | `--target web` | `--target web` needed if using threads; bundler is correct for Vite without threads |

**Installation:**
```bash
# Create Vite 7 + React + TypeScript project
npm create vite@latest rsvp-reader -- --template react-ts

# WASM support
npm install -D vite-plugin-wasm vite-plugin-top-level-await

# UI stack
npm install zustand
npm install -D @tailwindcss/vite
npm install @radix-ui/react-progress

# wasm-pack (as devDependency so CI can use npm-installed version)
npm install -D wasm-pack
```

```bash
# Rust toolchain
rustup target add wasm32-unknown-unknown
```

---

## Architecture Patterns

### Recommended Project Structure

```
rsvp-reader/
├── rsvp-parser/               # Rust WASM crate (Cargo workspace)
│   ├── Cargo.toml             # [workspace] root + [profile.release] settings
│   └── crates/
│       └── rsvp-parser/
│           ├── Cargo.toml     # crate-type = ["cdylib", "rlib"]
│           └── src/
│               ├── lib.rs     # #[wasm_bindgen] exports only
│               ├── pdf.rs     # PDF extraction logic
│               ├── epub.rs    # EPUB extraction logic
│               └── types.rs   # ParseResult struct (Serialize/Deserialize)
│
└── src/                       # Vite React app
    ├── workers/
    │   ├── parser-worker.ts   # Web Worker: loads WASM once, handles parse messages
    │   └── worker-types.ts    # Shared TypeScript message type definitions
    ├── services/
    │   └── document-service.ts # Main-thread facade: Promise API over Worker
    ├── lib/
    │   ├── tokenize.ts        # tokenize(text: string): string[] — pure function
    │   └── format-detect.ts   # detectFormat(name, mime): DocFormat
    ├── components/
    │   ├── EntryScreen/
    │   │   └── EntryScreen.tsx # File drop + file picker + paste text (secondary)
    │   ├── TextPreview/
    │   │   └── TextPreview.tsx # First paragraph + word count + "Start Reading" button
    │   └── RSVPPlaceholder/
    │       └── RSVPPlaceholder.tsx # Stub RSVP screen (makes phase end-to-end testable)
    ├── store/
    │   └── rsvp-store.ts      # Zustand store: wordList, documentTitle (minimal for Phase 1)
    └── App.tsx                # Route: EntryScreen → TextPreview → RSVPPlaceholder
```

### Pattern 1: Vite 7 + WASM + Web Worker Configuration

**What:** Both `plugins` and `worker.plugins` must include the WASM plugins. Without `worker.plugins`, the WASM import inside the Worker module fails at build time.

**When to use:** Always, for any Vite project loading WASM inside a Web Worker.

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    tailwindcss(),
  ],
  worker: {
    // CRITICAL: WASM plugins must also be in worker.plugins
    // Without this, wasm imports inside the Worker fail
    plugins: () => [wasm(), topLevelAwait()],
  },
  // Prevent Vite from pre-bundling the WASM pkg (it can't handle .wasm)
  optimizeDeps: {
    exclude: ['rsvp-parser'],
  },
})
```

**Source:** github.com/Menci/vite-plugin-wasm README (verified Feb 2026)

### Pattern 2: wasm-pack Build — Target Bundler (NOT Web)

**What:** Use `--target bundler` (the default) for Vite, not `--target web`. The reference workspace uses `--target web` with Parcel, which is correct for Parcel. Vite with `vite-plugin-wasm` expects the `bundler` target output format.

**When to use:** All wasm-pack builds for Vite projects.

```bash
# Correct for Vite
wasm-pack build rsvp-parser/crates/rsvp-parser --target bundler --release

# Reference workspace uses this (correct for Parcel, NOT for Vite)
wasm-pack build crates/image-converter --target web --release
```

**Key difference from reference workspace:** The `rust-image-tools` project uses Parcel and `--target web`. RSVP Reader uses Vite and must use `--target bundler`.

### Pattern 3: Rust Crate Cargo.toml for WASM Size Optimization

**What:** These settings must be in place from the start. Adding them after feature-complete Rust code is harder.

```toml
# rsvp-parser/Cargo.toml (workspace root)
[workspace]
members = ["crates/rsvp-parser"]
resolver = "2"

[profile.release]
opt-level = "z"          # Optimize for size (not "s" — "z" is smaller, slightly slower)
lto = true               # Link-time optimization (removes dead code across crates)
codegen-units = 1        # Single codegen unit for better LTO
panic = "abort"          # No unwinding machinery — saves ~20% binary size
strip = true             # Strip debug symbols from binary

[workspace.lints.clippy]
unwrap_used = "deny"
expect_used = "deny"
panic = "deny"
```

```toml
# rsvp-parser/crates/rsvp-parser/Cargo.toml
[package]
name = "rsvp-parser"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]  # cdylib = WASM; rlib = cargo test

[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz", "--enable-bulk-memory"]  # Run wasm-opt with size + bulk-memory

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1", features = ["derive"] }
serde-wasm-bindgen = "0.6"

# PDF: attempt pdf-extract first (spike required)
pdf-extract = { version = "0.10", optional = true }
lopdf = { version = "0.38", optional = true, default-features = false, features = ["wasm_js"] }

# EPUB: expected WASM-compatible
epub = { version = "2", optional = true }

[features]
default = ["pdf", "epub"]
pdf = ["dep:pdf-extract", "dep:lopdf"]
epub = ["dep:epub"]
```

**Source:** Derived from workspace `rust-image-tools/crates/image-converter/Cargo.toml` (inspected), Rust WASM Book size chapter (HIGH confidence pattern).

### Pattern 4: WASM Worker — Initialization and Message Protocol

This pattern is directly from the working `rust-image-tools` reference (adapted from `--target web` to `--target bundler` output format).

```typescript
// src/workers/worker-types.ts
export enum ParseMessageType {
  Init = "init",
  ParseDocument = "parse_document",
  Error = "error",
}

export type DocFormat = "pdf" | "epub" | "txt";

// Main thread → Worker
export interface ParseRequest {
  type: ParseMessageType.ParseDocument;
  id: number;
  format: DocFormat;
  data: Uint8Array;  // Transferred, not copied
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

export interface InitSuccessResponse {
  type: ParseMessageType.Init;
  success: true;
  initMs: number;
}

export interface InitErrorResponse {
  type: ParseMessageType.Init;
  success: false;
  error: string;
}

export interface ParseErrorResponse {
  type: ParseMessageType.Error;
  id: number;
  error: string;
}

export type WorkerResponse =
  | InitSuccessResponse
  | InitErrorResponse
  | ParseSuccessResponse
  | ParseErrorResponse;
```

```typescript
// src/workers/parser-worker.ts
// NOTE: TypeScript Worker files need this declaration to avoid Window type conflicts
declare function postMessage(message: unknown, transfer?: Transferable[]): void;

import init, { parse_pdf, parse_epub } from '../../rsvp-parser/crates/rsvp-parser/pkg/rsvp_parser.js'
import { ParseMessageType } from './worker-types'
import type { WorkerResponse, ParseRequest } from './worker-types'

async function initialize(): Promise<void> {
  const start = performance.now()
  try {
    await init()
    const initMs = Math.round(performance.now() - start)
    postMessage({ type: ParseMessageType.Init, success: true, initMs } satisfies WorkerResponse)
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    postMessage({ type: ParseMessageType.Init, success: false, error } satisfies WorkerResponse)
  }
}

onmessage = (event: MessageEvent<ParseRequest>) => {
  const req = event.data
  const start = performance.now()
  try {
    let result: { words: string[]; title: string | null }
    if (req.format === 'pdf') {
      result = parse_pdf(req.data) as { words: string[]; title: string | null }
    } else if (req.format === 'epub') {
      result = parse_epub(req.data) as { words: string[]; title: string | null }
    } else {
      // txt: should not reach worker (handled in DocumentService)
      throw new Error('Unexpected format in worker: ' + req.format)
    }
    const parseMs = Math.round(performance.now() - start)
    const response: WorkerResponse = {
      type: ParseMessageType.ParseDocument,
      id: req.id,
      success: true,
      words: result.words,
      totalWordCount: result.words.length,
      title: result.title,
      parseMs,
    }
    postMessage(response)
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    postMessage({ type: ParseMessageType.Error, id: req.id, error } satisfies WorkerResponse)
  }
}

// Initialize WASM immediately when Worker is created
initialize()
```

**Source:** Directly adapted from `/Users/nousunio/Repos/Learnings/claude-code/rust-image-tools/web/src/worker.ts` (inspected source, HIGH confidence).

### Pattern 5: DocumentService — Main Thread Facade

```typescript
// src/services/document-service.ts
import { ParseMessageType } from '../workers/worker-types'
import type { WorkerResponse, ParseRequest } from '../workers/worker-types'
import { tokenize } from '../lib/tokenize'
import { detectFormat } from '../lib/format-detect'

export interface ParseResult {
  words: string[]
  title: string | null
  parseMs: number
}

type PendingRequest = {
  resolve: (value: ParseResult) => void
  reject: (reason: Error) => void
}

class DocumentService {
  private readonly worker: Worker
  private readonly ready: Promise<void>
  private readonly pending = new Map<number, PendingRequest>()
  private nextId = 1

  constructor() {
    let resolveInit!: () => void
    let rejectInit!: (e: Error) => void
    this.ready = new Promise<void>((resolve, reject) => {
      resolveInit = resolve
      rejectInit = reject
    })

    // Vite resolves the Worker URL at build time — import.meta.url is required
    this.worker = new Worker(
      new URL('../workers/parser-worker.ts', import.meta.url),
      { type: 'module' }
    )

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data
      if (msg.type === ParseMessageType.Init) {
        if (msg.success) { resolveInit() }
        else { rejectInit(new Error(msg.error)) }
        return
      }
      const req = this.pending.get(msg.id)
      if (!req) return
      this.pending.delete(msg.id)
      if (msg.type === ParseMessageType.Error) {
        req.reject(new Error(msg.error))
      } else if (msg.type === ParseMessageType.ParseDocument) {
        req.resolve({ words: msg.words, title: msg.title, parseMs: msg.parseMs })
      }
    }

    this.worker.onerror = (e) => {
      rejectInit(new Error(e.message))
      for (const [, req] of this.pending) req.reject(new Error('Worker crashed'))
      this.pending.clear()
    }
  }

  /** Parse a File object. Detects format from name/MIME. */
  async parseFile(file: File): Promise<ParseResult> {
    await this.ready
    const format = detectFormat(file.name, file.type)

    // Plain text: no WASM needed
    if (format === 'txt') {
      const text = await file.text()
      const words = tokenize(text)
      return { words, title: file.name.replace(/\.txt$/i, ''), parseMs: 0 }
    }

    // Binary formats: send bytes to Worker
    const bytes = new Uint8Array(await file.arrayBuffer())
    const id = this.nextId++
    const request: ParseRequest = { type: ParseMessageType.ParseDocument, id, format, data: bytes }
    // Transfer bytes.buffer — zero-copy, the Worker owns the buffer after this call
    this.worker.postMessage(request, [bytes.buffer])
    return new Promise<ParseResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
  }

  /** Parse raw text string (paste path). No WASM involved. */
  parseText(text: string): ParseResult {
    return { words: tokenize(text), title: null, parseMs: 0 }
  }
}

export const documentService = new DocumentService()
```

**Source:** Adapted from `/Users/nousunio/Repos/Learnings/claude-code/rust-image-tools/web/src/main.ts` ImageConverter class (inspected source, HIGH confidence).

### Pattern 6: Rust WASM API — lib.rs

```rust
// rsvp-parser/crates/rsvp-parser/src/lib.rs
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

mod pdf;
mod epub;
mod types;

#[derive(Serialize, Deserialize)]
pub struct ParseResult {
    pub words: Vec<String>,
    pub title: Option<String>,
}

/// Extract text from a PDF byte slice.
/// Returns a ParseResult with words and optional title.
/// Returns JsError if the PDF has no text layer or is malformed.
#[wasm_bindgen]
pub fn parse_pdf(input: &[u8]) -> Result<JsValue, JsError> {
    let result = pdf::extract(input)
        .map_err(|e| JsError::new(&format!("PDF extraction failed: {e}")))?;
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Serialization failed: {e}")))
}

/// Extract text from an EPUB byte slice.
#[wasm_bindgen]
pub fn parse_epub(input: &[u8]) -> Result<JsValue, JsError> {
    let result = epub::extract(input)
        .map_err(|e| JsError::new(&format!("EPUB extraction failed: {e}")))?;
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Serialization failed: {e}")))
}
```

**Source:** Adapted from `/Users/nousunio/Repos/Learnings/claude-code/rust-image-tools/crates/image-converter/src/lib.rs` pattern (inspected, HIGH confidence).

### Pattern 7: Empty Text Detection (DOCF-01 Error Path)

The PDF empty-text check must happen in the Rust layer AND the JS layer:

```rust
// In pdf.rs — Rust side
pub fn extract(input: &[u8]) -> Result<ParseResult, Box<dyn std::error::Error>> {
    let text = pdf_extract::extract_text_from_mem(input)?;
    let words: Vec<String> = text
        .split_whitespace()
        .map(|w| w.to_string())
        .collect();

    // Scanned PDF detection: very few words relative to bytes suggests image-only
    if words.len() < 10 {
        return Err("No readable text found. This PDF may be scanned or image-based.".into());
    }
    Ok(ParseResult { words, title: None })
}
```

```typescript
// In EntryScreen.tsx — JS side
async function handleFile(file: File) {
  setIsProcessing(true)
  setPatienceTimeout(setTimeout(() => setShowPatience(true), 3000))
  try {
    const result = await documentService.parseFile(file)
    // Guard: if result has very few words, treat as extraction failure
    if (result.words.length < 10) {
      throw new Error("No readable text found. This PDF may be scanned or image-based. Try a different PDF or paste the text instead.")
    }
    store.setWordList(result.words, result.title)
    navigate('/preview')
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Failed to read file')
    // Error auto-dismisses after 3-4s per user decision
    setTimeout(() => setError(null), 4000)
  } finally {
    setIsProcessing(false)
    clearTimeout(patienceTimeout)
    setShowPatience(false)
  }
}
```

### Pattern 8: Tokenizer (JS, not Rust)

Tokenization runs on the main thread in JS. The Rust WASM returns raw extracted text as words from the document; the JS tokenizer handles the paste-text path.

```typescript
// src/lib/tokenize.ts
/**
 * Split text into a word array for RSVP display.
 * Preserves punctuation within words (not stripped) — preserves reading rhythm.
 * Filters empty strings from multiple-whitespace splits.
 */
export function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 0)
}
```

### Anti-Patterns to Avoid

- **Using `--target web` with Vite:** The reference workspace uses `--target web` with Parcel. Vite + `vite-plugin-wasm` requires `--target bundler`. Using `--target web` in Vite causes init import errors.
- **Omitting `worker.plugins` in vite.config.ts:** The WASM plugins must be in both `plugins` and `worker.plugins`. Missing `worker.plugins` means WASM imports in the worker fail at Vite build time.
- **Awaiting WASM init before React renders:** Never `await documentService.ready` before `createRoot().render()`. The import button starts disabled; WASM initializes in the background.
- **Inlining the WASM binary:** Do not set `assetInlineLimit` high enough to inline the `.wasm` file. WASM should be served as a separate asset and cached by the browser/service worker.
- **Using `readAsText()` for PDF/EPUB files:** Always use `arrayBuffer()` → `Uint8Array`. Text mode corrupts binary file content.
- **JSON.stringify for Worker↔Main thread data:** Use `postMessage(request, [bytes.buffer])` for input transfer and `serde-wasm-bindgen` for output. Never JSON-serialize word arrays.
- **panic = "unwind" in Cargo profile:** WASM target requires `panic = "abort"`. Unwind support in WASM requires `-Zbuild-std` and is not standard.

---

## The PDF Crate Spike — Critical Decision Point

**This spike is required before any PDF implementation work begins.**

### Current State of pdf-extract WASM

| Finding | Confidence | Source |
|---------|-----------|--------|
| pdf-extract 0.10.0 released Oct 2025 | HIGH | crates.io API |
| pdf-extract depends on `lopdf = "0.38"` with `wasm_js` feature | HIGH | github.com/jrmuizel/pdf-extract/Cargo.toml |
| lopdf has `wasm_js` feature intended for wasm32-unknown-unknown | HIGH | lopdf issue #408 |
| lopdf WASM compilation issue (#408) still OPEN as of Oct 2025 | HIGH | github.com/J-F-Liu/lopdf/issues/408 |
| Root cause: getrandom transitive deps need explicit config | HIGH | Issue #408 discussion |
| Workaround: disable simd feature in miniz_oxide | MEDIUM | Issue #408 discussion |
| CI for WASM was added to lopdf (PRs #410, #411) | HIGH | Issue #408 |

### Spike Protocol (time-box: 2 hours)

```bash
# Step 1: Attempt the build
wasm-pack build rsvp-parser/crates/rsvp-parser --target bundler --release 2>&1

# If Step 1 fails with getrandom error, add to rsvp-parser/crates/rsvp-parser/Cargo.toml:
# [package.metadata.wasm-pack.profile.release]
# ... (existing)
# And add to .cargo/config.toml at workspace root:
# [target.wasm32-unknown-unknown]
# rustflags = ["--cfg", "getrandom_backend=\"wasm_js\""]

# Step 2: If compilation succeeds, verify bundle size
ls -la rsvp-parser/crates/rsvp-parser/pkg/*.wasm

# Step 3: Test extraction quality on a real PDF
# Write a small test harness (can use Node.js + @wasmer/wasi or a Playwright browser test)
# Test with: simple ebook PDF, multi-column PDF, scanned PDF (should error)

# Step 4: Document the decision
# - If pdf-extract works: proceed to implementation
# - If pdf-extract fails to compile: switch to pdfium-render (see fallback plan below)
# - If pdf-extract compiles but produces poor text: switch to pdfium-render
```

### Fallback Plan: pdfium-render

If `pdf-extract` fails the spike:

1. **pdfium-render crate** (ajrcarey/pdfium-render) — wraps Google's PDFium library, has a dedicated WASM build path, explicitly supports browser targets. Latest: 0.8.37.
2. Requires a pre-compiled `pdfium.wasm` binary from [paulocoutinhox/pdfium-lib](https://github.com/paulocoutinhox/pdfium-lib/releases).
3. Binary size is larger (exact size varies by build; historically quoted as "~40MB" uncompressed, but compressed delivery and lazy loading mitigate this).
4. Text extraction quality is significantly higher (PDFium is the reference implementation used by Chrome).
5. If pdfium-render is chosen: serve pdfium.wasm as a static asset, load lazily, use `Cache-Control: immutable` for long-term caching.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom Rust PDF parser | pdf-extract or pdfium-render | PDF spec (ISO 32000) is 750+ pages; character encoding alone has dozens of edge cases |
| EPUB container parsing | Zip extraction + XML parsing | epub crate 2.1.5 | spine order, NCX/OPF navigation, EPUB3 differences are non-trivial |
| WASM↔JS serialization | JSON.stringify/parse | serde-wasm-bindgen 0.6 | Direct JsValue conversion; no serialization overhead for word arrays |
| ArrayBuffer transfer | Object copy | `postMessage(msg, [bytes.buffer])` | Transfer = zero-copy O(1); copy = O(n) and doubles peak memory |
| Worker facade | Raw Worker.postMessage | DocumentService class pattern | Request ID + Map pattern handles concurrent requests correctly |
| File format detection | String matching | format-detect.ts (MIME + extension) | Edge cases: PDF without .pdf extension, files with wrong MIME type |
| Tokenization | Split on spaces only | `text.split(/\s+/).filter(Boolean)` | \s+ handles tabs, newlines, \r\n, multiple spaces in one pass |

**Key insight:** The PDF problem is one of the hardest "solved" problems in document processing. Even browser-native PDF.js (>50K lines of JS) has known layout issues. Don't attempt a custom solution.

---

## Common Pitfalls

### Pitfall 1: wasm-pack target mismatch — `--target web` vs `--target bundler`

**What goes wrong:** The worker file imports the WASM pkg with `import init from '...'`. If built with `--target web`, the generated JS glue assumes synchronous `fetch()` initialization. If built with `--target bundler`, Vite handles the WASM fetch correctly via `vite-plugin-wasm`.

**Why it happens:** The reference workspace (`rust-image-tools`) uses Parcel + `--target web`, which works because Parcel handles WASM differently. Copying that command to a Vite project silently produces a package that initializes incorrectly.

**How to avoid:** Always use `wasm-pack build --target bundler` for Vite projects. The npm `build:wasm` script must specify `--target bundler`.

**Warning signs:** Init succeeds in dev but fails in production build; `TypeError: WebAssembly.instantiate` errors in browser console.

### Pitfall 2: Missing `worker.plugins` in vite.config.ts

**What goes wrong:** The WASM file import inside `parser-worker.ts` fails at build time with a Vite plugin error: "Failed to resolve import ... (not found)".

**Why it happens:** Vite processes Worker files with a separate plugin pipeline. The `plugins` array in `defineConfig` applies to the main bundle. Worker files need their own `worker.plugins` configuration.

**How to avoid:**
```typescript
// vite.config.ts — both are REQUIRED
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  worker: { plugins: () => [wasm(), topLevelAwait()] },
})
```

**Warning signs:** Build succeeds but Worker throws module import errors at runtime; works in dev (Vite dev server is more lenient) but breaks in production build.

### Pitfall 3: WASM binary inlined into JS bundle

**What goes wrong:** The `.wasm` file (potentially 1–5MB) gets inlined as a base64 string in the JS bundle, massively inflating initial JS download size and preventing browser WASM compilation caching.

**Why it happens:** Vite's `build.assetsInlineLimit` defaults to 4KB but some configs raise it. The `vite-plugin-wasm` plugin should handle this correctly, but `optimizeDeps.exclude` misconfiguration can cause the WASM to be pre-bundled by esbuild.

**How to avoid:** Add the WASM package to `optimizeDeps.exclude`. Verify in production build that the `.wasm` file appears as a separate asset in `dist/assets/`.

```typescript
// vite.config.ts
optimizeDeps: {
  exclude: ['rsvp-parser'],
}
```

### Pitfall 4: pdf-extract getrandom compilation error

**What goes wrong:** `wasm-pack build` fails with: "The wasm32-unknown-unknown targets are not supported by default, you may need to enable the 'wasm_js' configuration flag."

**Why it happens:** pdf-extract → lopdf → getrandom dependency chain. getrandom 0.3.x requires explicit configuration for WASM targets. lopdf added the `wasm_js` feature to handle this, but transitive dependency version conflicts can still occur.

**How to avoid:** Add `getrandom` configuration to `.cargo/config.toml`:
```toml
# .cargo/config.toml (at workspace root)
[target.wasm32-unknown-unknown]
rustflags = ["--cfg", "getrandom_backend=\"wasm_js\""]
```

If this doesn't resolve the issue (other transitive deps like `simd-adler32`), escalate to the pdfium-render fallback.

**Warning signs:** Compilation error mentioning `getrandom`, `wasm_js`, or `wasm32-unknown-unknown not supported`.

### Pitfall 5: WASM initializes before React renders (blocked first paint)

**What goes wrong:** The app shows a blank screen for 200–800ms while WASM compiles.

**Why it happens:** DocumentService is constructed at module evaluation time. If `await documentService.ready` is called before `createRoot().render()`, the entire React tree waits for WASM init.

**How to avoid:**
- Import `documentService` as a singleton (it starts initializing as a side effect of import)
- But never `await` it before calling `render()`
- The import button starts disabled; re-enables when the worker sends `Init` success
- The UI must render immediately with the import button in disabled state

```typescript
// main.tsx — CORRECT
import { documentService } from './services/document-service' // starts init as side effect
createRoot(document.getElementById('root')!).render(<App />)  // render immediately, don't await

// EntryScreen.tsx
const [isWorkerReady, setIsWorkerReady] = useState(false)
useEffect(() => {
  documentService.ensureReady().then(() => setIsWorkerReady(true))
}, [])
// <button disabled={!isWorkerReady || isProcessing}>Import PDF</button>
```

### Pitfall 6: File read with `readAsText()` corrupts binary files

**What goes wrong:** PDF/EPUB bytes are corrupted before reaching the WASM parser.

**Why it happens:** `file.text()` (or `FileReader.readAsText()`) interprets bytes as UTF-8/UTF-16 text, corrupting binary content with byte-order marks, invalid sequence replacement, etc.

**How to avoid:** Always use `file.arrayBuffer()` for PDF/EPUB, then wrap in `Uint8Array`:
```typescript
const bytes = new Uint8Array(await file.arrayBuffer())
this.worker.postMessage({ ..., data: bytes }, [bytes.buffer])
```

**Warning signs:** WASM parser errors on valid PDFs; "invalid PDF" errors immediately on files that open correctly in a viewer.

---

## Code Examples

### Verified WASM Worker Init Pattern (from workspace reference)

```typescript
// Source: /Users/nousunio/Repos/Learnings/claude-code/rust-image-tools/web/src/worker.ts
// This exact pattern is known-working. Adapt for rsvp-parser.

declare function postMessage(message: unknown, transfer?: Transferable[]): void;

import init, { convert_image } from "../../crates/image-converter/pkg/image_converter.js";
import { MessageType } from "./worker-types";

async function initialize(): Promise<void> {
  const start = performance.now();
  try {
    await init();
    const initMs = Math.round(performance.now() - start);
    postMessage({ type: MessageType.Init, success: true, initMs });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    postMessage({ type: MessageType.Init, success: false, error });
  }
}

onmessage = (event: MessageEvent) => { /* handle messages */ };
initialize(); // Called at module evaluation time — WASM loads when Worker starts
```

**Key adaptation for RSVP Parser:** Change `--target web` to `--target bundler` in wasm-pack command. The import path `../../crates/.../pkg/` stays the same pattern.

### Verified DocumentService Facade Pattern (from workspace reference)

```typescript
// Source: /Users/nousunio/Repos/Learnings/claude-code/rust-image-tools/web/src/main.ts
// ImageConverter class is the model for DocumentService

class ImageConverter {
  private readonly worker: Worker
  private readonly ready: Promise<number>  // resolves to initMs
  private readonly pendingRequests = new Map<number, PendingRequest>()
  private nextRequestId = 1

  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',  // REQUIRED for ES module workers
    })
    this.worker.onmessage = this.handleMessage.bind(this)
    this.worker.onerror = this.handleError.bind(this)
  }

  // ...ensureReady(), sendRequest(), public methods
}
```

### Cargo Profile for Size Optimization

```toml
# Source: Derived from rust-image-tools/Cargo.toml + Rust WASM Book recommendations
# rust-image-tools uses opt-level = "s"; use "z" for more aggressive size optimization

[profile.release]
opt-level = "z"      # More aggressive than "s", trades some speed for size
lto = true           # Whole-program optimization
codegen-units = 1    # Required for LTO
strip = true         # Remove debug symbols
panic = "abort"      # WASM cannot unwind anyway; saves ~20% binary size
```

### Format Detection

```typescript
// src/lib/format-detect.ts
export type DocFormat = 'pdf' | 'epub' | 'txt'

export function detectFormat(filename: string, mimeType: string): DocFormat {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf'
  if (lower.endsWith('.epub') || mimeType === 'application/epub+zip') return 'epub'
  return 'txt'  // Fallback for plain text and paste content
}
```

### Drag-and-Drop File Handler (Entry Screen)

```typescript
// src/components/EntryScreen/EntryScreen.tsx — key event handlers
const onDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  setIsDragOver(false)
  const file = e.dataTransfer.files[0]
  if (file) handleFile(file)
}, [handleFile])

const onDragOver = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragOver(true)
}

const onDragLeave = () => setIsDragOver(false)

// File input click-to-pick
const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) handleFile(file)
  // Reset input so same file can be re-selected
  e.target.value = ''
}
```

### Patience Message Timeout (User Decision)

```typescript
// User decision: show patience message after 3 seconds of processing
const [showPatienceMsg, setShowPatienceMsg] = useState(false)

async function handleFile(file: File) {
  setIsProcessing(true)
  const patienceTimer = setTimeout(() => setShowPatienceMsg(true), 3000)
  try {
    const result = await documentService.parseFile(file)
    clearTimeout(patienceTimer)
    store.setWordList(result.words, result.title)
    navigate('/preview')
  } catch (err) {
    clearTimeout(patienceTimer)
    const msg = err instanceof Error ? err.message : 'Could not read file'
    setError(msg)
    setTimeout(() => setError(null), 4000) // auto-dismiss ~4s
  } finally {
    setIsProcessing(false)
    setShowPatienceMsg(false)
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `--target web` for Vite | `--target bundler` for Vite | 2023–2024 | `--target bundler` is the correct Vite target; `--target web` works but requires manual init |
| `vite-plugin-wasm` v2 (Vite 2–4 only) | `vite-plugin-wasm` v3 (Vite 2–7) | 2024–2025 | Confirm v3.x is installed; v2 breaks on Vite 6+ |
| wasm-pack 0.12 | wasm-pack 0.14.0 | Jan 2025 | Added WASI support, macOS ARM builds |
| Tailwind CSS v3 (PostCSS config) | Tailwind CSS v4 (@tailwindcss/vite) | Jan 2025 | No `tailwind.config.js` needed; use `@import "tailwindcss"` in CSS |
| Vite 6 (latest at planning time) | Vite 7.3.1 (current stable) | Mid-2025 | Node.js 20.19+ required; default browser target raised |
| React 19.0 | React 19.2.4 | Oct 2025 / Jan 2026 | Patch releases; no API changes relevant to this project |

**Deprecated/outdated:**
- `tailwindcss` PostCSS plugin in Vite: replaced by `@tailwindcss/vite` first-party plugin — do NOT use `tailwindcss` + `postcss` config in Vite 7 projects
- `--target web` with `initSync`: old approach for non-bundler environments; not needed with Vite + vite-plugin-wasm
- Create React App: unmaintained; use `npm create vite@latest` instead
- wasm-pack 0.12: missing macOS ARM support; use 0.14.0

---

## Open Questions

1. **Does pdf-extract 0.10.0 compile to wasm32-unknown-unknown without errors?**
   - What we know: pdf-extract uses lopdf 0.38 with `wasm_js` feature. lopdf WASM CI was added. Issue #408 still open Oct 2025.
   - What's unclear: Whether the CI fixes resolved practical compilation for downstream crates like pdf-extract. The `.cargo/config.toml` getrandom workaround may be sufficient.
   - Recommendation: The spike answers this definitively in 2 hours. Do not speculate; run the build.

2. **What is the actual pdf-extract 0.10.0 WASM bundle size after wasm-opt?**
   - What we know: pdf-extract pulls in lopdf which has ZIP/compression deps. Expected range: 1–4MB.
   - What's unclear: Whether it stays under the 2MB target.
   - Recommendation: Measure after the spike. If over 2MB, investigate which crates dominate with `cargo bloat --target wasm32-unknown-unknown` and consider disabling unused lopdf features.

3. **Does the epub crate 2.1.5 compile to wasm32-unknown-unknown cleanly?**
   - What we know: EPUB crate is pure Rust, no OS deps documented, MEDIUM confidence from prior research.
   - What's unclear: Whether any transitive deps (zip, xml parsing) have WASM issues.
   - Recommendation: Include epub in the spike build. Test with a sample EPUB file. Note: epub crate is GPL-3.0 licensed — verify this is acceptable for the project.

4. **epub crate license: GPL-3.0**
   - What we know: epub 2.1.5 is licensed GPL-3.0 (confirmed via crates.io).
   - What's unclear: Whether the RSVP Reader app distribution requires GPL compliance (it likely does if epub crate code is compiled into the binary, even as WASM).
   - Recommendation: Verify license implications before committing to the epub crate. If GPL is a problem, alternatives are: manually parsing EPUB as ZIP + XML (EPUB is just a ZIP with XHTML), or using a BSD/MIT-licensed alternative.

5. **Vite 7 Node.js requirement: 20.19+**
   - What we know: Vite 7 requires Node.js 20.19+ or 22.12+.
   - What's unclear: What Node.js version the development machine has.
   - Recommendation: Check with `node --version` at project setup. Upgrade Node if needed before running `npm create vite@latest`.

---

## Sources

### Primary (HIGH confidence)

- `/Users/nousunio/Repos/Learnings/claude-code/rust-image-tools/web/src/worker.ts` — WASM Worker init pattern, message protocol, postMessage transfer (inspected source)
- `/Users/nousunio/Repos/Learnings/claude-code/rust-image-tools/web/src/main.ts` — DocumentService facade pattern, Worker constructor, request ID pattern (inspected source)
- `/Users/nousunio/Repos/Learnings/claude-code/rust-image-tools/crates/image-converter/Cargo.toml` — crate-type, release profile, dependency patterns (inspected source)
- crates.io API — pdf-extract 0.10.0 (Oct 2025), wasm-bindgen 0.2.111 (Feb 2026), lopdf 0.39.0 (Jan 2026), epub 2.1.5 (Oct 2025) (direct API fetch, HIGH confidence)
- github.com/rustwasm/wasm-pack/releases — wasm-pack 0.14.0 (Jan 2025) (official release page)
- github.com/Menci/vite-plugin-wasm — supports Vite 2–7; `worker.plugins` requirement; Firefox note (official README)

### Secondary (MEDIUM confidence)

- react.dev — React 19.2.4 (Jan 2026) latest (official blog post)
- vite.dev/releases — Vite 7.3.1 current stable; Vite 6 still maintained (official)
- vite.dev/blog/announcing-vite7 — Vite 7 changes; WASM/Worker unchanged; Node 20.19+ required (official)
- tailwindcss.com — @tailwindcss/vite 4.2.0 (current); no PostCSS config needed (official docs)
- github.com/J-F-Liu/lopdf/issues/408 — WASM compilation issue; `wasm_js` feature; open Oct 2025; getrandom workaround (GitHub issue)
- github.com/jrmuizel/pdf-extract/blob/master/Cargo.toml — pdf-extract depends on lopdf = "0.38" with wasm_js feature (fetched from GitHub)
- vite-plugin-top-level-await v1.6.0 (current) — npm package data

### Tertiary (LOW confidence — flag for validation)

- Zustand 5.0.11 current version (npm search result; verify before install)
- pdfium-render 0.8.37 as fallback option (crates.io result; review setup docs before committing)
- epub crate GPL-3.0 license — verify with `cargo license` or crates.io before use

---

## Metadata

**Confidence breakdown:**
- WASM Worker pattern: HIGH — directly inspected from working workspace reference implementation
- Vite config + wasm-pack target: HIGH — verified against vite-plugin-wasm README and Vite 7 docs
- PDF crate WASM compilation: MEDIUM-LOW — issue #408 still open; pdf-extract Cargo.toml shows wasm_js feature but compilation unverified
- EPUB crate: MEDIUM — pure Rust, no OS deps, but WASM untested; GPL-3.0 license needs verification
- Cargo size optimization profile: HIGH — direct pattern from workspace; Rust WASM Book
- Current package versions: HIGH — verified via direct API/release page fetches Feb 2026

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (30 days for stable patterns; PDF crate situation may evolve faster)
