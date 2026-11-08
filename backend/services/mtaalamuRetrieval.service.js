import MtaalamuKnowledgeDocument from "../models/mtaalamuKnowledgeDocument.model.js";

import MtaalamuKnowledgeChunk from "../models/mtaalamuKnowledgeChunk.model.js";

import {
  embedQuery,
  MTAALAMU_EMBEDDING_MODEL,
  MTAALAMU_EMBEDDING_DIMENSIONS,
} from "./mtaalamuEmbedding.service.js";

const MAX_DOCUMENTS = 50;
const MAX_CHUNKS = 1000;
const DEFAULT_LIMIT = 5;
const MAX_RESULTS = 10;

/**
 * Calculate similarity between two normalized vectors.
 *
 * Since our embedding service normalizes vectors,
 * their dot product equals cosine similarity.
 */
const calculateSimilarity = (vectorA, vectorB) => {
  if (
    !Array.isArray(vectorA) ||
    !Array.isArray(vectorB) ||
    vectorA.length !== MTAALAMU_EMBEDDING_DIMENSIONS ||
    vectorB.length !== MTAALAMU_EMBEDDING_DIMENSIONS
  ) {
    return null;
  }

  let similarity = 0;

  for (let i = 0; i < vectorA.length; i++) {
    if (
      !Number.isFinite(vectorA[i]) ||
      !Number.isFinite(vectorB[i])
    ) {
      return null;
    }

    similarity += vectorA[i] * vectorB[i];
  }

  return Number.isFinite(similarity)
    ? similarity
    : null;
};

/**
 * Retrieve knowledge relevant to an investor's question.
 *
 * Only documents that are APPROVED and READY
 * are eligible for retrieval.
 */
export const retrieveMtaalamuKnowledge = async (
  question,
  options = {}
) => {
  const { limit = DEFAULT_LIMIT } = options;

  if (
    typeof question !== "string" ||
    !question.trim() ||
    question.length > 6000
  ) {
    throw new Error("A valid question is required.");
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_RESULTS
  ) {
    throw new Error("Invalid retrieval limit.");
  }

  // Step 1: Find documents approved for public knowledge.
  const documents = await MtaalamuKnowledgeDocument.find({
    status: "APPROVED",
    processingStatus: "READY",
  })
    .select("_id title")
    .limit(MAX_DOCUMENTS + 1)
    .lean();

  if (documents.length > MAX_DOCUMENTS) {
    throw new Error(
      "Knowledge base exceeds the current retrieval capacity."
    );
  }

  if (documents.length === 0) {
    return [];
  }

  const documentMap = new Map(
    documents.map((document) => [
      String(document._id),
      document,
    ])
  );

  // Step 2: Load embeddings belonging to approved documents.
  const chunks = await MtaalamuKnowledgeChunk.find({
    documentId: {
      $in: documents.map((document) => document._id),
    },
    embeddingModel: MTAALAMU_EMBEDDING_MODEL,
  })
    .select(
      "documentId chunkIndex text pageStart pageEnd sectionTitle embedding"
    )
    .limit(MAX_CHUNKS + 1)
    .lean();

  if (chunks.length > MAX_CHUNKS) {
    throw new Error(
      "Knowledge base exceeds the current chunk retrieval capacity."
    );
  }

  if (chunks.length === 0) {
    return [];
  }

  // Step 3: Generate a real embedding for the investor's question.
  const questionEmbedding = await embedQuery(question);

  // Step 4: Compare the question with stored knowledge.
  const rankedChunks = chunks
    .map((chunk) => {
      const document = documentMap.get(
        String(chunk.documentId)
      );

      if (!document) {
        return null;
      }

      const score = calculateSimilarity(
        questionEmbedding,
        chunk.embedding
      );

      if (score === null) {
        return null;
      }

      return {
        text: chunk.text,

        score,

        source: {
          documentId: String(document._id),
          documentTitle: document.title,
          chunkIndex: chunk.chunkIndex,
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
          sectionTitle: chunk.sectionTitle,
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  // Step 5: Return the highest-ranking passages.
  return rankedChunks.slice(0, limit).map((result) => ({
    ...result,
    score: Number(result.score.toFixed(4)),
  }));
};