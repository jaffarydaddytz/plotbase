import express from "express";

import {
  getMe,
  login,
  register,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from "../controllers/auth.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const authRouter = express.Router();

// Authentication
authRouter.post("/register", register);
authRouter.post("/login", login);

// Authenticated user
authRouter.get("/me", protect, getMe);

// Email verification
authRouter.post("/verify-email", verifyEmail);
authRouter.post("/resend-verification", resendVerification);

// Password recovery
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password/:token", resetPassword);

export default authRouter;