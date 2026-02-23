# Pitfalls Research

**Domain:** RSVP Speed Reading PWA (Rust/WASM + React/TypeScript, client-side only)
**Researched:** 2026-02-23
**Confidence:** MEDIUM — web tools unavailable; findings from training data (cutoff Aug 2025) supplemented by official docs knowledge. All HIGH-confidence items are well-established, documented behaviors. LOW-confidence items flagged for validation.

---

## Critical Pitfalls

### Pitfall 1: WASM Bundle Size Bloat from Rust Standard Library

**What goes wrong:**
A naive Rust WASM build pulls in large chunks of the standard library (allocator, panic handlers, fmt machinery). A PDF parser crate compiled to WASM without size optimization ships 3–8 MB of WASM before gzip. For a PWA that users install once, this is a painful first-load. Worse, if PDF, EPUB, and DOCX parsers are bundled together in one WASM blob, the combined binary can exceed 10 MB uncompressed.

**Why it happens:**
Developers use `wasm-pack build` without `--release` and without configuring `Cargo.toml` for size. The default Rust panic handler (`panic = "unwind"`) adds significant code. Debug symbols are included. The allocator is generalized. PDF parsing crates (lopdf, pdf-extract) and EPUB/DOCX crates (epub, docx-rs) each bring their own transitive dependencies.

**How to avoid:**
- Set `[profile.release]` in `Cargo.toml`: `opt-level = "z"`, `lto = true`, `codegen-units = 1`, `panic = "abort"`.
- Run `wasm-opt -Oz` (from binaryen) on the output `.wasm` file as a post-build step.
- Use `wasm-bindgen` with `--no-default-features` on dependencies where possible.
- Split parsers: load each parser WASM module lazily — only instantiate the PDF WASM when the user opens a PDF. Don't bundle all three parsers in one module.
- Target: aim for <2 MB per parser WASM after `wasm-opt`, served with gzip (expect 40-60% compression ratio).
- Use `twiggy` or `cargo bloat` to identify which functions/crates dominate size before optimizing blindly.

**Warning signs:**
- `wasm-pack build` output file >3 MB uncompressed.
- No `wasm-opt` step in the build pipeline.
- Single WASM module imports all three parser crates.
- First install of PWA takes >5 seconds on 4G mobile.

**Phase to address:** Foundation / WASM build infrastructure phase (very first Rust phase). Establishing correct `Cargo.toml` profiles and build pipeline before adding parser crates is far cheaper than retrofitting.

---

### Pitfall 2: Web Share Target API Is Unsupported on iOS

**What goes wrong:**
The Web Share Target API (defined in the PWA manifest as `"share_target"`) allows other apps to share content into the PWA. On Android Chrome and desktop Chromium-based browsers, this works well and is the core "share a webpage, read it" flow. On iOS Safari, Web Share Target is **not supported as of iOS 17/18** — iOS Safari supports the Web Share *API* (navigator.share, outgoing shares) but not the *Share Target* (incoming shares). Users on iOS cannot share a URL from Safari into the RSVP app.

**Why it happens:**
Apple has intentionally not implemented the Share Target portion of the PWA spec in Safari/WebKit. The gap between Web Share (outgoing, widely supported) and Web Share Target (incoming, Chromium-only in practice) is a common developer confusion.

**How to avoid:**
- Design the import flow with iOS as a first-class alternative path: a text/URL paste input field, a "Open URL" manual entry, and file import via `<input type="file">` should all work on iOS.
- Treat Web Share Target as a progressive enhancement — the app must be fully functional without it.
- Consider a bookmarklet or iOS Share Extension approach for iOS power users (out of v1 scope, but note the gap).
- Test the PWA install flow on iOS explicitly — PWA install on iOS requires "Add to Home Screen" manually, and installed PWAs on iOS do not get Share Target registration in the OS share sheet.
- Document clearly in onboarding that iOS users must paste URLs or open files manually.

**Warning signs:**
- Share Target listed as a required feature (not optional enhancement) in requirements.
- No fallback import UI designed for when Share Target is unavailable.
- Testing done only on Android/Chrome without iOS validation.

**Phase to address:** PWA setup / manifest phase. The fallback import UI must be designed and built at the same time as Share Target, not after.

---

### Pitfall 3: PDF Text Extraction Is Fundamentally Unreliable for Many PDFs

**What goes wrong:**
PDF is a page-layout format, not a semantic text format. Many PDFs — especially those produced by scanning (images inside PDF), by certain LaTeX exporters, or by design tools — either contain no text layer at all, contain text in the wrong reading order, or have ligatures/hyphenation encoded in ways that produce garbled extraction. Rust PDF crates (`pdf-extract`, `lopdf`) extract what is literally in the PDF text stream, which for complex documents is often not the logical reading order a human expects. Table cells, multi-column academic papers, footnotes, and headers frequently produce scrambled word order.

**Why it happens:**
PDF's text model is based on character placement coordinates, not semantic structure. Extracting "text" requires reconstructing reading order from XY coordinates — a heuristic, error-prone process. Simple linear PDFs (ebooks converted to PDF, single-column documents) extract cleanly. Complex layouts do not.

**How to avoid:**
- Be explicit in the app about what PDF types work well and which don't. Don't promise "any PDF."
- For scanned PDFs (images): detect the absence of a text layer (check if extracted text is empty or very short relative to page count) and show a clear error: "This PDF appears to be a scanned image. Text extraction requires OCR, which is not supported."
- For complex layout PDFs: show a text preview before starting RSVP so users can verify the extraction quality.
- Weight toward EPUB support: EPUB is a semantic format and extracts cleanly — if users have EPUB versions of content, strongly prefer them.
- Test with a corpus of real PDFs: academic paper (multi-column), ebook (linear), scanned document, LaTeX paper, design PDF. Establish a realistic success rate.

**Warning signs:**
- Testing PDF extraction only with simple, clean PDFs.
- No preview step between "file imported" and "RSVP starts."
- No empty/garbled text detection.

**Phase to address:** Document parsing phase. Build quality gates (preview, error detection) into the parsing pipeline before the reading UI, not as a later polish step.

---

### Pitfall 4: JavaScript `setTimeout`/`setInterval` Timing Drift Makes WPM Inaccurate

**What goes wrong:**
RSVP word display depends on precise per-word timing (e.g., at 300 WPM, each word displays for 200ms). Using `setInterval(displayNextWord, interval)` accumulates drift: each callback fires slightly late, and errors compound over long texts. At 300 WPM over 500 words (~100 seconds), drift of 5-10ms per word compounds to 2.5–5 seconds of desync between the actual elapsed time and what the UI thinks. The "pause and resume" feature is especially vulnerable — naive implementations reset the interval timer on resume rather than computing the correct elapsed offset.

**Why it happens:**
JavaScript timers are not high-resolution guaranteed. `setInterval` is subject to clamping (browsers clamp minimum intervals to 4ms, and in background tabs to 1000ms+). Developers use interval-based approaches because they feel natural, but the correct approach is a deadline-based scheduler using `performance.now()`.

**How to avoid:**
- Use `performance.now()` to track absolute start time and compute which word *should* be displaying now, rather than counting interval ticks.
- On each `requestAnimationFrame` or `setTimeout` callback: compute `elapsed = performance.now() - startTime`, derive `wordIndex = Math.floor(elapsed / msPerWord)`, display that word.
- This makes the display self-correcting: if a callback fires late, the next one picks up at the right word index.
- For pause/resume: store `elapsedAtPause` on pause; on resume, set `startTime = performance.now() - elapsedAtPause`.
- Test timing accuracy by logging actual intervals over 100 words at 500 WPM and measuring drift.

**Warning signs:**
- Using `setInterval` as the primary word-advance mechanism.
- A `currentWordIndex` counter that increments by 1 per tick rather than being computed from elapsed time.
- Pause implementation that calls `clearInterval` and `setInterval` without accounting for elapsed time.

**Phase to address:** RSVP display engine phase. The scheduler architecture is foundational — retrofitting from interval-based to time-based after the UI is built is a significant rewrite.

---

### Pitfall 5: ORP Position Calculated on Bytes/Characters Instead of Visual Width

**What goes wrong:**
The Optimal Recognition Point (ORP) for a word should be approximately 30% from the start of the word by character count (not exactly the middle character). The Spritz patent specifies the ORP as roughly the 1/3 position. But the common implementation mistake is computing ORP on raw character index, which fails for:
- Words containing multi-byte Unicode characters (emoji, accented chars) — `str.length` in JS counts UTF-16 code units, not grapheme clusters.
- Words containing ligatures from PDFs that are extracted as single characters but display as two.
- Very short words (1-3 chars) where ORP is just the first character.

Additionally, the fixed focal point alignment — keeping the ORP letter at the same screen X position — is commonly implemented incorrectly: developers align the whole word to center, not the ORP character.

**How to avoid:**
- Use the Intl.Segmenter API (available in all modern browsers) or a Unicode grapheme cluster library to split words into visual characters before computing ORP index.
- ORP formula: `orpIndex = Math.max(0, Math.ceil(graphemes.length * 0.3) - 1)` with special cases for 1-char words (ORP = 0) and 2-char words (ORP = 0).
- For focal point alignment: the word display has three spans — `leftPart | ORPchar | rightPart`. Use CSS monospace for the ORP character container and fixed-width left padding equal to the max expected left-part width, or use a CSS approach that pins the ORP char to a fixed viewport X.
- Do not use proportional fonts for the word display area — use `font-variant-numeric: tabular-nums` and consider monospace for precise alignment.

**Warning signs:**
- ORP computed as `Math.floor(word.length / 2)` (exact middle, not 30%).
- No Unicode grapheme handling — using raw `.length` on strings from PDF/EPUB text.
- Focal point shifts left/right visually as words change length (sign the CSS alignment is wrong).

**Phase to address:** RSVP display engine phase, specifically the word rendering component.

---

### Pitfall 6: WASM Module Initialization Blocks First Paint

**What goes wrong:**
`wasm-pack`-generated modules use `async` initialization. If the app `await`s WASM module initialization synchronously at startup before rendering any UI, users see a blank screen for 200-800ms while WASM compiles (first visit, before browser caches the compiled module). On mobile this is worse. If all three parser WASM modules are eagerly initialized, first paint is delayed 0.5–2 seconds.

**Why it happens:**
The default `wasm-pack` JavaScript glue code exports an `init()` function that must be awaited. Developers put this at the top level of their app setup, before React renders. Also, WebAssembly compilation is CPU-intensive and not instantaneous even for medium-sized modules.

**How to avoid:**
- Render the React UI shell immediately without waiting for WASM init.
- Initialize parser WASM modules lazily: only when the user first triggers a file import action.
- Show a loading indicator ("Preparing parser...") inline in the import flow rather than blocking first render.
- Use `wasm-bindgen`'s `--target web` with dynamic import (`import()`) for on-demand loading.
- Cache compiled WASM with the Cache API or rely on browser's built-in WASM compilation caching (Chrome compiles and caches after first load).

**Warning signs:**
- `await init()` called before `ReactDOM.render` or `createRoot().render`.
- All parser modules imported at the top of the main entry point.
- Lighthouse TTI (Time to Interactive) score degraded significantly by WASM init.

**Phase to address:** WASM integration / performance phase. Can be deferred from the initial proof-of-concept but must be addressed before any user testing.

---

### Pitfall 7: Background Tab Throttling Pauses RSVP Without User Awareness

**What goes wrong:**
When the user switches away from the RSVP tab (or the device screen turns off), browsers aggressively throttle JavaScript timers in background tabs. `setTimeout` minimum interval jumps to 1000ms in most browsers. The RSVP display either freezes, or resumes at the wrong position when the user returns. The Page Visibility API is the correct mechanism for detecting this, but many developers don't implement it.

**Why it happens:**
Browser background throttling is an intentional battery/CPU optimization. Apps that don't handle `visibilitychange` events simply stop functioning correctly when backgrounded.

**How to avoid:**
- Listen for `document.addEventListener('visibilitychange', ...)`.
- When `document.visibilityState === 'hidden'`: auto-pause the RSVP session, store `elapsedAtPause`.
- When `document.visibilityState === 'visible'`: resume from the correct word position (do not restart from 0, do not try to "catch up").
- Show a clear "Paused (app backgrounded)" state when the app resumes and is visible again, giving the user control to resume explicitly, or auto-resume — but make the behavior explicit.

**Warning signs:**
- No `visibilitychange` listener in the RSVP engine.
- No difference in behavior when the tab is backgrounded vs. active.

**Phase to address:** RSVP display engine phase, alongside the timer/scheduler implementation.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single WASM blob with all parsers | Simpler build setup | 10MB+ WASM, slow first load, all parsers initialized even if unused | Never — split from the start |
| setInterval for word timing | Simple to implement | Timing drift over long texts; broken pause/resume | MVP proof-of-concept only; replace before user testing |
| `word.length / 2` for ORP | Fast to code | Wrong for short words, Unicode fails, misaligned focal point | Never |
| No text preview before RSVP | Faster UX flow | Users start reading garbled text from bad PDF extraction | Never |
| Eager WASM init on startup | Simpler code | Delayed first paint; hurts Lighthouse/Core Web Vitals | Acceptable only in internal prototype |
| `innerHTML` for word rendering | Simple | XSS risk if text from documents is not sanitized | Never if rendering extracted PDF/EPUB content |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Web Share Target | Assuming it works on iOS | Register as progressive enhancement; test on iOS before launch; provide paste/file fallback |
| WASM + React | Putting WASM init in React component lifecycle (`useEffect`) without cleanup | Init once at module level (outside component tree) with a singleton promise; expose via context |
| PDF crate (lopdf/pdf-extract) | Calling `parse()` synchronously on the main thread | Run all parsing in a Web Worker (WASM in a Worker is fully supported); never block the main thread |
| EPUB crate | Assuming linear spine order = reading order | Use `spine` element order from `content.opf`, not directory listing order |
| DOCX crate | Extracting raw XML text instead of paragraph content | Parse `word/document.xml`, follow `<w:p>` elements; raw XML text includes tag names as noise |
| File input | Using `FileReader.readAsText()` for binary files (PDF, DOCX) | Use `FileReader.readAsArrayBuffer()` and pass bytes to WASM; text mode corrupts binary data |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Parsing large PDF on main thread | UI freezes during parse; browser "page unresponsive" warning | Always use Web Worker for WASM parsing | Any PDF >1 MB |
| Re-tokenizing full document on every word advance | Increasing latency as document grows | Tokenize once on import, store word array in memory | Documents >50K words |
| Storing full document text in React state | React re-renders on every word change if text is in state | Use refs or module-level variables for the word array; only put currentWordIndex in state | Documents >10K words |
| Rendering entire word array in DOM (for scroll sync) | Slow render, memory pressure | Virtualize the text display (react-virtual or similar); only render visible text lines | Documents >5K words |
| Creating a new WASM module instance per parse | Memory leak; slow repeated parsing | Instantiate once, reuse | Any second import in a session |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| RSVP starts immediately on file open | No chance to verify text extraction quality; users read garbled text | Show text preview, let user confirm or cancel before starting RSVP |
| No WPM memory between sessions | Users re-set speed every time | Store last WPM in localStorage (even without "library" feature, persisting settings is expected) |
| No way to see what word is coming | Anxiety about missing words, no re-read ability | Scrolling text panel below RSVP display showing ±5 words of context |
| Binary speed increments (100, 200, 300) | Can't fine-tune for comfort | Allow freeform or 25 WPM increments |
| No visual pause confirmation | Users unsure if they pressed pause | Clear visual state: PAUSED text + dimmed display |
| RSVP continues during scroll | Confusing — reading in two modes simultaneously | Auto-pause on scroll interaction; resume on explicit play |

---

## "Looks Done But Isn't" Checklist

- [ ] **Web Share Target:** Registered in manifest, works on Android Chrome — verify it degrades gracefully on iOS without errors (not just silently unavailable)
- [ ] **PDF parsing:** Works on a simple ebook PDF — verify behavior on scanned PDF (no text layer), multi-column PDF, and password-protected PDF (should show clear error, not hang)
- [ ] **EPUB parsing:** Opens simple EPUB — verify behavior on EPUB3 with media overlays, EPUB with NCX-only navigation, and EPUB with non-ASCII filenames
- [ ] **ORP alignment:** Words look centered — verify focal character stays at same X position across words of length 1, 2, 3, 10, 20+ characters
- [ ] **WPM timing:** Feels right at 250 WPM — measure actual elapsed time for 100 words and confirm it matches expected 24 seconds (within ±1s)
- [ ] **Pause/resume:** Pausing mid-session works — verify that after pause + resume, the word index and timing are correct (not reset to 0, not skipping ahead)
- [ ] **Background tab:** Works in foreground — verify behavior when tab is backgrounded and returned to (should pause, not continue from wrong position)
- [ ] **PWA install:** Installable on desktop — verify install works on iOS "Add to Home Screen" and that the app opens without browser chrome
- [ ] **WASM lazy load:** Parser loads — verify that unused parsers (e.g., EPUB parser) are NOT loaded when user only opens PDFs (check Network tab)
- [ ] **Large file handling:** Works on 100-page document — verify on 500-page PDF that the app doesn't hang, run out of memory, or have >5s parse time

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| WASM bundle too large after feature-complete | HIGH | Identify culprits with `twiggy`; split into separate modules; add lazy loading; may require build pipeline refactor |
| setInterval drift in production | MEDIUM | Replace with performance.now()-based scheduler; existing tests will catch regression |
| ORP wrong for Unicode words | LOW | Fix ORP calculation function; update tests; no architectural change needed |
| Web Share Target not working on iOS at launch | LOW | Document limitation; add paste/URL field to UI (likely already exists as fallback) |
| PDF garbled text with no preview | MEDIUM | Add preview step before RSVP start; may require UX flow changes if designed without it |
| WASM init blocking first paint | MEDIUM | Move init to lazy/deferred; requires async refactor of component tree initialization |
| Background tab timer corruption | MEDIUM | Add visibilitychange listener; requires testing the pause/resume state machine carefully |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| WASM bundle size bloat | Phase 1: Rust/WASM build infrastructure | Measure WASM output size after `wasm-opt`; must be <2 MB per module |
| Web Share Target iOS limitation | Phase 2: PWA manifest + import flows | Manual test on iOS device: paste URL and file upload work without Share Target |
| PDF extraction unreliability | Phase 2: Document parsing | Parse corpus of 5 PDF types; verify error detection for scanned PDFs |
| Timer drift (setInterval) | Phase 3: RSVP display engine | Automated test: 100 words at 300 WPM, measure total elapsed time vs. expected |
| ORP calculation on raw char index | Phase 3: RSVP display engine | Visual test: verify ORP char fixed position across words of all lengths |
| WASM init blocking first paint | Phase 4: Performance / PWA polish | Lighthouse TTI <3s on mobile throttled connection |
| Background tab throttling | Phase 3: RSVP display engine | Test: background tab for 5s, return, confirm paused state |
| Main thread blocking during parse | Phase 2: Document parsing | Verify parse runs in Web Worker; UI remains responsive during parse |
| Text rendered in DOM without virtualization | Phase 3: RSVP display engine | Scroll performance test on 500-page document |

---

## Sources

- Rust WASM Book — Code Size chapter: https://rustwasm.github.io/docs/book/reference/code-size.html (MEDIUM confidence — training data; wasm-opt and profile recommendations are stable)
- MDN Web Share Target: https://developer.mozilla.org/en-US/docs/Web/Manifest/share_target (MEDIUM confidence — iOS non-support is documented; verify against current iOS version at build time)
- W3C Web Share Target specification: https://w3c.github.io/web-share-target/ (HIGH confidence — spec is stable; iOS implementation gap is a known, long-standing issue)
- wasm-bindgen Guide: https://rustwasm.github.io/docs/wasm-bindgen/ (HIGH confidence — lazy loading pattern and Web Worker usage are well-documented)
- Spritz ORP research: https://www.spritzinc.com/the-science (MEDIUM confidence — 30% position claim is from Spritz's own research; independent replication limited)
- MDN Page Visibility API: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API (HIGH confidence — visibilitychange for background tab detection is well-established)
- MDN performance.now(): https://developer.mozilla.org/en-US/docs/Web/API/Performance/now (HIGH confidence — high-resolution timer for scheduler is the established pattern)
- PDF Specification (ISO 32000): PDF text extraction order is coordinate-based, not logical — well-documented limitation (HIGH confidence)
- Intl.Segmenter MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter (MEDIUM confidence — grapheme segmenter for Unicode word splitting; browser support is now broad as of 2024+)

**Confidence Note:** WebSearch and WebFetch tools were unavailable during this research session. All findings are from training data (cutoff August 2025). iOS Web Share Target non-support, WASM bundle size patterns, timer drift behavior, and ORP calculation issues are well-established and documented. Recommend verifying iOS Safari Web Share Target status against current iOS release notes at implementation time, as this is the most likely area where status could have changed.

---
*Pitfalls research for: RSVP Speed Reading PWA (Rust/WASM + React/TypeScript)*
*Researched: 2026-02-23*
