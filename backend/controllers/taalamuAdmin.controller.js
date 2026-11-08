import {
  ingestMtaalamuDocument,
} from "../services/mtaalamuIngestion.service.js";

// Known document validation errors
const documentValidationErrors = new Set([
  "A valid document is required.",
  "A valid document file is required.",
  "Document must be between 1 byte and 5 MB.",
  "Invalid PDF document.",
  "PDF exceeds the 75-page limit.",
  "Invalid DOCX document.",
  "Invalid text document.",
  "Unsupported document format.",
  "No readable text found. Scanned documents are not supported yet.",
  "Document contains too much text for processing.",
  "Document text cannot be empty.",
  "Document exceeds the maximum supported text length.",
  "Document exceeds the maximum number of chunks.",
  "No knowledge chunks were generated.",
  "Document exceeds the initial limit of 30 chunks.",
]);

/**
 * POST /api/admin/mtaalamu/documents
 *
 * Upload and process an official Plotbase knowledge document.
 *
 * Authentication and admin authorization will be
 * enforced by the existing admin router.
 */
export const uploadMtaalamuKnowledgeDocument = async (req, res) => {
  try {
    const { title } = req.body;

    // Validate document title
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 160
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Document title must contain between 1 and 160 characters.",
      });
    }

    // Validate uploaded file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "A knowledge document is required.",
      });
    }

    // Retrieve authenticated administrator
    const uploadedBy = req.user?._id;

    if (!uploadedBy) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
    }

    // Process and store knowledge in MongoDB
    const result = await ingestMtaalamuDocument({
      file: req.file,
      title: title.trim(),
      uploadedBy,
    });

    return res.status(201).json({
      success: true,

      message:
        "Knowledge document processed successfully. Administrator approval is required before public retrieval.",

      document: {
        id: result.documentId,
        title: result.title,

        status: result.status,
        processingStatus: result.processingStatus,

        chunkCount: result.chunkCount,
        characterCount: result.characterCount,
        pageCount: result.pageCount,
      },
    });
  } catch (error) {
    console.error(
      "Mtaalamu knowledge document upload error:",
      error
    );

    // Handle expected document validation errors
    if (
      documentValidationErrors.has(error.message) ||
      /^Document exceeds the initial limit of \d+ chunks\.$/.test(
        error.message
      )
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // Handle cloud AI rate limits
    if (error.status === 429) {
      return res.status(503).json({
        success: false,
        message:
          "Knowledge processing is temporarily unavailable. Please try again later.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to process knowledge document.",
    });
  }
};