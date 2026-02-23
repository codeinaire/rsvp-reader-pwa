# Phase 1: WASM Pipeline + Document Service - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the foundational text pipeline: prove the Rust-to-WASM compilation works, lock PDF crate selection, and deliver working text extraction from paste and text-layer PDFs. Also delivers the app entry screen and text preview screen — the user-facing surfaces that all later phases build on. RSVP playback is NOT in this phase.

</domain>

<decisions>
## Implementation Decisions

### App Entry Screen
- Import is the hero action — file picker/drag-and-drop zone is the primary CTA
- Share Target (sharing from mobile browser) is the #1 priority for the overall product — entry screen design should anticipate it even though it ships in Phase 4
- Paste text is secondary — accessible but not prominent (copy-paste is friction-heavy on mobile)
- Basic header: app name + settings icon at top, import content below
- System default theme (matches OS light/dark preference)
- Back button in the reader returns to the entry screen; entry screen is not destroyed

### Loading & Parse Feedback
- WASM initialization: silent — UI just works, import button disabled until ready, no spinner or message
- PDF processing: spinner over the import area while processing
- Long-running PDF (5+ seconds): add a patience message after ~3 seconds ("Large file, this may take a moment...")
- Cancel button visible during PDF processing — user can abort mid-parse
- Error messages: actionable — message + suggestion (e.g., "This PDF can't be read — it may be scanned or image-based. Try a different PDF or paste the text instead")
- Errors auto-dismiss after a few seconds
- Entry screen resets to fresh state each visit — no persisted error state

### Text Preview Screen
- Shows: first paragraph of extracted text (quality check) + word count at top
- Read-only — user cannot edit extracted text
- "Start Reading" button at the top, above the preview text
- In Phase 1 (no RSVP yet): "Start Reading" navigates to a placeholder RSVP screen to make the phase testable end-to-end

### Claude's Discretion
- Exact visual design, color palette, typography (within system default theme constraint)
- Specific spinner/loading animation style
- Auto-dismiss timing (a few seconds = ~3-4s is fine)
- Drag-and-drop visual feedback details

</decisions>

<specifics>
## Specific Ideas

- Share Target from mobile browser is the north-star import flow — the UI should feel like it was designed for that even in Phase 1 (file import is the proxy for it)
- Entry screen should feel like a reading app, not a file manager — clean, focused, nothing distracting

</specifics>

<deferred>
## Deferred Ideas

- Share Target (share webpage URL from browser) — Phase 4
- Paste text as a prominent import option — reconsidered; paste is in scope as IMPT-04 but should not be the hero action per user preference

</deferred>

---

*Phase: 01-wasm-pipeline-document-service*
*Context gathered: 2026-02-23*
