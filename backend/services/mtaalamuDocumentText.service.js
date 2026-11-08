import path from "node:path";
import mammoth from "mammoth";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TEXT_LENGTH = 200000;
const MAX_PDF_PAGES = 75;

export const extractDocumentText = async (file) => {
  if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
    throw new Error("A valid document is required.");
  }

  if (
    file.buffer.length === 0 ||
    file.buffer.length > MAX_FILE_SIZE
  ) {
    throw new Error("Document must be between 1 byte and 5 MB.");
  }

  const extension = path
    .extname(file.originalname || "")
    .toLowerCase();

  let text = "";
  let pageCount = null;

  switch (extension) {
    case ".pdf": {
      // Verify PDF file signature
      if (file.buffer.subarray(0, 5).toString() !== "%PDF-") {
        throw new Error("Invalid PDF document.");
      }

      const { PDFParse } = await import("pdf-parse");

      const parser = new PDFParse({
        data: new Uint8Array(file.buffer),
      });

      try {
        const info = await parser.getInfo();

        if (info.total > MAX_PDF_PAGES) {
          throw new Error("PDF exceeds the 75-page limit.");
        }

        const result = await parser.getText();

        text = result.text || "";
        pageCount = result.total || null;

        // Remove page markers inserted by pdf-parse
        text = text.replace(
          /--\s*\d+\s+of\s+\d+\s*--/g,
          ""
        );
      } finally {
        await parser.destroy();
      }

      break;
    }

    case ".docx": {
      // DOCX files are ZIP-based containers
      const signature = file.buffer.subarray(0, 2).toString();

      if (signature !== "PK") {
        throw new Error("Invalid DOCX document.");
      }

      const result = await mammoth.extractRawText({
        buffer: file.buffer,
      });

      text = result.value || "";
      break;
    }

    case ".txt":
    case ".md": {
      const decoder = new TextDecoder("utf-8", {
        fatal: true,
      });

      text = decoder.decode(file.buffer);

      // Reject binary-like content
      if (text.includes("\u0000")) {
        throw new Error("Invalid text document.");
      }

      break;
    }

    default:
      throw new Error("Unsupported document format.");
  }

  // Normalize extracted text
  text = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) {
    throw new Error(
      "No readable text found. Scanned documents are not supported yet."
    );
  }

  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(
      "Document contains too much text for processing."
    );
  }

  return {
    text,
    pageCount,
    characterCount: text.length,
  };
};