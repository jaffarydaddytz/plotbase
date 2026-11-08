import mongoose from "mongoose";

import MtaalamuKnowledgeDocument from "../models/mtaalamuKnowledgeDocument.model.js";

import MtaalamuKnowledgeChunk from "../models/mtaalamuKnowledgeChunk.model.js";

import {
  MTAALAMU_EMBEDDING_MODEL,
  MTAALAMU_EMBEDDING_DIMENSIONS,
} from "../services/mtaalamuEmbedding.service.js";


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


/**
 * PATCH /api/admin/mtaalamu/documents/:id/approve
 *
 * Approve a processed knowledge document for public retrieval.
 *
 * Must be registered under administrator-protected routes.
 */
export const approveMtaalamuKnowledgeDocument = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid knowledge document ID.",
      });
    }

    const document = await MtaalamuKnowledgeDocument.findById(id)
      .select("title status processingStatus chunkCount")
      .lean();

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Knowledge document not found.",
      });
    }

    // Only successfully processed drafts can be approved.
    if (
      document.status !== "DRAFT" ||
      document.processingStatus !== "READY" ||
      document.chunkCount < 1
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Only successfully processed draft documents can be approved.",
      });
    }

    // Verify that all expected chunks are stored.
    const totalChunks = await MtaalamuKnowledgeChunk.countDocuments({
      documentId: document._id,
    });

    // Verify that their embeddings match our retrieval configuration.
    const validChunks = await MtaalamuKnowledgeChunk.countDocuments({
      documentId: document._id,
      embeddingModel: MTAALAMU_EMBEDDING_MODEL,
      embedding: {
        $size: MTAALAMU_EMBEDDING_DIMENSIONS,
      },
    });

    if (
      totalChunks !== document.chunkCount ||
      validChunks !== document.chunkCount
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Knowledge document has incomplete or incompatible embeddings.",
      });
    }

    // Conditional update prevents approving a document
    // whose status changed while approval was being processed.
    const approvedDocument =
      await MtaalamuKnowledgeDocument.findOneAndUpdate(
        {
          _id: document._id,
          status: "DRAFT",
          processingStatus: "READY",
          chunkCount: document.chunkCount,
        },
        {
          $set: {
            status: "APPROVED",
            approvedBy: req.user._id,
            approvedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).select(
        "title status processingStatus chunkCount approvedAt"
      );

    if (!approvedDocument) {
      return res.status(409).json({
        success: false,
        message:
          "Knowledge document status changed. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Knowledge document approved successfully.",
      document: {
        id: String(approvedDocument._id),
        title: approvedDocument.title,
        status: approvedDocument.status,
        processingStatus: approvedDocument.processingStatus,
        chunkCount: approvedDocument.chunkCount,
        approvedAt: approvedDocument.approvedAt,
      },
    });
  } catch (error) {
    console.error("Mtaalamu document approval error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to approve knowledge document.",
    });
  }
};

// List Mtaalamu knowledge documents (Admin only)
export const listMtaalamuKnowledgeDocuments = async (req, res) => {
  try {
    const page = req.query.page === undefined
      ? 1
      : Number(req.query.page);

    const limit = req.query.limit === undefined
      ? 20
      : Number(req.query.limit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50 ||
      !Number.isSafeInteger((page - 1) * limit)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters.",
      });
    }

    const [documents, total] = await Promise.all([
      MtaalamuKnowledgeDocument.find({})
        .select("-__v")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      MtaalamuKnowledgeDocument.countDocuments({}),
    ]);

    return res.status(200).json({
      success: true,
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Mtaalamu document listing error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve knowledge documents.",
    });
  }
};


// Delete a Mtaalamu knowledge document (Admin only)
export const deleteMtaalamuKnowledgeDocument = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate document ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid knowledge document ID.",
      });
    }

    // Atomically lock an eligible draft against approval.
    // Do not delete documents that are still processing.
    const document =
      await MtaalamuKnowledgeDocument.findOneAndUpdate(
        {
          _id: id,
          status: "DRAFT",
          processingStatus: { $in: ["READY", "FAILED"] },
        },
        {
          $set: {
            status: "ARCHIVED",
          },
        },
        {
          new: true,
        }
      );

    if (!document) {
      const exists =
        await MtaalamuKnowledgeDocument.exists({ _id: id });

      return res.status(exists ? 409 : 404).json({
        success: false,
        message: exists
          ? "Only draft documents that are not processing can be deleted."
          : "Knowledge document not found.",
      });
    }

    // Delete associated knowledge chunks
    await MtaalamuKnowledgeChunk.deleteMany({
      documentId: document._id,
    });

    // Delete document metadata
    await MtaalamuKnowledgeDocument.deleteOne({
      _id: document._id,
      status: "ARCHIVED",
    });

    return res.status(200).json({
      success: true,
      message: "Knowledge document deleted successfully.",
    });

  } catch (error) {
    console.error("Mtaalamu document deletion error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete knowledge document.",
    });
  }
};