---
phase: 01-wasm-pipeline-document-service
plan: "01"
subsystem: infra
tags: [vite, react, typescript, rust, wasm, wasm-bindgen, wasm-pack, tailwindcss, zustand]

# Dependency graph
requires: []
provides:
  - "Vite 7.3.1 + React 19 + TypeScript scaffold with zero-error dev server"
  - "vite.config.ts with wasm(), topLevelAwait() in both plugins and worker.plugins"
  - "optimizeDeps.exclude: ['rsvp-parser'] for correct WASM asset serving"
  - "Rust WASM workspace (rsvp-parser) with size-optimized release profile"
  - "Stub parse_pdf() function that compiles cleanly for wasm32-unknown-unknown"
  - "Directory scaffold: src/workers/, services/, lib/, components/*, store/"
affects:
  - 01-02-PLAN  # PDF spike uses the workspace just created
  - 01-03-PLAN  # Document service layers onto this scaffold
  - 01-04-PLAN  # UI components go into the scaffolded directories

# Tech tracking
tech-stack:
  added:
    - "Vite 7.3.1 (build tool + dev server)"
    - "React 19.2.4"
    - "TypeScript 5.x"
    - "vite-plugin-wasm 3.5.0"
    - "vite-plugin-top-level-await 1.6.0"
    - "@tailwindcss/vite 4.2.0 (Tailwind v4 first-party Vite plugin)"
    - "zustand 5.0.11"
    - "wasm-pack 0.14.0 (npm devDependency)"
    - "@radix-ui/react-progress"
    - "wasm-bindgen 0.2.111 (Rust)"
    - "serde + serde-wasm-bindgen (Rust)"
  patterns:
    - "WASM plugins in both plugins[] and worker.plugins() — required for Worker WASM imports"
    - "optimizeDeps.exclude for WASM packages — prevents esbuild pre-bundling of .wasm"
    - "No await before createRoot().render() — WASM init is non-blocking by design"
    - "Tailwind v4: @import 'tailwindcss' in CSS, no tailwind.config.js needed"
    - "Rust crate-type: [cdylib, rlib] — cdylib=WASM, rlib=cargo test"
    - "Cargo release profile: opt-level=z, lto=true, codegen-units=1, panic=abort, strip=true"

key-files:
  created:
    - "vite.config.ts"
    - "src/main.tsx"
    - "src/App.tsx"
    - "src/index.css"
    - "rsvp-parser/Cargo.toml"
    - "rsvp-parser/crates/rsvp-parser/Cargo.toml"
    - "rsvp-parser/crates/rsvp-parser/src/lib.rs"
    - "rsvp-parser/crates/rsvp-parser/src/types.rs"
    - "rsvp-parser/.cargo/config.toml"
  modified:
    - "package.json (dependencies added)"

key-decisions:
  - "pdf-extract not enabled by default (default = []) — spike in Plan 02 validates WASM compilation before enabling"
  - "Node.js 22.22.0 used (via nvm) — Vite 7 requires Node 20.19+ or 22.12+; dev machine had 20.16"
  - "getrandom 0.3.x uses Cargo features (not rustflags) for WASM backend selection — .cargo/config.toml documents this change from 0.2.x"
  - "cargo check --target wasm32-unknown-unknown passes on stub (no pdf feature) — pdf feature validated separately in spike"

patterns-established:
  - "Pattern: Vite 7 WASM config with worker.plugins — critical for Worker-side WASM imports"
  - "Pattern: Rust default features empty for scaffold; pdf feature enabled after spike confirms WASM compatibility"

requirements-completed:
  - DOCF-01
  - IMPT-04

# Metrics
duration: 6min
completed: 2026-02-23
---

# Phase 01 Plan 01: Project Scaffold Summary

**Vite 7.3.1 + React + TypeScript app with wasm/topLevelAwait in both plugins and worker.plugins, and a Rust wasm32 workspace with opt-level=z release profile that cargo-checks cleanly**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-23T04:59:56Z
- **Completed:** 2026-02-23T05:06:01Z
- **Tasks:** 2
- **Files modified:** 16 created (app scaffold) + 7 created (Rust workspace)

## Accomplishments

- Vite 7.3.1 dev server starts on localhost:5173 with zero errors
- vite.config.ts has WASM plugins in both plugins[] and worker.plugins() — critical for Worker-side WASM loading
- Rust workspace with stub parse_pdf() compiles cleanly to wasm32-unknown-unknown (cargo check exits 0)
- Release Cargo profile: opt-level="z", lto=true, codegen-units=1, panic="abort", strip=true
- Directory scaffold established: src/workers/, services/, lib/, components/EntryScreen/, TextPreview/, RSVPPlaceholder/, store/

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Vite 7 + React + TypeScript project with WASM plugins** - `f7e5b36` (feat)
2. **Task 2: Create Rust WASM workspace with size-optimized Cargo config** - `3c2701b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `vite.config.ts` - Vite 7 config with wasm(), topLevelAwait(), tailwindcss() in plugins and worker.plugins; optimizeDeps.exclude for rsvp-parser
- `src/main.tsx` - createRoot render immediately, no await before render
- `src/App.tsx` - Minimal placeholder component for scaffold stage
- `src/index.css` - Tailwind v4: @import "tailwindcss" only
- `package.json` - Dependencies: zustand, vite-plugin-wasm, vite-plugin-top-level-await, @tailwindcss/vite, wasm-pack, @radix-ui/react-progress
- `rsvp-parser/Cargo.toml` - Workspace root + size-optimized release profile + clippy lints
- `rsvp-parser/crates/rsvp-parser/Cargo.toml` - cdylib+rlib, wasm-bindgen/serde deps, pdf-extract optional (default disabled)
- `rsvp-parser/crates/rsvp-parser/src/lib.rs` - parse_pdf stub returns test ParseResult via serde_wasm_bindgen
- `rsvp-parser/crates/rsvp-parser/src/types.rs` - ParseResult struct with Serialize/Deserialize
- `rsvp-parser/.cargo/config.toml` - Documents getrandom 0.3.x Cargo feature approach vs 0.2.x rustflag approach

## Decisions Made

- **pdf-extract not default-enabled:** The plan's must_have truth says "cargo check passes before adding pdf-extract." getrandom 0.3.x (pulled in by lopdf) requires Cargo feature `wasm_js` on lopdf to compile for wasm32. Since Plan 02 is the spike that validates PDF crate WASM compilation, the pdf feature is disabled by default. The spike will enable it and determine if lopdf's `wasm_js` feature resolves the compilation.
- **Node.js 22.22.0 via nvm:** Vite 7 requires Node 20.19+ or 22.12+. Dev machine had 20.16 (below minimum). Used nvm to switch to 22.22.0 which was already installed.
- **getrandom_backend rustflag documented but inactive:** The research specified `--cfg getrandom_backend="wasm_js"` in .cargo/config.toml. This was the getrandom 0.2.x API. getrandom 0.3.x uses Cargo features. The file documents this change for future reference.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] getrandom 0.3.x requires Cargo feature, not rustflag**
- **Found during:** Task 2 (Rust WASM workspace cargo check)
- **Issue:** Research specified `rustflags = ["--cfg", "getrandom_backend=\"wasm_js\""]` in .cargo/config.toml. getrandom 0.3.4 (pulled in by pdf-extract -> lopdf) changed from cfg-flag-based backend selection (0.2.x) to Cargo feature-based selection. The rustflag no longer works.
- **Fix:** Changed default feature to `default = []` (pdf is opt-in, not default). The PDF crate spike in Plan 02 will explicitly enable `pdf = ["dep:pdf-extract"]` and validate WASM compilation with the correct Cargo feature approach (`lopdf = { features = ["wasm_js"] }`).
- **Files modified:** `rsvp-parser/crates/rsvp-parser/Cargo.toml`, `rsvp-parser/.cargo/config.toml`
- **Verification:** `cargo check --target wasm32-unknown-unknown` exits 0 on stub (no pdf feature)
- **Committed in:** `3c2701b` (Task 2 commit)

**2. [Rule 3 - Blocking] npm create vite --overwrite flag required**
- **Found during:** Task 1 (project scaffolding)
- **Issue:** `npm create vite@latest . -- --template react-ts` was cancelled because the interactive prompt for overwriting an empty directory could not be handled non-interactively with "yes"
- **Fix:** Used `npx create-vite@8.3.0 . --template react-ts --overwrite` to bypass the interactive prompt
- **Files modified:** None (scaffolding approach change only)
- **Verification:** Scaffold completed successfully, all 16 files created
- **Committed in:** `f7e5b36` (Task 1 commit)

**3. [Rule 3 - Blocking] Restored .planning/ after vite --overwrite deleted it**
- **Found during:** Task 1, after scaffolding
- **Issue:** `npx create-vite --overwrite` deleted the existing `.planning/` directory (overwrite mode clears the target directory before scaffolding)
- **Fix:** `git checkout HEAD -- .planning/` restored all planning files from the last commit
- **Files modified:** All .planning/ files (restored from git)
- **Verification:** .planning/ directory exists with all expected files; git status shows no deletions
- **Committed in:** `f7e5b36` (Task 1 commit — planning files were already committed so restore was clean)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes essential for compilation and correctness. The getrandom fix changes the PDF feature strategy to match actual getrandom 0.3.x API. No scope creep.

## Issues Encountered

- The `--overwrite` flag for create-vite deleted the .planning directory. Restored via `git checkout HEAD -- .planning/`. Future plan executions should scaffold into a subdirectory or use git stash before running create-vite.

## User Setup Required

None - no external service configuration required for the scaffold.

## Next Phase Readiness

- Plan 02 (PDF crate spike): Rust workspace ready. The spike will run `cargo check --features pdf --target wasm32-unknown-unknown` and validate lopdf's `wasm_js` feature resolves the getrandom compilation.
- Plan 03 (Document service): Directory scaffold in place (src/workers/, services/, lib/)
- Plan 04 (UI components): Component directories in place (src/components/EntryScreen/, TextPreview/, RSVPPlaceholder/)

**Concerns:**
- getrandom 0.3.x requires the `wasm_js` Cargo feature on lopdf — spike must verify this resolves the compilation before pdf-extract can be used
- If spike fails: fallback to pdfium-render as documented in research

---
*Phase: 01-wasm-pipeline-document-service*
*Completed: 2026-02-23*
