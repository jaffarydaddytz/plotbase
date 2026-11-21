import express from "express";

import {
  protect,
} from "../middlewares/auth.middleware.js";

import {
  requireCompanyMembership,
} from "../middlewares/companyAccess.middleware.js";

import {
  verifyPaymentController,
  rejectPaymentController,
  getPaymentReviewQueueController,
} from "../controllers/payment.controller.js";

const router = express.Router();

// ==========================================
// COMPANY PAYMENT AUTHORIZATION
// ==========================================

const paymentRoles = [
  "COMPANY_ADMIN",
  "MANAGER",
  "ACCOUNTANT",
];

// ==========================================
// VERIFY PURCHASE PAYMENT
// ==========================================

// PATCH /api/companies/:companyId/payments/:paymentId/verify
//
// Only authorized company staff can verify
// payments belonging to their company.
//
// Payment verification must confirm that
// funds were actually received.

router.patch(
  "/:companyId/payments/:paymentId/verify",
  protect,
  requireCompanyMembership(...paymentRoles),
  verifyPaymentController
);

// ==========================================
// REJECT PURCHASE PAYMENT
// ==========================================

// PATCH /api/companies/:companyId/payments/:paymentId/reject
//
// Only authorized company staff can reject
// submitted payments.
//
// A rejection reason is required.

router.patch(
  "/:companyId/payments/:paymentId/reject",
  protect,
  requireCompanyMembership(...paymentRoles),
  rejectPaymentController
);


// ==========================================
// COMPANY PAYMENT REVIEW QUEUE
// ==========================================

// GET /api/companies/:companyId/payments/review-queue
//
// Authorized company staff:
// - COMPANY_ADMIN
// - MANAGER
// - ACCOUNTANT
//
// Returns submitted payments with:
// - Investor information
// - Purchase and plot details
// - Payment amounts
// - Transaction references
// - Review deadlines
// - Overdue review indicators
//
// Supports pagination:
// ?page=1&limit=10

router.get(
  "/:companyId/payments/review-queue",
  protect,
  requireCompanyMembership(...paymentRoles),
  getPaymentReviewQueueController
);

export default router;