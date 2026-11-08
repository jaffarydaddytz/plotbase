import { rateLimit } from "express-rate-limit";

/**
 * Mtaalamu AI Request Rate Limiter
 *
 * Protects the Gemini API from excessive requests.
 *
 * Initial development limits:
 * - Maximum 10 requests per minute per IP address.
 * - Returns HTTP 429 when the limit is exceeded.
 * - Applies only to Mtaalamu routes where attached.
 *
 * Uses in-memory storage for local development.
 */

export const mtaalamuRateLimit = rateLimit({
  windowMs: 60 * 1000,

  limit: 10,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Umetuma maswali mengi kwa muda mfupi. Tafadhali jaribu tena baada ya dakika moja.",
    code: "MTAALAMU_RATE_LIMIT",
  },
});