const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_OVERLAP = 200;

const MAX_DOCUMENT_LENGTH = 200000;
const MAX_CHUNKS = 250;

/**
 * Split extracted document text into overlapping chunks
 * suitable for embedding generation.
 */
export const chunkDocumentText = (
  text,
  options = {}
) => {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    overlap = DEFAULT_OVERLAP,
  } = options;

  // Validate input
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Document text cannot be empty.");
  }

  if (text.length > MAX_DOCUMENT_LENGTH) {
    throw new Error(
      "Document exceeds the maximum supported text length."
    );
  }

  // Validate chunk configuration
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < 200 ||
    chunkSize > 8000
  ) {
    throw new Error(
      "Chunk size must be between 200 and 8000 characters."
    );
  }

  if (
    !Number.isInteger(overlap) ||
    overlap < 0 ||
    overlap >= chunkSize
  ) {
    throw new Error(
      "Overlap must be smaller than chunk size."
    );
  }

  // Normalize text
  const normalizedText = text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const chunks = [];

  let start = 0;

  while (start < normalizedText.length) {
    if (chunks.length >= MAX_CHUNKS) {
      throw new Error(
        "Document exceeds the maximum number of chunks."
      );
    }

    const end = Math.min(
      start + chunkSize,
      normalizedText.length
    );

    const chunkText = normalizedText
      .slice(start, end)
      .trim();

    if (chunkText) {
      chunks.push({
        chunkIndex: chunks.length,
        text: chunkText,
        startOffset: start,
        endOffset: end,
      });
    }

    // Stop when we reach the end
    if (end === normalizedText.length) {
      break;
    }

    // Preserve overlapping context
    start = end - overlap;
  }

  return chunks;
};