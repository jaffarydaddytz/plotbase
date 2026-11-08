import mongoose from "mongoose";

const mtaalamuKnowledgeDocumentSchema = new mongoose.Schema(
  {
    // Document information
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },

    // SHA-256 fingerprint of uploaded file contents
    contentHash: {
      type: String,
      required: true,
    },

    // Knowledge approval
    status: {
      type: String,
      enum: ["DRAFT", "APPROVED", "ARCHIVED"],
      default: "DRAFT",
    },

    // Document ingestion
    processingStatus: {
      type: String,
      enum: ["PENDING", "PROCESSING", "READY", "FAILED"],
      default: "PENDING",
    },

    chunkCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Administrator who uploaded the document
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Administrator who approved the document
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Support filtering approved, processed knowledge
mtaalamuKnowledgeDocumentSchema.index({
  status: 1,
  processingStatus: 1,
});

const MtaalamuKnowledgeDocument = mongoose.model(
  "MtaalamuKnowledgeDocument",
  mtaalamuKnowledgeDocumentSchema
);

export default MtaalamuKnowledgeDocument;