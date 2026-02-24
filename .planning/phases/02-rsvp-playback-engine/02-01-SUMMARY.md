---
phase: 02-rsvp-playback-engine
plan: 01
subsystem: rsvp
tags: [vitest, intl-segmenter, typescript, orp, scheduler, tdd]

# Dependency graph
requires: []
provides:
  - "computeOrp(word): OrpFragments — grapheme-aware ORP split using Intl.Segmenter, formula: max(0, ceil(n*0.3)-1)"
  - "computeWordDelay(word, wpm): number — word display duration with length (0.8/1.0/1.2/1.5x) and sentence (1.5x) multipliers"
  - "Vitest test infrastructure installed and configured in project"
affects:
  - 02-rsvp-playback-engine

# Tech tracking
tech-stack:
  added:
    - vitest@4.0.18 (test framework — was missing from project, installed as dev dependency)
  patterns:
    - "Module-level Intl.Segmenter singleton for grapheme-safe Unicode splitting"
    - "Pure function modules with no cross-imports (orp.ts and scheduler.ts are independent)"
    - "TDD: RED (failing tests committed) -> GREEN (implementations passing all tests)"

key-files:
  created:
    - src/lib/orp.ts
    - src/lib/orp.test.ts
    - src/lib/scheduler.ts
    - src/lib/scheduler.test.ts
  modified:
    - package.json (added vitest devDependency)

key-decisions:
  - "ORP formula locked: Math.max(0, Math.ceil(graphemes.length * 0.3) - 1) — tested against all word lengths"
  - "Tests use formula-correct expected values; plan behavior section had minor inconsistencies for 'the' and 'excellent' but formula is authoritative"
  - "Intl.Segmenter singleton at module level avoids per-call instantiation overhead"
  - "computeWordDelay uses /\\W/g strip to count letters, not graphemes — sentence regex tests raw word string"

patterns-established:
  - "ORP index formula: orpIndex = Math.max(0, Math.ceil(graphemes.length * 0.3) - 1)"
  - "Grapheme splitting: [...segmenter.segment(word)].map(s => s.segment)"
  - "Word delay: baseMs * lengthMult * sentenceMult (three independent multipliers)"

requirements-completed: [RSVP-01, RSVP-02, RSVP-03]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 2 Plan 01: ORP Fragment Computation and Word Delay Scheduler Summary

**Grapheme-aware computeOrp with Intl.Segmenter and WPM-based computeWordDelay with length/sentence multipliers — both TDD-verified with 23 passing tests.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-24T23:44:46Z
- **Completed:** 2026-02-24T23:47:00Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 6

## Accomplishments

- `computeOrp`: Splits any word into (left, focal, right) using Intl.Segmenter grapheme clusters. ORP index formula `Math.max(0, Math.ceil(n * 0.3) - 1)` tested against empty string, 1-char through 11-char words, and Unicode (café)
- `computeWordDelay`: Returns millisecond display duration per word at a given WPM. Applies length multiplier (0.8/1.0/1.2/1.5x) and sentence-pause multiplier (1.5x for .!? endings). Tested across all length categories and punctuation types
- Installed Vitest (was missing from project despite plan assuming it was present), enabling the TDD workflow for Phase 2

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing tests for orp.ts and scheduler.ts** - `61411fc` (test)
2. **Task 2: GREEN — implement orp.ts and scheduler.ts** - `8a8755c` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks had two commits (test RED -> feat GREEN)_

## Files Created/Modified

- `src/lib/orp.ts` - computeOrp with Intl.Segmenter singleton; exports OrpFragments interface
- `src/lib/orp.test.ts` - 10 test cases: empty, 1-2-3-4-5-7-9-11 graphemes, Unicode café
- `src/lib/scheduler.ts` - computeWordDelay pure function; length + sentence multipliers
- `src/lib/scheduler.test.ts` - 13 test cases: all length categories, .!? punctuation, WPM accuracy
- `package.json` - added vitest@4.0.18 devDependency
- `package-lock.json` - updated lockfile

## Decisions Made

- ORP formula is the canonical source of truth: `Math.max(0, Math.ceil(n * 0.3) - 1)`. The plan's behavior section had minor inconsistencies in expected values for "the" (showed orp=1 but formula gives orp=0) and "excellent" (showed orp=3 but formula gives orp=2). Tests were written to match the formula, not the example table.
- Intl.Segmenter instantiated once at module level as a singleton — avoids per-call overhead for high-frequency RSVP rendering.
- scheduler.ts and orp.ts are completely independent — no cross-imports, as specified in must_haves.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing vitest dependency**
- **Found during:** Task 1 (RED — write failing tests)
- **Issue:** Plan stated "Vitest (already installed in the project)" but vitest was absent from both package.json and node_modules/.bin/
- **Fix:** Ran `npm install --save-dev vitest` — installed vitest@4.0.18
- **Files modified:** package.json, package-lock.json
- **Verification:** `ls node_modules/.bin/ | grep vitest` confirmed binary present; tests ran successfully
- **Committed in:** 61411fc (Task 1 commit, alongside test files)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing dependency)
**Impact on plan:** Necessary to unblock TDD workflow. No scope creep.

## Issues Encountered

- Plan behavior section had minor inconsistencies in ORP expected values for 3-char ("the") and 9-char ("excellent") words. The implementation follows the locked formula from STATE.md which is authoritative. Tests validate formula behavior, not the behavior-section table examples.

## Next Phase Readiness

- `computeOrp` and `computeWordDelay` are ready for wiring into the React RSVP display component
- Vitest infrastructure is now in place for all remaining Phase 2 TDD plans
- Both modules are pure functions with zero side effects — easy to compose in Plan 02+

---
*Phase: 02-rsvp-playback-engine*
*Completed: 2026-02-24*
