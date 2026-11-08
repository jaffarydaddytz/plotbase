import {
  generateMtaalamuAnswer,
} from "../services/mtaalamuGeneration.service.js";

/**
 * MTAALAMU AI CONTROLLER
 *
 * POST /api/mtaalamu/ask
 *
 * Responsibilities:
 * 1. Validate incoming questions.
 * 2. Generate answers using the existing RAG service.
 * 3. Return answers with knowledge sources.
 * 4. Handle Gemini and backend errors.
 */

const MAX_QUESTION_LENGTH = 2000;

export const askMtaalamu = async (req, res) => {
  try {
    const { question } = req.body || {};

    // STEP 1: Validate question
    if (
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Tafadhali andika swali lako.",
        code: "INVALID_QUESTION",
      });
    }

    const cleanQuestion = question.trim();

    // STEP 2: Validate question length
    if (cleanQuestion.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({
        success: false,
        message:
          "Swali lako ni refu sana. Tumia herufi zisizozidi 2000.",
        code: "QUESTION_TOO_LONG",
      });
    }

    // STEP 3: Generate real AI answer using RAG
    const result = await generateMtaalamuAnswer(
      cleanQuestion
    );

    // STEP 4: Return generated response
    res.set("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,
      answer: result.answer,
      sources: result.sources,
      model: result.model,
    });

  } catch (error) {
    console.error("Mtaalamu AI error:", {
      name: error?.name,
      status: error?.status,
      code: error?.code,
    });

    // Gemini API rate limit
    if (error.status === 429) {
      return res.status(503).json({
        success: false,
        message:
          "Mtaalamu ana maombi mengi kwa sasa. Tafadhali jaribu tena baadaye.",
        code: "AI_RATE_LIMIT",
      });
    }

    // Temporary AI provider failures
    if (
      [500, 502, 503, 504].includes(error.status)
    ) {
      return res.status(503).json({
        success: false,
        message:
          "Huduma ya Mtaalamu haipatikani kwa sasa. Tafadhali jaribu tena.",
        code: "AI_UNAVAILABLE",
      });
    }

    // Unexpected backend errors
    return res.status(500).json({
      success: false,
      message:
        "Samahani, kuna tatizo limetokea. Tafadhali jaribu tena.",
      code: "MTAALAMU_ERROR",
    });
  }
};