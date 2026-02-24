# Phase 2: RSVP Playback Engine - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the core reading mechanic: ORP three-span display with fixed focal character position, timing scheduler (with sentence-pause and word-length normalization), playback controls (pause/resume/jump), and reading progress tracking. Import UI and the full dual-view layout are Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Word display appearance
- Monospace font — keeps the ORP focal character column visually stable as words change
- Large and prominent display — ~4-6rem font size, reading is the primary action
- Left/right fragments shown at full weight (same as normal text); only the color distinguishes the focal character (fragments black/white, focal character red)
- Word display sits on a dark background card/panel — better eye comfort for extended reading, red focal pops more on dark

### Controls layout
- Playback controls (<<, |>, >>) and WPM slider sit in a single row directly below the dark word panel
- Single row layout: `[<<] [|>] [>>]  [----slider----]  200`
- Progress indicator sits above the word display panel
- Progress format: "Word 142 / 3,420 (45%)" — both absolute position and relative progress

### Jump behavior
- Jump by fixed word count, not by sentence
- Default jump distance: 10 words per press
- Jump count is adjustable inline/in-session (small controls next to the << >> buttons, not buried in settings)
- Arrow key mapping: Left = jump back N words, Right = jump forward N words, Space = pause/resume
- Boundary behavior: clamp at start/end (jump back past word 1 lands on word 1; jump past last word lands on last word)

### WPM speed controls
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

</decisions>

<specifics>
## Specific Ideas

- Monospace font chosen specifically for stable ORP positioning — the focal character column should feel anchored
- The layout at this phase is: progress row → dark word panel → controls row. Phase 3 will add the full-text panel below this.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-rsvp-playback-engine*
*Context gathered: 2026-02-25*
