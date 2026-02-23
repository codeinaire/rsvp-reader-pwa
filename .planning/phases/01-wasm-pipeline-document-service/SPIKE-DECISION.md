# PDF Crate Spike Decision

**Date:** 2026-02-23
**Time spent:** ~10 minutes

## Decision: pdf-extract

## Outcome

- Build result: SUCCESS
- Bundle size: 1018 KB (~1 MB) (target: under 2 MB — PASSED)
- Extraction test: Not run with a real PDF in this spike (smoke test deferred to checkpoint); empty-text detection logic is in place
- Empty-text detection: Implemented — fewer than 10 words returns Err with user-friendly message

## Rationale

pdf-extract 0.10.0 compiled cleanly to wasm32-unknown-unknown. The getrandom 0.3.x issue (documented in STATE.md as a Known Pitfall) was resolved by enabling the `wasm_js` Cargo feature on lopdf directly:

```toml
lopdf = { version = "0.38", optional = true, features = ["wasm_js"] }
```

A secondary issue arose during wasm-pack's wasm-opt post-processing step: the bundled wasm-opt binary did not support the `nontrapping-float-to-int` WASM feature (the `i32.trunc_sat_f64_s` instruction used by pdf-extract's float rounding code). This was resolved by adding `--enable-nontrapping-float-to-int` to the wasm-opt flags in Cargo.toml:

```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz", "--enable-bulk-memory", "--enable-nontrapping-float-to-int"]
```

The pdfium-render fallback was not needed. pdf-extract compiled successfully with a 1 MB bundle — within the 2 MB budget.

## Implications for Plan 03

- No pdfium.wasm binary is needed (pdf-extract is pure Rust, no native library dependency)
- The WASM package is in `rsvp-parser/crates/rsvp-parser/pkg/` ready for use by the DocumentService
- The `parse_pdf(input: &[u8])` export is the primary API surface — takes raw PDF bytes, returns words array via JSON-serialized ParseResult
- Scanned PDFs (image-only, no text layer) return a JS exception with a user-friendly message
- Plan 03 can proceed with the WorkerService and DocumentService implementation using pdf-extract

## Build Command

```bash
wasm-pack build rsvp-parser/crates/rsvp-parser --target bundler --release
```

## Crate Dependency Notes

For reference, the key dependencies that required configuration for WASM:

- `pdf-extract 0.10.0` — top-level PDF extraction crate
- `lopdf 0.38.0` — must use `features = ["wasm_js"]` (getrandom 0.3.x requirement)
- `getrandom 0.3.4` — pulled in transitively; 0.3.x uses Cargo features (not rustflags) for WASM backend
- `rayon` — included transitively but only used in non-WASM paths; compiles fine for wasm32
