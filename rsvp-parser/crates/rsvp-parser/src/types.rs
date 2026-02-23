use serde::{Deserialize, Serialize};

/// Result returned from any document parse operation.
/// words: tokenized word array, ready for RSVP display.
/// title: extracted document title, if available.
#[derive(Debug, Serialize, Deserialize)]
pub struct ParseResult {
    pub words: Vec<String>,
    pub title: Option<String>,
}
