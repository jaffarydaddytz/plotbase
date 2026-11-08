import { GoogleGenAI } from "@google/genai";

export const MTAALAMU_EMBEDDING_MODEL = "gemini-embedding-001";
export const MTAALAMU_EMBEDDING_DIMENSIONS = 768;

const MAX_INPUT_LENGTH = 6000;

// Initialize Gemini only when needed
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({
    apiKey,
  });
};

// Normalize embedding vectors for cosine similarity
const normalizeEmbedding = (values) => {
  if (
    !Array.isArray(values) ||
    values.length !== MTAALAMU_EMBEDDING_DIMENSIONS ||
    !values.every(Number.isFinite)
  ) {
    throw new Error("Invalid embedding returned by Gemini.");
  }

  const magnitude = Math.hypot(...values);

  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new Error("Embedding has invalid magnitude.");
  }

  return values.map((value) => value / magnitude);
};

// Shared embedding function
const generateEmbedding = async (
  text,
  taskType,
  title = undefined
) => {
  if (
    typeof text !== "string" ||
    !text.trim() ||
    text.length > MAX_INPUT_LENGTH
  ) {
    throw new Error("Invalid embedding input text.");
  }

  const ai = getGeminiClient();

  const config = {
    taskType,
    outputDimensionality: MTAALAMU_EMBEDDING_DIMENSIONS,
  };

  if (taskType === "RETRIEVAL_DOCUMENT" && title) {
    config.title = title;
  }

  const response = await ai.models.embedContent({
    model: MTAALAMU_EMBEDDING_MODEL,
    contents: text.trim(),
    config,
  });

  const values = response.embeddings?.[0]?.values;

  return normalizeEmbedding(values);
};

// Generate embeddings for Plotbase document chunks
export const embedDocument = async (text, title) => {
  return generateEmbedding(
    text,
    "RETRIEVAL_DOCUMENT",
    title
  );
};

// Generate embeddings for investor questions
export const embedQuery = async (question) => {
  return generateEmbedding(
    question,
    "RETRIEVAL_QUERY"
  );
};