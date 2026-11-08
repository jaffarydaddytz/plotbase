import mongoose from "mongoose";

const mtaalamuKnowledgeChunkSchema = new mongoose.Schema(
  {
    // Reference to the original knowledge document
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MtaalamuKnowledgeDocument",
      required: true,
      index: true,
    },

    // Position of the chunk within its document
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    // Actual text retrieved by Mtaalamu
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000,
    },

    // Original document page references, where available
    pageStart: {
      type: Number,
      default: null,
      min: 1,
    },

    pageEnd: {
      type: Number,
      default: null,
      min: 1,
    },

    // Optional document section heading
    sectionTitle: {
      type: String,
      trim: true,
      default: "",
    },

    // Embedding vector used for semantic similarity search
    embedding: {
      type: [Number],
      required: true,
      default: undefined,
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.length > 0 &&
          value.every(Number.isFinite),
        message: "Embedding must contain valid numeric values.",
      },
    },

    // Track the embedding model used to generate the vector
    embeddingModel: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate chunk positions within one document
mtaalamuKnowledgeChunkSchema.index(
  {
    documentId: 1,
    chunkIndex: 1,
  },
  {
    unique: true,
  }
);

const MtaalamuKnowledgeChunk = mongoose.model(
  "MtaalamuKnowledgeChunk",
  mtaalamuKnowledgeChunkSchema
);

export default MtaalamuKnowledgeChunk;