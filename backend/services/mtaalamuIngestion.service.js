import mongoose from "mongoose";
import crypto from "node:crypto";

import MtaalamuKnowledgeDocument from "../models/mtaalamuKnowledgeDocument.model.js";
import MtaalamuKnowledgeChunk from "../models/mtaalamuKnowledgeChunk.model.js";

import { extractDocumentText } from "./mtaalamuDocumentText.service.js";
import { chunkDocumentText } from "./mtaalamuChunking.service.js";

import {
  embedDocument,
  MTAALAMU_EMBEDDING_MODEL,
} from "./mtaalamuEmbedding.service.js";

// Keep initial synchronous ingestion workloads small.
// Larger documents will require background processing.
const MAX_INGESTION_CHUNKS = 30;

/**
 * Ingest an official Plotbase knowledge document.
 *
 * This function must only be called by an
 * administrator-protected controller.
 */
export const ingestMtaalamuDocument = async ({
  file,
  title,
  uploadedBy,
}) => {
  // STEP 1: Validate input
  if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
    throw new Error("A valid document file is required.");
  }

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 160
  ) {
    throw new Error(
      "Document title must contain between 1 and 160 characters."
    );
  }

  if (!mongoose.isValidObjectId(uploadedBy)) {
    throw new Error("A valid administrator ID is required.");
  }

  const documentTitle = title.trim();

  // STEP 2: Extract document text
  const extracted = await extractDocumentText(file);

  // STEP 3: Split extracted text into chunks
  const chunks = chunkDocumentText(extracted.text);

  if (chunks.length === 0) {
    throw new Error("No knowledge chunks were generated.");
  }

  if (chunks.length > MAX_INGESTION_CHUNKS) {
    throw new Error(
      `Document exceeds the initial limit of ${MAX_INGESTION_CHUNKS} chunks.`
    );
  }

  // STEP 4: Calculate document fingerprint
  const contentHash = crypto
    .createHash("sha256")
    .update(file.buffer)
    .digest("hex");

  // STEP 5: Create a document record
  // It remains a DRAFT throughout ingestion.
  const document = await MtaalamuKnowledgeDocument.create({
    title: documentTitle,

    originalFileName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.buffer.length,

    contentHash,

    uploadedBy,

    status: "DRAFT",
    processingStatus: "PROCESSING",

    chunkCount: 0,
  });

  try {
    // STEP 6: Generate real embeddings
    const chunkRecords = [];

    for (const chunk of chunks) {
      const embedding = await embedDocument(
        chunk.text,
        documentTitle
      );

      chunkRecords.push({
        documentId: document._id,

        chunkIndex: chunk.chunkIndex,
        text: chunk.text,

        // The current extractor doesn't preserve
        // individual PDF page locations.
        pageStart: null,
        pageEnd: null,

        sectionTitle: "",

        embedding,
        embeddingModel: MTAALAMU_EMBEDDING_MODEL,
      });
    }

    // STEP 7: Save knowledge chunks
    await MtaalamuKnowledgeChunk.insertMany(
      chunkRecords,
      { ordered: true }
    );

    // STEP 8: Mark processing complete
    document.processingStatus = "READY";
    document.chunkCount = chunkRecords.length;

    await document.save();

    return {
      documentId: String(document._id),

      title: document.title,

      status: document.status,
      processingStatus: document.processingStatus,

      chunkCount: document.chunkCount,

      characterCount: extracted.characterCount,
      pageCount: extracted.pageCount,

      message:
        "Document processed successfully. Administrator approval is required before public retrieval.",
    };
  } catch (error) {
    // STEP 9: Clean up partial ingestion data.
    // Keep the document unpublished.
    try {
      await MtaalamuKnowledgeChunk.deleteMany({
        documentId: document._id,
      });

      await MtaalamuKnowledgeDocument.updateOne(
        { _id: document._id },
        {
          $set: {
            status: "DRAFT",
            processingStatus: "FAILED",
            chunkCount: 0,
            approvedBy: null,
            approvedAt: null,
          },
        }
      );
    } catch (cleanupError) {
      console.error(
        "Mtaalamu ingestion cleanup failed:",
        cleanupError
      );
    }

    throw error;
  }
};