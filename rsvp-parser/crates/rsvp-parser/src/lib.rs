use wasm_bindgen::prelude::*;

mod types;
mod pdf;
pub use types::ParseResult;

/// Extract text from a PDF byte slice.
/// Returns Err (visible to JS as a thrown exception) if the PDF has no text layer.
#[wasm_bindgen]
pub fn parse_pdf(input: &[u8]) -> Result<JsValue, JsError> {
    let result = pdf::extract(input)
        .map_err(|e| JsError::new(&e.to_string()))?;
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Serialization failed: {e}")))
}
