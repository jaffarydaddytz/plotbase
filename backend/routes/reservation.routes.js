import express from "express";

import {
  protect,
} from "../middlewares/auth.middleware.js";

import {
  createReservationController,
  cancelReservationController,
  getMyReservationsController,
  getReservationDetailsController,
} from "../controllers/reservation.controller.js";

const router = express.Router();

// ==========================================
// CREATE PLOT RESERVATION
// ==========================================

// POST /api/reservations
// Authentication required.

router.post(
  "/",
  protect,
  createReservationController
);

// ==========================================
// INVESTOR RESERVATION HISTORY
// ==========================================

// GET /api/reservations/my
// Query parameters: ?page=1&limit=10
// Authentication required.

router.get(
  "/my",
  protect,
  getMyReservationsController
);

// ==========================================
// INVESTOR RESERVATION DETAILS
// ==========================================

// GET /api/reservations/:reservationId
// Authentication required.
//
// Investors can access only their own
// reservation details.

router.get(
  "/:reservationId",
  protect,
  getReservationDetailsController
);

// ==========================================
// CANCEL PLOT RESERVATION
// ==========================================

// PATCH /api/reservations/:reservationId/cancel
// Authentication required.
//
// Only the reservation owner can cancel.
// Only PENDING reservations are cancellable.

router.patch(
  "/:reservationId/cancel",
  protect,
  cancelReservationController
);

export default router;