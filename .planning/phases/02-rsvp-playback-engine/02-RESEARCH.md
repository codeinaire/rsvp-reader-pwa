# Phase 2: RSVP Playback Engine - Research

**Researched:** 2026-02-25
**Domain:** RSVP timing scheduler, ORP layout, Zustand state management, keyboard controls
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Word display appearance**
- Monospace font — keeps the ORP focal character column visually stable as words change
- Large and prominent display — ~4-6rem font size, reading is the primary action
- Left/right fragments shown at full weight (same as normal text); only the color distinguishes the focal character (fragments black/white, focal character red)
- Word display sits on a dark background card/panel — better eye comfort for extended reading, red focal pops more on dark

**Controls layout**
- Playback controls (<<, |>, >>) and WPM slider sit in a single row directly below the dark word panel
- Single row layout: `[<<] [|>] [>>]  [----slider----]  200`
- Progress indicator sits above the word display panel
- Progress format: "Word 142 / 3,420 (45%)" — both absolute position and relative progress

**Jump behavior**
- Jump by fixed word count, not by sentence
- Default jump distance: 10 words per press
- Jump count is adjustable inline/in-session (small controls next to the << >> buttons, not buried in settings)
- Arrow key mapping: Left = jump back N words, Right = jump forward N words, Space = pause/resume
- Boundary behavior: clamp at start/end (jump back past word 1 lands on word 1; jump past last word lands on last word)

**WPM speed controls**
- Default starting speed: 250 WPM
- Slider range: 50 – 1000 WPM
- Preset quick-select buttons alongside the slider: [200] [300] [500]
- Last-used WPM persists across sessions via localStorage

### Claude's Discretion
- Exact slider step increment (10 or 25 WPM per tick)
- Visual design of the dark panel (border radius, padding, exact dimensions)
- Animation/transition when word changes (instant vs brief fade)
- How the inline jump-size adjustment control looks
- Timing algorithm details (how sentence pauses and word-length normalization are calculated)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RSVP-01 | User sees one word at a time in a 3-span ORP display (left fragment, red focal character, right fragment) with the focal character held at the same fixed screen position for every word | ORP index formula + monospace font + CSS grid/flex layout pattern |
| RSVP-02 | Playback pauses briefly at sentence-ending punctuation (periods, question marks, exclamation marks) for natural reading rhythm | Timing multiplier formula: 1.5× base delay on sentence-ending characters |
| RSVP-03 | Words longer than average are displayed proportionally slower than the WPM setting (word-length normalization) | Length-category multiplier table documented in Architecture Patterns |
| RSVP-04 | User can see reading progress (word X of Y and % complete) during RSVP playback | Zustand currentWordIndex selector, formatted display string |
| CTRL-01 | User can adjust reading speed via a WPM slider | HTML input[type=range] with Tailwind styling, Zustand wpm field, immediate scheduler effect |
| CTRL-02 | User can pause and resume RSVP playback | isPlaying toggle in Zustand, performance.now() deadline scheduler pause/resume pattern |
| CTRL-03 | User can jump backward or forward through content (fixed word count) | clamp(index ± jumpSize, 0, wordList.length - 1), inline jump-size stepper |
| CTRL-04 | User can control playback via keyboard shortcuts (space pause/resume, arrow keys jump) | useEffect keydown listener with ref-bridged handler for stale-closure safety |
</phase_requirements>

---

## Summary

Phase 2 replaces the `RSVPPlaceholder` component at `/read` with a fully functional RSVP reading engine. The core challenges are: (1) accurate non-drifting timing that survives background-tab throttling, (2) correct ORP character positioning using grapheme clusters, and (3) a CSS layout that holds the focal character column at an absolutely fixed horizontal position regardless of word length.

The project already uses React 19, Zustand 5, Tailwind CSS 4 (via `@tailwindcss/vite`), and React Router 7 — no new dependencies are required for the core engine. The only potentially new dependency is Zustand's built-in `persist` middleware (already bundled in zustand) for WPM localStorage persistence. Everything else is vanilla React + built-in browser APIs (`performance.now()`, `Intl.Segmenter`, `Page Visibility API`).

The timing scheduler must be built around `performance.now()` deadline tracking, not `setInterval` counters. The project's STATE.md has already locked this as an architecture decision. The `visibilitychange` event must auto-pause playback to avoid a word burst when the user returns to the tab.

**Primary recommendation:** Build an `RSVPReader` component that owns a `useCallback`-based scheduler using `setTimeout` with `performance.now()` deadline correction, a Zustand playback store with `persist` middleware for WPM, and a fixed-width CSS grid ORP display using monospace font. No new npm packages are needed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 (installed) | Component rendering, hooks | Already in project |
| Zustand | 5.0.11 (installed) | Playback state (wpm, isPlaying, currentWordIndex, jumpSize) | Already in project, persist middleware built-in |
| Tailwind CSS 4 | via @tailwindcss/vite 4.2.0 (installed) | Styling — dark panel, controls, slider | Already in project |
| React Router 7 | 7.13.0 (installed) | `/read` route already exists | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Intl.Segmenter` (built-in) | Browser API, Baseline 2024 | Grapheme cluster splitting for correct ORP index | Always — never use raw `.length` for ORP calculation |
| `performance.now()` (built-in) | Browser API | High-resolution timestamps for drift-free timing | Always — never use `Date.now()` for scheduler |
| `Page Visibility API` (built-in) | Browser API | Auto-pause on background tab | Always — prevents word burst on tab return |
| `localStorage` (built-in) | Browser API | Persist WPM via Zustand persist middleware | For WPM only, per requirement |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `performance.now()` deadline scheduler | `setInterval` | setInterval drifts — 100-word session at 300 WPM accumulates ~1s of drift. Rejected per STATE.md architecture decision. |
| `Intl.Segmenter` for grapheme ORP | Raw `.length` index | Raw index gives wrong position for accented chars, emoji, Unicode. Rejected per STATE.md architecture decision. |
| Zustand `persist` middleware | Manual `localStorage.getItem/setItem` | Persist middleware handles hydration race, serialization, versioning. No reason to hand-roll. |
| Plain `input[type=range]` | Radix Slider | Radix is already installed (`@radix-ui/react-progress`), but the WPM slider is simple enough that a plain `input[type=range]` styled with Tailwind is less overhead. Either works. |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── RSVPReader/
│   │   ├── RSVPReader.tsx          # Top-level screen at /read (replaces RSVPPlaceholder)
│   │   ├── ORPDisplay.tsx          # Three-span word display
│   │   ├── PlaybackControls.tsx    # << [|>] >> slider preset-buttons + jump-size stepper
│   │   └── ProgressBar.tsx         # "Word 142 / 3,420 (45%)" row
│   ├── RSVPPlaceholder/            # DELETED or replaced
│   └── ...
├── lib/
│   ├── tokenize.ts                 # Already exists
│   ├── orp.ts                      # NEW: computeOrpIndex(word) → {left, focal, right}
│   └── scheduler.ts                # NEW: computeWordDelay(word, wpm) → ms
└── store/
    └── rsvp-store.ts               # EXTENDED: add wpm, isPlaying, currentWordIndex, jumpSize
```

### Pattern 1: ORP Index Computation

**What:** Split a word string into three fragments — left, focal character, right — using grapheme clusters so Unicode characters are counted correctly.

**When to use:** Every word render in `ORPDisplay`.

**Formula:**
- Grapheme count 1: index 0
- Grapheme count 2: index 0
- Grapheme count 3–6: index 1
- Grapheme count 7–9: index 2
- Grapheme count 10+: index 3

This matches the formula locked in STATE.md: `Math.max(0, Math.ceil(graphemes.length * 0.3) - 1)` and aligns with community implementations (quickreader, Spritz-style).

**Example:**
```typescript
// src/lib/orp.ts
export interface OrpFragments {
  left: string
  focal: string
  right: string
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export function computeOrp(word: string): OrpFragments {
  const graphemes = [...segmenter.segment(word)].map((s) => s.segment)
  const orp = Math.max(0, Math.ceil(graphemes.length * 0.3) - 1)
  return {
    left: graphemes.slice(0, orp).join(''),
    focal: graphemes[orp] ?? '',
    right: graphemes.slice(orp + 1).join(''),
  }
}
```

### Pattern 2: Fixed ORP Column Layout

**What:** CSS layout that keeps the focal character at an absolutely fixed horizontal pixel position, regardless of how many left-fragment characters precede it.

**Why monospace is critical:** In a monospace font every grapheme occupies exactly one character-width. This means the focal character's left edge is always at `orp_index * char_width` pixels from the left edge of the text block — a visually stable column.

**Implementation using CSS Grid:**
The container is a fixed-width CSS grid. The left fragment is right-aligned in a fixed-width left column; the focal character occupies a center cell; the right fragment is left-aligned in a fixed-width right column.

```typescript
// src/components/RSVPReader/ORPDisplay.tsx
// The container width must accommodate the longest possible word.
// At 4rem monospace, each char is ~2.4rem wide.
// A fixed grid approach:
//   grid-cols: [left-col] [focal-col] [right-col]
//   left-col: fixed width (e.g., 12ch) — fragment right-aligned
//   focal-col: 1ch — center char
//   right-col: fixed width (e.g., 18ch) — fragment left-aligned

export function ORPDisplay({ word }: { word: string }) {
  const { left, focal, right } = computeOrp(word)
  return (
    <div
      className="font-mono grid items-center"
      style={{ gridTemplateColumns: '12ch 1ch 18ch', fontSize: '4.5rem' }}
    >
      <span className="text-right text-white">{left}</span>
      <span className="text-red-500">{focal}</span>
      <span className="text-left text-white">{right}</span>
    </div>
  )
}
```

**Note on column widths:** The left column must be wide enough to hold the left fragment of the longest expected word. For most English text, 12ch left + 1ch focal + 18ch right handles 20+ character words (31ch total capacity). These values are for Claude's discretion and should be tuned during implementation.

### Pattern 3: performance.now() Deadline Scheduler (No Drift)

**What:** A timer that schedules each word display by computing the absolute deadline (in ms) for when the *next* word should appear, then scheduling `setTimeout` for the remaining time. Pause stores `elapsedAtPause`; resume recalculates `startTime`.

**Why this doesn't drift:** Each `setTimeout` fires at most a few ms late. Instead of accumulating that error (counter * interval), we always compute the *next absolute deadline* from the original start time. Late firings do not compound.

**Example:**
```typescript
// src/lib/scheduler.ts
export function computeWordDelay(word: string, wpm: number): number {
  const baseMs = 60_000 / wpm  // ms per word at target WPM

  // Word-length normalization multiplier
  const len = word.replace(/[^a-zA-Z]/g, '').length  // count letters only
  let lengthMultiplier = 1.0
  if (len <= 2) lengthMultiplier = 0.8
  else if (len <= 6) lengthMultiplier = 1.0
  else if (len <= 9) lengthMultiplier = 1.2
  else lengthMultiplier = 1.5

  // Sentence-ending pause (applied to the CURRENT word, pausing before advancing)
  const hasSentenceEnd = /[.!?]$/.test(word.trimEnd())
  const sentenceMultiplier = hasSentenceEnd ? 1.5 : 1.0

  return baseMs * lengthMultiplier * sentenceMultiplier
}
```

```typescript
// In RSVPReader component — scheduler hook (simplified)
// Store refs to avoid stale closure in timer callbacks.
const wordListRef = useRef<string[]>(wordList)
const wpmRef = useRef<number>(wpm)
const isPlayingRef = useRef<boolean>(isPlaying)
// ... keep refs in sync via useEffect

// The scheduler advances by scheduling ONE word at a time:
//   1. Display currentWord
//   2. Compute delay for currentWord
//   3. setTimeout(advanceWord, delay)
// On pause: clear the pending setTimeout, store currentIndex
// On resume: re-schedule from currentIndex immediately
```

### Pattern 4: Zustand Store Extension

**What:** Add playback fields to `rsvp-store.ts`. WPM is persisted via Zustand's built-in `persist` middleware; other playback state is ephemeral.

**Example:**
```typescript
// src/store/rsvp-store.ts (extended)
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Playback state (not persisted — resets each session)
interface PlaybackSlice {
  currentWordIndex: number
  isPlaying: boolean
  jumpSize: number  // default: 10
  setCurrentWordIndex: (index: number) => void
  setIsPlaying: (playing: boolean) => void
  setJumpSize: (size: number) => void
}

// WPM state (persisted to localStorage)
interface SettingsSlice {
  wpm: number
  setWpm: (wpm: number) => void
}
```

**Note:** Keep document state (wordList, documentTitle, isWorkerReady) and playback state in the same store or separate stores — both patterns work with Zustand 5. The simplest approach is one store with all fields, using `persist` with `partialize` to persist only `wpm`.

```typescript
// Persisting only wpm field:
export const useRsvpStore = create<RsvpStore>()(
  persist(
    (set) => ({
      // ...all fields...
    }),
    {
      name: 'rsvp-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ wpm: state.wpm }),
    }
  )
)
```

### Pattern 5: Keyboard Shortcut Handler (Stale Closure Safe)

**What:** Register a `keydown` listener on `window` that reads the latest handler via a ref, avoiding stale closures.

**When to use:** RSVPReader is mounted at `/read`. The handler must NOT fire when the user is typing in an input field (e.g., if navigation lands them here via keyboard).

```typescript
// In RSVPReader.tsx
useEffect(() => {
  function handleKey(e: KeyboardEvent) {
    // Don't fire shortcuts when focus is in an input/textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (e.key === ' ') {
      e.preventDefault()
      togglePlayback()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      jumpBackward()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      jumpForward()
    }
  }
  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}, [togglePlayback, jumpBackward, jumpForward])
// togglePlayback/jumpBackward/jumpForward wrapped in useCallback with correct deps
```

### Pattern 6: Background Tab Auto-Pause

**What:** Listen to `visibilitychange`; auto-pause on hide, auto-resume (or show "Paused") on show.

**Why critical:** If the user switches tabs and comes back, the scheduler has a setTimeout pending from 2 minutes ago that fires instantly, bursting through many words. Auto-pausing on hide prevents this.

```typescript
useEffect(() => {
  function handleVisibility() {
    if (document.hidden && isPlayingRef.current) {
      pausePlayback()
    }
  }
  document.addEventListener('visibilitychange', handleVisibility)
  return () => document.removeEventListener('visibilitychange', handleVisibility)
}, [pausePlayback])
```

### Anti-Patterns to Avoid

- **`setInterval` for word timing:** Accumulates drift. Use one `setTimeout` at a time, scheduled from a deadline. Rejected per STATE.md architecture decision.
- **Raw `.length` for ORP index:** Produces wrong position for accented characters, emoji, ligatures. Always use `Intl.Segmenter`. Rejected per STATE.md architecture decision.
- **Reading `isPlaying` / `wpm` directly inside timer callback:** Stale closure — the setTimeout captures the value at schedule time, not at fire time. Always read via refs that are kept current with `useEffect`.
- **Not clamping jump boundaries:** Jumping backward from word 0 or forward past last word crashes with negative index or undefined word. Always clamp: `Math.max(0, Math.min(wordList.length - 1, newIndex))`.
- **Not clearing pending setTimeout on unmount:** Memory leak + phantom word advance after navigation away. Always return cleanup from the scheduling `useEffect`.
- **Advancing past end without stopping:** If `currentWordIndex === wordList.length - 1` and scheduler fires, set `isPlaying = false` instead of advancing. Playback stops at last word.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WPM localStorage persistence | Manual `useEffect` with `localStorage.setItem` | Zustand `persist` middleware with `partialize` | Handles hydration timing, serialization, version migration, SSR safety |
| Grapheme-aware string splitting | Custom Unicode regex splitter | `Intl.Segmenter` (built-in, Baseline 2024) | Correctly handles emoji, accented chars, combining marks — impossible to get right with regex |

**Key insight:** The timing scheduler itself (performance.now() + setTimeout) must be hand-rolled — there is no library that abstracts RSVP-specific word scheduling with length normalization. But the supporting pieces (persistence, Unicode) should use built-ins.

---

## Common Pitfalls

### Pitfall 1: Stale Closure in Timer Callbacks

**What goes wrong:** `wpm` or `isPlaying` read inside a `setTimeout` callback reflect the value from when the closure was created, not the current value. Changing WPM mid-session appears to have no effect until the next play/pause cycle.

**Why it happens:** JavaScript closures capture variables by reference in outer scope, but `const wpm = ...` in a React render creates a new binding each render — the timeout captures the old binding.

**How to avoid:** Store the live value in a ref (`wpmRef.current`) and read `wpmRef.current` inside the timer callback. Update the ref in `useEffect` whenever the Zustand selector changes.

**Warning signs:** WPM change seems to take effect only after pause/resume. Speed appears stuck after live slider change.

### Pitfall 2: setTimeout Drift on Slow Machines or Active Tabs

**What goes wrong:** On slow machines or tabs with heavy JS activity, `setTimeout(fn, 200)` fires at 250ms. After 100 words, timing is off by several seconds.

**Why it happens:** `setTimeout` guarantees *at least* the delay, not exactly. Accumulated small overruns compound.

**How to avoid:** Use deadline scheduling. Track `wordStartedAt = performance.now()` when each word is shown. Compute `elapsed = performance.now() - wordStartedAt`. Schedule next word with `setTimeout(fn, targetDelay - elapsed)`, floored at 0.

**Warning signs:** At 300 WPM, a 100-word passage takes noticeably longer than 20 seconds.

### Pitfall 3: ORP Column Shifts on Word Change

**What goes wrong:** The focal character visibly jumps left or right between words because the left fragment width is not fixed.

**Why it happens:** Using `text-align: center` on a flex container centers the entire word, not the focal character. The focal character position varies with left fragment length.

**How to avoid:** Use CSS Grid with fixed-width columns. Left column: fixed width, `text-align: right`. Focal column: fixed width. Right column: fixed width, `text-align: left`. With monospace font, character widths are uniform and the focal character is always at the same pixel position.

**Warning signs:** The red character appears to drift left/right as you watch words flash by, especially when transitioning from a short word (e.g., "I") to a long word (e.g., "transformation").

### Pitfall 4: Word Burst After Background Tab Return

**What goes wrong:** User switches tabs for 30 seconds, returns. Scheduler fires immediately and advances through ~150 words in a flash before pausing.

**Why it happens:** `setTimeout` callbacks that were pending while the tab was throttled fire immediately on tab focus. The scheduler had queued a 30-second worth of "next word" callbacks.

**How to avoid:** Listen to `document.addEventListener('visibilitychange')`. When `document.hidden` becomes true and `isPlaying` is true, cancel the pending timeout and set `isPlaying = false`. This is a known pitfall in STATE.md.

**Warning signs:** After returning to the tab, several words flash rapidly before playback stabilizes.

### Pitfall 5: Keyboard Space Bar Triggers Button Click + Pause

**What goes wrong:** Pressing Space to pause/resume also "clicks" whatever button currently has focus, causing double-action (e.g., pause + navigate backward).

**Why it happens:** Browsers fire click events on focused buttons when Space is pressed. If the playback button has focus, both the `keydown` handler and the button's `onClick` fire.

**How to avoid:** Call `e.preventDefault()` in the `keydown` handler for Space. Or ensure the playback area removes focus from buttons after interaction. Document this in the component.

**Warning signs:** Playback starts and immediately stops when Space is pressed.

### Pitfall 6: TypeScript erasableSyntaxOnly — No Enum

**What goes wrong:** Using TypeScript `enum` for state types (e.g., `PlaybackState.Playing`) causes a build error.

**Why it happens:** The project has `erasableSyntaxOnly: true` in tsconfig (confirmed in STATE.md decision log). This forbids runtime enum emit.

**How to avoid:** Use `const` object with type alias: `const PlaybackState = { Playing: 'playing', Paused: 'paused' } as const; type PlaybackState = typeof PlaybackState[keyof typeof PlaybackState]`

---

## Code Examples

Verified patterns from official sources and project conventions:

### Zustand persist middleware with partialize (WPM only)
```typescript
// Source: https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useRsvpStore = create<RsvpStore>()(
  persist(
    (set) => ({
      wpm: 250,            // persisted
      isPlaying: false,    // ephemeral — NOT persisted
      currentWordIndex: 0, // ephemeral — NOT persisted
      jumpSize: 10,        // ephemeral — NOT persisted
      // ...
      setWpm: (wpm) => set({ wpm }),
    }),
    {
      name: 'rsvp-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ wpm: state.wpm }),
    }
  )
)
```

### Intl.Segmenter ORP computation
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter
// Baseline 2024 — no polyfill needed for modern browsers
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export function computeOrp(word: string): { left: string; focal: string; right: string } {
  const graphemes = [...segmenter.segment(word)].map((s) => s.segment)
  const orpIndex = Math.max(0, Math.ceil(graphemes.length * 0.3) - 1)
  return {
    left: graphemes.slice(0, orpIndex).join(''),
    focal: graphemes[orpIndex] ?? '',
    right: graphemes.slice(orpIndex + 1).join(''),
  }
}
```

### Deadline-corrected word scheduler (performance.now())
```typescript
// Source: performance.now() MDN + project STATE.md architecture decision
// Pattern: one setTimeout at a time, corrected by actual elapsed time

function useRsvpScheduler(
  wordList: string[],
  wpm: number,
  isPlaying: boolean,
  currentWordIndex: number,
  onAdvance: (nextIndex: number) => void,
  onComplete: () => void,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wpmRef = useRef(wpm)
  const isPlayingRef = useRef(isPlaying)
  const wordListRef = useRef(wordList)
  const startedAtRef = useRef<number>(0)

  // Keep refs current
  useEffect(() => { wpmRef.current = wpm }, [wpm])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { wordListRef.current = wordList }, [wordList])

  const scheduleNext = useCallback((index: number, scheduledAt: number) => {
    const word = wordListRef.current[index]
    if (!word) { onComplete(); return }

    const targetDelay = computeWordDelay(word, wpmRef.current)
    const elapsed = performance.now() - scheduledAt
    const remaining = Math.max(0, targetDelay - elapsed)

    timeoutRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return
      const nextIndex = index + 1
      if (nextIndex >= wordListRef.current.length) {
        onComplete()
        return
      }
      onAdvance(nextIndex)
      scheduleNext(nextIndex, performance.now())
    }, remaining)
  }, [onAdvance, onComplete])

  // Start/stop scheduler when isPlaying changes
  useEffect(() => {
    if (isPlaying) {
      scheduleNext(currentWordIndex, performance.now())
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isPlaying]) // intentionally not including currentWordIndex here — pause/resume handles that

  return { cancel: () => clearTimeout(timeoutRef.current ?? 0) }
}
```

### WPM to ms delay computation with normalization
```typescript
// src/lib/scheduler.ts
// Claude's discretion: exact multipliers — these are reasonable starting values
export function computeWordDelay(word: string, wpm: number): number {
  const baseMs = 60_000 / wpm

  // Strip punctuation for length measurement
  const letters = word.replace(/\W/g, '')
  const len = letters.length || 1

  let lengthMult = 1.0
  if (len <= 2) lengthMult = 0.8
  else if (len <= 6) lengthMult = 1.0
  else if (len <= 9) lengthMult = 1.2
  else lengthMult = 1.5

  // Sentence-ending pause on period, question mark, exclamation
  const sentenceMult = /[.!?]['"]?\s*$/.test(word) ? 1.5 : 1.0

  return baseMs * lengthMult * sentenceMult
}
```

### Tailwind range input styling (dark panel)
```tsx
// Native input[type=range] with Tailwind v4 utility classes
// No external slider library needed
<input
  type="range"
  min={50}
  max={1000}
  step={25}  // Claude's discretion: 25 WPM steps
  value={wpm}
  onChange={(e) => setWpm(Number(e.target.value))}
  className="flex-1 h-1.5 rounded-full appearance-none bg-gray-600
    [&::-webkit-slider-thumb]:appearance-none
    [&::-webkit-slider-thumb]:w-4
    [&::-webkit-slider-thumb]:h-4
    [&::-webkit-slider-thumb]:rounded-full
    [&::-webkit-slider-thumb]:bg-white
    cursor-pointer"
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setInterval` counter timing | `performance.now()` deadline scheduler | Web standards best practice | Eliminates drift, robust across slow machines |
| Raw `.length` for ORP | `Intl.Segmenter` grapheme clusters | Baseline 2024 | Correct Unicode support, no polyfill needed |
| `localStorage` manual get/set | Zustand `persist` middleware with `partialize` | Zustand 4+ | Handles hydration, versioning, serialization automatically |
| Zustand enum actions | `const` object with type alias | TypeScript 5.9 erasableSyntaxOnly | Required by project tsconfig |

**Deprecated/outdated:**
- `setInterval` for RSVP timing: Do not use. Replaced by setTimeout + deadline pattern per STATE.md.
- TypeScript `enum` keyword: Not allowed. Use `const` object with `as const` per STATE.md.

---

## Open Questions

1. **Scheduler hook architecture: single hook vs. class-based scheduler**
   - What we know: A custom `useRsvpScheduler` hook is the idiomatic React approach
   - What's unclear: Whether a scheduler class (instantiated outside React, driven by refs) would be simpler to test and reason about
   - Recommendation: Start with a custom hook. If testing becomes hard, extract to a class that the hook wraps.

2. **WPM change while playing: restart from current word or seamless?**
   - What we know: CONTEXT.md says "changing from 200 WPM to 500 WPM mid-session takes effect on the next word without restarting playback"
   - What's unclear: Whether to cancel the pending setTimeout immediately and reschedule with the new WPM on the next word, or let the current word finish at old WPM
   - Recommendation: Let current word finish at old WPM (don't cancel current timeout), then when advancing to next word use the current `wpmRef.current` to compute the new delay. This is the simplest implementation.

3. **Exact ORP grid column widths**
   - What we know: 12ch left + 1ch focal + 18ch right handles most English text
   - What's unclear: Whether very long technical/medical words (20+ chars) need more right-column space
   - Recommendation: Start with 14ch left + 1ch focal + 20ch right. If words overflow, increase right column. This is Claude's discretion.

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs — `Intl.Segmenter` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter — confirmed Baseline 2024, full browser support
- MDN Web Docs — `performance.now()` — https://developer.mozilla.org/en-US/docs/Web/API/Performance/now — confirmed high-resolution timestamp, no clock jumps
- MDN Web Docs — Page Visibility API — https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API — confirmed `visibilitychange` event + `document.hidden`
- Zustand official docs — persist middleware — https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md — confirmed `partialize`, `createJSONStorage`, synchronous hydration with localStorage
- Project `STATE.md` — architecture decisions — locked scheduler (performance.now()), locked ORP (Intl.Segmenter), locked formula (`ceil(len * 0.3) - 1`), locked TypeScript const objects

### Secondary (MEDIUM confidence)
- Chrome for Developers — Timer throttling in Chrome 88 — https://developer.chrome.com/blog/timer-throttling-in-chrome-88 — confirmed background tab throttling behavior and setTimeout clamping
- Nolan Lawson — Why browsers throttle timers — https://nolanlawson.com/2025/08/31/why-do-browsers-throttle-javascript-timers/ — 2025 article, confirms throttling behavior still active
- quickreader (GitHub coinstax/quickreader) — ORP length table: 1–2 chars → index 0; 3–6 → index 1; 7–9 → index 2; 10+ → index 3; sentence pause 1.5×; long word 1.2× — cross-validates project formula

### Tertiary (LOW confidence)
- Medium articles on React timer patterns — general pattern for useRef stale-closure bridge — consistent with React documentation but not from React official source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, versions confirmed in package.json
- Architecture: HIGH — scheduler pattern, ORP formula, keyboard pattern all verified against MDN + project STATE.md decisions
- Pitfalls: HIGH — drift pitfall, visibility pitfall, stale closure pitfall all verified against official browser docs and project STATE.md

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (30 days — stable APIs, no fast-moving dependencies)
