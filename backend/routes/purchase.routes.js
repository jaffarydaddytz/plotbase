import express from "express";

import {
  protect,
} from "../middlewares/auth.middleware.js";

import {
  startPurchaseController,
  getMyPurchasesController,
  getPurchaseDetailsController,
} from "../controllers/purchase.controller.js";

import {
  submitPaymentController,
} from "../controllers/payment.controller.js";

const router = express.Router();

// ==========================================
// START PLOT PURCHASE
// ==========================================

// POST /api/purchases
//
// Authentication required.
//
// Supported payment methods:
// - FULL
// - INSTALLMENTS (3, 6, or 12 months)
//
// The authenticated investor can:
// 1. Initiate a purchase of an available plot.
// 2. Purchase a plot they previously reserved.
//
// The purchase service validates:
// - Project publication status
// - Company approval
// - Plot availability
// - Reservation ownership
// - Company payment terms
// - Authoritative purchase price

router.post(
  "/",
  protect,
  startPurchaseController
);

// ==========================================
// GET INVESTOR PURCHASE HISTORY
// ==========================================

// GET /api/purchases/my
//
// Authentication required.
//
// Investors can retrieve only their
// own purchase records.
//
// Supports pagination:
// ?page=1&limit=10
//
// Returns:
// - Project information
// - Plot information
// - Company information
// - Purchase status
// - Payment method
// - Total purchase price
// - Verified payments
// - Outstanding balance

router.get(
  "/my",
  protect,
  getMyPurchasesController
);

// ==========================================
// GET INVESTOR PURCHASE DETAILS
// ==========================================

// GET /api/purchases/:purchaseId
//
// Authentication required.
//
// Investors can access only purchases
// belonging to their account.
//
// Returns:
// - Project and plot details
// - Company information
// - Purchase information
// - Payment history
// - Verified payment totals
// - Outstanding balance
// - Installment payment schedule
// - Installment progress
// - Overdue installment indicators

router.get(
  "/:purchaseId",
  protect,
  getPurchaseDetailsController
);

// ==========================================
// SUBMIT PURCHASE PAYMENT
// ==========================================

// POST /api/purchases/:purchaseId/payments
//
// Authentication required.
//
// Only the investor who owns the purchase
// can submit payment information.
//
// Supported payment channels:
// - BANK_TRANSFER
// - MOBILE_MONEY
//
// Submitted payments require verification
// by authorized company staff.
//
// Payment submission does NOT:
// - Automatically verify the payment
// - Complete the purchase
// - Mark the plot as SOLD

router.post(
  "/:purchaseId/payments",
  protect,
  submitPaymentController
);

// ==========================================
// EXPORT ROUTER
// ==========================================

export default router;