# Feature Research

**Domain:** RSVP Speed Reading PWA
**Researched:** 2026-02-23
**Confidence:** MEDIUM (training data; WebSearch/WebFetch unavailable — flag for verification)

---

## Research Notes

WebSearch and WebFetch tools were unavailable during this research session. All findings
are from training data on Spritz (2014–2024), Spreeder (2007–present), Reedy (Android),
ReadMe! (iOS), and BeeLine Reader. These apps are well-documented in app store reviews,
academic papers on RSVP reading, and developer communities. Confidence noted per section.

**Confidence rating methodology:**
- MEDIUM: Training data on widely-documented commercial apps. Likely accurate for
  established features; may miss recent additions (last 6–18 months).
- LOW: Inferred from patterns or single sources.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Word-by-word RSVP display | Core reading mechanic — it IS the app | LOW | Single word centered at fixed screen position |
| ORP focal point alignment | Spritz popularized this; users who know RSVP expect it | MEDIUM | ORP is ~30% from word start, not geometric center — character at that position displayed in red/highlighted; word split into left+ORP+right |
| Adjustable WPM speed | Every RSVP app has this; users tune to comfort | LOW | Slider or +/- buttons; common range 100–1000 WPM; sweet spot 250–400 for most users |
| Play / Pause | Fundamental control; users need to stop and think | LOW | Spacebar on desktop, tap on mobile |
| Jump backward (rewind) | Users miss words and need to re-read | LOW | Typically 5–10 word rewind; some apps do sentence-level |
| Jump forward (skip) | Users want to skip known passages | LOW | Less critical than rewind but expected |
| Text import via paste | Lowest-friction input; every app supports it | LOW | Plain textarea; handle newlines gracefully |
| Progress indicator | Users need to know how far through they are | LOW | Word count / percentage / estimated time remaining |
| Font size control | Readability varies by device/user | LOW | Applies to the RSVP word display |
| Dark mode / light mode | Users read at night; eye comfort | LOW | System preference respected + manual toggle |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Web Share Target (PWA) | Share any webpage directly from browser into reader — zero friction | MEDIUM | Requires manifest `share_target` entry + service worker intercept; Android/desktop Chrome works well; iOS Safari limited |
| PDF / EPUB / DOCX import | Users have documents, not just text; most RSVP apps are text-paste-only | HIGH | Rust WASM parsers (pdf-extract, epub crate, docx crate) handle this well; text extraction quality varies by file type |
| Dual-view: RSVP + scrollable full text | Context awareness — see what you're reading in the word stream | MEDIUM | RSVP word display on top; full text below dimmed during play, current word highlighted; lets users orient in document |
| Full text scroll dimming | Signals "reading mode" without hiding context | LOW | CSS opacity/filter on text area; toggle on play/pause |
| Sentence-level pause / chunking | Pausing at punctuation gives cognitive breathing room | MEDIUM | Detect sentence-end punctuation (`.!?`); insert pause multiplier (e.g. 2–3x word duration); dramatically improves comprehension |
| Comma/semicolon slow-down | Clause boundaries benefit from brief pause | LOW | Insert 1.5x duration multiplier at `,;:` |
| Word-length speed normalization | Long words need more display time than short words | LOW | Display time scales with word length; prevents long words flashing past too fast; Spritz uses this |
| Chunk mode (2–3 words at once) | Some users prefer small groups; reduces ORP complexity | MEDIUM | Toggle between 1-word and 2–3-word chunks; ORP alignment less critical in chunk mode |
| Keyboard shortcuts | Power users read faster with keyboard control | LOW | Space = play/pause; arrows = skip back/forward; +/- = speed |
| Installable PWA (offline capable) | Works without network after install; feels like a real app | MEDIUM | Service worker caching for app shell; imported docs stored in IndexedDB |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for v1 scope.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Reading history / library | Users want to resume books | Requires persistent storage design, sync decisions, and substantially more UX; blows up scope | Session-only for v1; save position in URL hash or localStorage as minimal bridge |
| User accounts / cloud sync | Multi-device access | No backend = no accounts; auth adds months of work | Explicitly out of scope; frame as "personal tool" |
| Social / sharing reading stats | Gamification appeal | Requires backend, privacy considerations; distracts from core reading | Not in roadmap; not a personal-tool priority |
| AI-powered summarization | "Read smarter" appeal | Expensive API dependency, latency, complexity; core value is speed not summarization | Separate tool concern; keep RSVP pure |
| Text-to-speech fallback | Accessibility appeal | Different modality entirely; doubles UI complexity | Not RSVP; explicit out-of-scope |
| Browser extension | More convenient than Share Target | Separate codebase, separate release process, Manifest V3 complexity | PWA share target covers the same use case on Android/desktop |
| Annotation / highlighting | Power-user appeal | Storage, sync, UX complexity; reading mode is incompatible with annotation intent | Explicitly defer; defeats the "speed" framing |
| Variable font rendering (e.g. BeeLine) | BeeLine Reader's colored gradient guides eye across lines | Different reading paradigm — not RSVP; users of one rarely want the other | BeeLine is for normal reading, not for RSVP mode |

---

## Feature Dependencies

```
[Web Share Target]
    └──requires──> [Service Worker registration]
                       └──requires──> [PWA manifest with share_target]

[PDF/EPUB/DOCX import]
    └──requires──> [Rust WASM document parser]
                       └──requires──> [WASM build pipeline]

[Dual-view: RSVP + full text]
    └──requires──> [Token/word array with position tracking]
                       └──requires──> [Text tokenizer]

[Current word highlight in full text]
    └──requires──> [Dual-view: RSVP + full text]

[Full text dimming during playback]
    └──requires──> [Play/pause state management]

[Sentence-level pause]
    └──requires──> [Text tokenizer with punctuation metadata]

[ORP alignment (Spritz-style)]
    └──requires──> [Per-word character position calculation]

[Word-length speed normalization]
    └──requires──> [Per-word duration calculation]
    └──enhances──> [Adjustable WPM speed] (WPM becomes a baseline, not literal)

[Progress indicator]
    └──requires──> [Token/word array with position tracking]

[Jump backward / forward]
    └──requires──> [Token/word array with position tracking]
```

### Dependency Notes

- **Web Share Target requires Service Worker:** The `share_target` in the PWA manifest
  sends shared content to a URL handled by the service worker before the page loads. This
  means service worker infrastructure must exist before Share Target works.

- **PDF/EPUB/DOCX import requires Rust WASM:** The PROJECT.md decision is Rust for
  document processing. This introduces a WASM build pipeline dependency (wasm-pack or
  similar) that affects the project setup phase, not just the feature phase.

- **Dual-view requires a word index:** Both the RSVP display and the full-text highlight
  must share a single word-position index. Building this correctly from the start avoids
  a rewrite when dual-view is added.

- **ORP alignment requires character-level math per word:** The ORP position (approx 30%
  from start, minimum 1, maximum scales with length) must be computed for every word.
  This is stateless per-word computation — not complex, but must be correct from day 1
  since it's the core visual mechanic.

- **Sentence pauses require tokenizer metadata:** Simple `split(" ")` tokenization loses
  punctuation context. The tokenizer should emit tokens with attached punctuation flags
  to enable pause multipliers without a second parsing pass.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] ORP word display (fixed focal point, left/ORP-char/right split, red focal char) — the core mechanic
- [ ] Adjustable WPM (slider, 100–800 range) — useless without speed control
- [ ] Play / Pause — fundamental interaction
- [ ] Jump backward 5 words — users WILL miss words and need rewind
- [ ] Text paste import — lowest-friction content input; validates reading experience before complex parsing
- [ ] Web Share Target — the "zero friction" promise of the app; core differentiator
- [ ] PDF import via Rust WASM — document import is core value proposition per PROJECT.md
- [ ] Dual-view (RSVP + scrollable full text, current word highlighted, dimmed during play) — PROJECT.md explicitly requires this
- [ ] Progress indicator (word N of M, estimated time remaining) — users need orientation
- [ ] PWA manifest + service worker (installable, offline app shell) — platform requirement
- [ ] Responsive layout (desktop + mobile) — PROJECT.md constraint

### Add After Validation (v1.x)

Features to add once core reading experience is working.

- [ ] EPUB import — high-value document type; add after PDF pipeline is proven
- [ ] DOCX import — useful but lower priority than PDF/EPUB
- [ ] Sentence-level pause multiplier — comprehension aid; add when users report losing context
- [ ] Word-length duration normalization — quality-of-life improvement; add when WPM calibration is working
- [ ] Comma/clause slowdown — minor quality improvement
- [ ] Jump forward N words — less critical than jump back; add when rewind is validated
- [ ] Font size control for RSVP display — accessibility; add when display is stable
- [ ] Keyboard shortcuts (Space, arrows, +/-) — power user feature; add after basic controls work

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Chunk mode (2–3 words) — different reading paradigm; defer until 1-word mode is excellent
- [ ] Reading session history (localStorage, no sync) — only valuable once users return repeatedly
- [ ] Custom color themes / ORP color customization — personalization; low impact on core value
- [ ] WASM worker threading for large document parsing — performance optimization; defer until needed

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| ORP word display | HIGH | LOW | P1 |
| Play / Pause + WPM control | HIGH | LOW | P1 |
| Jump backward | HIGH | LOW | P1 |
| Text paste import | HIGH | LOW | P1 |
| Web Share Target | HIGH | MEDIUM | P1 |
| PDF import (Rust WASM) | HIGH | HIGH | P1 |
| Dual-view (RSVP + full text) | HIGH | MEDIUM | P1 |
| Progress indicator | MEDIUM | LOW | P1 |
| PWA installable | HIGH | MEDIUM | P1 |
| EPUB import | MEDIUM | MEDIUM | P2 |
| DOCX import | MEDIUM | MEDIUM | P2 |
| Sentence-level pause | MEDIUM | LOW | P2 |
| Word-length normalization | MEDIUM | LOW | P2 |
| Keyboard shortcuts | MEDIUM | LOW | P2 |
| Font size control | LOW | LOW | P2 |
| Jump forward | LOW | LOW | P2 |
| Chunk mode (2–3 words) | LOW | MEDIUM | P3 |
| Session history | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Spritz | Spreeder | Reedy (Android) | ReadMe! (iOS) | Our Approach |
|---------|--------|----------|-----------------|---------------|--------------|
| ORP focal alignment | Yes (patent holder) | No (centered) | Yes (ORP-style) | Yes | Yes — ORP with ~30% position |
| Adjustable WPM | Yes | Yes | Yes | Yes | Yes |
| Play/Pause | Yes | Yes | Yes | Yes | Yes |
| Rewind | Sentence-level | Yes | Yes | Yes | 5-word rewind |
| Text paste | Yes | Yes | Yes | Yes | Yes |
| PDF import | Partial (via SDK) | Paid tier | Yes | Yes | Yes (Rust WASM) |
| EPUB import | No | No | Yes | Yes | v1.x |
| Web Share Target | No | No | Android share | No | Yes — key differentiator |
| PWA / installable | No (SDK only) | Partial | Native app | Native app | Yes |
| Dual-view (full text) | No | Spreeder CX yes | Yes | Yes | Yes |
| Chunk mode | No | Yes | Yes | No | P3 defer |
| User accounts | Yes (SDK) | Yes | Yes | Yes | No — out of scope |
| Dark mode | Yes | Yes | Yes | Yes | Yes (system preference) |
| Word-length normalization | Yes | Yes | Unknown | Unknown | v1.x |

**Confidence:** MEDIUM. Competitor feature sets are from training data and may have changed. Spreeder and Reedy in particular update frequently.

---

## ORP Implementation Detail

The ORP (Optimal Recognition Point) is the specific character position where the human
visual system most efficiently recognizes a word. Spritz's research places it at roughly
the 30% position from the word's start (not the geometric center).

**Formula (from Spritz patent / published research, MEDIUM confidence):**

```
word_length    ORP character index (1-based)
1              1
2              1
3              1
4              2
5              2
6              2
7              3
8              3
9              3
10             4
11             4
12+            4 (capped)
```

**Display format:**
```
[left chars][ORP char in red][right chars]
    "quick" → "qui" + "c" + "k"
```

The three segments are rendered in fixed-width containers aligned so the ORP char
always appears at exactly the same screen pixel column. This eliminates saccades.

**PWA implementation note:** Use CSS `text-align: right` for left segment, no alignment
for ORP char, `text-align: left` for right segment, all in a flex row with fixed widths
calculated from font metrics and the longest expected word length.

---

## Reading Controls: Common UX Patterns

Based on Reedy, Spreeder, and ReadMe! analysis (MEDIUM confidence — training data):

**Speed adjustment:**
- Slider with live preview (update speed without stopping)
- +/- step buttons (typically 25 WPM increments)
- Presets: Slow (150), Normal (250), Fast (400), Speed (600)

**Playback:**
- Tap/click center = play/pause (mobile-friendly hit target)
- Tap left of center = rewind; tap right = forward (gesture zone split)
- Keyboard: Space = play/pause, left arrow = back, right arrow = forward

**Navigation granularity (in order of user importance):**
1. Sentence back (most useful — go back to last thought)
2. 5–10 word back (catch a missed word)
3. Sentence forward (skip known passage)
4. 5–10 word forward (less common)

**Recommendation for v1:** Implement 5-word back as the only skip control. It satisfies
the dominant use case without requiring sentence boundary detection in the tokenizer.
Add sentence-level navigation in v1.x once tokenizer has punctuation metadata.

---

## Document Import: Expected UX Patterns

**File drag-and-drop:** Users drag a PDF onto the app window. Simple, expected on desktop.

**File picker button:** "Open file" button as fallback for drag-and-drop.

**Share Target flow (Android/desktop Chrome):**
1. User shares webpage from browser → selects this PWA
2. PWA receives URL via `navigator.share` target
3. App fetches page HTML, strips boilerplate (Readability.js or similar), extracts article text
4. Tokenizes and begins RSVP session

**Clipboard paste:** User copies text anywhere, pastes into a text area in the app.
Lowest friction, highest compatibility — required even if other import methods work.

**Expected processing feedback:**
- Loading spinner for large PDFs (Rust WASM parsing can take 1–3s for large docs)
- Word count shown after import ("Loaded 12,450 words — ~49 minutes at 250 WPM")
- Error message if file format unsupported or parsing fails

---

## Sources

- Training data on Spritz (spritzinc.com, 2014–2024 — ORP patent and research)
- Training data on Spreeder (spreeder.com — feature set as of ~2024)
- Training data on Reedy Android app (Google Play listing, user reviews ~2023–2024)
- Training data on ReadMe! iOS app (App Store listing ~2023–2024)
- Training data on BeeLine Reader (beelinereader.com — noted as different paradigm)
- Spritz ORP formula: derived from Spritz patent filings and academic coverage
- PWA Share Target: MDN Web Docs / web.dev documentation (well-documented API)

**Note:** WebSearch and WebFetch were unavailable. All findings are MEDIUM confidence
(training data, well-documented domain). Recommend verifying competitor feature sets
against current app store listings before finalizing roadmap.

---

*Feature research for: RSVP Speed Reading PWA*
*Researched: 2026-02-23*
