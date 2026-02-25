# Phase 3: Import UI + Reading View - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can load a PDF by dropping it or picking it from device storage, confirm the extracted content on a preview screen, then experience the complete dual-view reading layout — RSVP display (sticky, top ~40%) above a synchronized scrolling full-text panel (bottom ~60%). Creating posts and PWA/share-target integration are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Import confirmation screen
- Show both a scrollable text preview (~200-300 words, fading at bottom) AND a metadata summary (filename, page count, word count, estimated reading time)
- Single "Start Reading" CTA — loads into RSVP at the user's last WPM setting
- Error state: clear message explaining why extraction failed (e.g., "This PDF appears to be scanned — no text layer found") + "Try another file" button

### Dual-view layout split
- Fixed proportions: RSVP zone ~40% of viewport height, full text panel ~60%
- RSVP zone is sticky — stays fixed at top while only the text panel scrolls
- Subtle divider line between the two zones
- Mobile: stack vertically with the same proportions (RSVP above, text panel below); text panel is independently scrollable

### Text panel sync + dimming
- During RSVP playback: reduce opacity on the entire text panel (~40-50%), returning to full when paused
- Current word highlighted with a background highlight (marker-style), visible even with panel dimmed
- Auto-scroll only triggers when the highlighted word would go off-screen (not continuously centered)
- User can manually scroll the text panel during playback; auto-scroll resumes after a short delay

### Font size controls
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

</decisions>

<specifics>
## Specific Ideas

- No specific visual references provided — open to standard approaches consistent with existing app aesthetic

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-import-ui-reading-view*
*Context gathered: 2026-02-25*
