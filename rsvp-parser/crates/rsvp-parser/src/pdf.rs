use crate::types::ParseResult;

/// Extract text from a PDF byte slice using pdf-extract.
/// Returns Err if the PDF has no text layer (scanned/image PDF).
pub fn extract(input: &[u8]) -> Result<ParseResult, Box<dyn std::error::Error>> {
    let text = pdf_extract::extract_text_from_mem(input)?;
    let words: Vec<String> = text
        .split_whitespace()
        .map(|w| w.to_string())
        .filter(|w| !w.is_empty())
        .collect();

    // Scanned PDF detection: fewer than 10 words in any real document strongly
    // suggests an image-only PDF with no text layer.
    if words.len() < 10 {
        return Err(
            "No readable text found. This PDF may be scanned or image-based. \
             Try a different PDF or paste the text instead."
                .into(),
        );
    }

    Ok(ParseResult { words, title: None })
}
