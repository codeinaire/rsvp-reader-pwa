use wasm_bindgen::prelude::*;

mod types;
pub use types::ParseResult;

/// Stub: replaced after PDF crate spike confirms the winning crate.
/// Returns a test parse result so the WASM build can be validated independently.
#[wasm_bindgen]
pub fn parse_pdf(_input: &[u8]) -> Result<JsValue, JsError> {
    let result = ParseResult {
        words: vec!["stub".to_string(), "pdf".to_string(), "result".to_string()],
        title: Some("Stub PDF".to_string()),
    };
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Serialization failed: {e}")))
}
