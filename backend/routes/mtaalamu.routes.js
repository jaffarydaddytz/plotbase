import express from "express";

import {
  askMtaalamu,
} from "../controllers/mtaalamu.controller.js";

import {
  mtaalamuRateLimit,
} from "../middlewares/mtaalamuRateLimit.middleware.js";

const mtaalamuRouter = express.Router();

/**
 * MTAALAMU AI ROUTES
 *
 * POST /api/mtaalamu/ask
 *
 * Receives user questions and returns
 * AI-generated answers grounded in
 * approved Plotbase knowledge.
 */

// Ask Mtaalamu
mtaalamuRouter.post(
  "/ask",
  mtaalamuRateLimit,
  askMtaalamu
);

export default mtaalamuRouter;