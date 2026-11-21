import mongoose from "mongoose";

import Purchase from "../models/purchase.model.js";
import Payment from "../models/payment.model.js";

import Company from "../models/company.model.js";
import CompanyMembership from "../models/companyMembership.model.js";
import Reservation from "../models/reservation.model.js";
import Plot from "../models/plot.model.js";

// ==========================================
// ERROR HELPER
// ==========================================

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ==========================================
// CALCULATE INSTALLMENT PAYMENT PROGRESS
// ==========================================

const calculateInstallmentProgress = ({
  purchase,
  totalVerified,
  now = new Date(),
}) => {
  // Full payments do not have installments.

  if (purchase.paymentMethod !== "INSTALLMENTS") {
    return [];
  }

  const schedule = purchase.installmentSchedule;

  // ========================================
  // VALIDATE INSTALLMENT SCHEDULE
  // ========================================

  if (
    ![3, 6, 12].includes(purchase.installmentMonths) ||
    !Array.isArray(schedule) ||
    schedule.length !== purchase.installmentMonths ||
    !Number.isSafeInteger(totalVerified) ||
    totalVerified < 0 ||
    totalVerified > purchase.totalPrice
  ) {
    throw createError(409, "Purchase installment schedule is invalid");
  }

  const totalScheduled = schedule.reduce(
    (sum, installment) => sum + installment.amountDue,
    0,
  );

  if (totalScheduled !== purchase.totalPrice) {
    throw createError(
      409,
      "Installment amounts do not match the purchase price",
    );
  }

  // ========================================
  // ALLOCATE VERIFIED PAYMENTS
  // ========================================

  // Payments satisfy the oldest unpaid
  // installment first.

  let remainingVerified = totalVerified;

  return schedule.map((installment, index) => {
    const dueAt = new Date(installment.dueAt);

    if (
      installment.number !== index + 1 ||
      !Number.isSafeInteger(installment.amountDue) ||
      installment.amountDue <= 0 ||
      Number.isNaN(dueAt.getTime())
    ) {
      throw createError(409, "Invalid installment schedule entry");
    }

    const amountPaid = Math.min(installment.amountDue, remainingVerified);

    remainingVerified -= amountPaid;

    const remainingAmount = installment.amountDue - amountPaid;

    const isOverdue = remainingAmount > 0 && dueAt < now;

    let status = "PENDING";

    if (remainingAmount === 0) {
      status = "PAID";
    } else if (isOverdue) {
      status = "OVERDUE";
    } else if (amountPaid > 0) {
      status = "PARTIALLY_PAID";
    }

    return {
      number: installment.number,
      amountDue: installment.amountDue,
      amountPaid,
      remainingAmount,
      dueAt,
      isOverdue,
      status,
    };
  });
};

// ==========================================
// PAYMENT CONFIGURATION
// ==========================================

const INVESTOR_PAYMENT_CHANNELS = ["BANK_TRANSFER", "MOBILE_MONEY"];

// ==========================================
// SUBMIT PURCHASE PAYMENT
// ==========================================

export const submitPurchasePayment = async ({
  investorId,
  purchaseId,
  amount,
  channel,
  referenceNumber,
}) => {
  // ========================================
  // VALIDATE IDENTIFIERS
  // ========================================

  if (!mongoose.isValidObjectId(investorId)) {
    throw createError(401, "Authenticated investor is required");
  }

  if (!mongoose.isValidObjectId(purchaseId)) {
    throw createError(400, "Invalid purchase ID");
  }

  // ========================================
  // VALIDATE AMOUNT
  // ========================================

  if (
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    throw createError(400, "Payment amount must be a positive whole number");
  }

  // ========================================
  // VALIDATE CHANNEL
  // ========================================

  if (!INVESTOR_PAYMENT_CHANNELS.includes(channel)) {
    throw createError(400, "Invalid payment channel");
  }

  // ========================================
  // VALIDATE TRANSACTION REFERENCE
  // ========================================

  if (
    typeof referenceNumber !== "string" ||
    !referenceNumber.trim() ||
    referenceNumber.trim().length > 100
  ) {
    throw createError(400, "Valid transaction reference is required");
  }

  const normalizedReference = referenceNumber.trim();

  // ========================================
  // START DATABASE TRANSACTION
  // ========================================

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const now = new Date();

      // ==========================================
      // PAYMENT REVIEW DEADLINE
      // ==========================================

      // Company staff should review the payment
      // within 24 hours of submission.

      const reviewDueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // ==================================
      // FIND INVESTOR PURCHASE
      // ==================================

      const purchase = await Purchase.findOne({
        _id: purchaseId,
        investorId,
      })
        .select(
          "_id investorId companyId projectId " +
            "plotId totalPrice status paymentDueAt",
        )
        .session(session)
        .lean();

      if (!purchase) {
        throw createError(404, "Purchase not found");
      }

      // ==================================
      // VALIDATE PURCHASE STATUS
      // ==================================

      if (!["PENDING_PAYMENT", "IN_PROGRESS"].includes(purchase.status)) {
        throw createError(409, "This purchase does not accept payments");
      }

      // ==================================
      // CHECK INITIAL PAYMENT DEADLINE
      // ==================================

      if (
        purchase.status === "PENDING_PAYMENT" &&
        purchase.paymentDueAt <= now
      ) {
        throw createError(409, "Initial payment deadline has expired");
      }

      // ==================================
      // LOCK PURCHASE AGAINST CHANGES
      // ==================================

      const purchaseFilter = {
        _id: purchase._id,
        investorId,
        status: purchase.status,
      };

      if (purchase.status === "PENDING_PAYMENT") {
        purchaseFilter.paymentDueAt = {
          $gt: now,
        };
      }

      const lockedPurchase = await Purchase.findOneAndUpdate(
        purchaseFilter,
        {
          $inc: {
            __v: 1,
          },
        },
        {
          session,
          returnDocument: "after",
          runValidators: true,
        },
      );

      if (!lockedPurchase) {
        throw createError(409, "Purchase status has changed. Please retry.");
      }

      // ==========================================
// PREVENT OVERLAPPING PAYMENT SUBMISSIONS
// ==========================================

// Allow only one submitted payment awaiting
// company verification per purchase.

const pendingReviewPayment = await Payment.findOne({
  purchaseId: purchase._id,
  status: "SUBMITTED",
})
  .select("_id")
  .session(session)
  .lean();

if (pendingReviewPayment) {
  throw createError(
    409,
    "You already have a payment awaiting verification. Please wait for the company to review it."
  );
}

      // ==================================
      // CALCULATE VERIFIED PAYMENTS
      // ==================================

      const paymentTotals = await Payment.aggregate([
        {
          $match: {
            purchaseId: purchase._id,
            status: "VERIFIED",
          },
        },
        {
          $group: {
            _id: null,
            totalVerified: {
              $sum: "$amount",
            },
          },
        },
      ]).session(session);

      const totalVerified = paymentTotals[0]?.totalVerified ?? 0;

      const remainingBalance = purchase.totalPrice - totalVerified;

      // ==================================
      // VALIDATE REMAINING BALANCE
      // ==================================

      if (remainingBalance <= 0) {
        throw createError(409, "This purchase has already been fully paid");
      }

      if (amount > remainingBalance) {
        throw createError(400, "Payment amount exceeds the remaining balance");
      }

      // ==========================================
      // VALIDATE INITIAL PAYMENT REQUIREMENTS
      // ==========================================

      if (purchase.status === "PENDING_PAYMENT") {
        // ========================================
        // FULL PAYMENT
        // ========================================

        if (purchase.paymentMethod === "FULL") {
          if (amount !== purchase.totalPrice) {
            throw createError(
              400,
              "Full payment requires the complete purchase price",
            );
          }
        }

        // ========================================
        // INSTALLMENT PAYMENT
        // ========================================
        else if (purchase.paymentMethod === "INSTALLMENTS") {
          const firstInstallment = purchase.installmentSchedule?.[0];

          if (
            ![3, 6, 12].includes(purchase.installmentMonths) ||
            !firstInstallment ||
            firstInstallment.number !== 1 ||
            !Number.isSafeInteger(firstInstallment.amountDue) ||
            firstInstallment.amountDue <= 0
          ) {
            throw createError(409, "Purchase installment schedule is invalid");
          }

          if (amount < firstInstallment.amountDue) {
            throw createError(
              400,
              `Initial payment must be at least TZS ${firstInstallment.amountDue}`,
            );
          }
        }

        // ========================================
        // INVALID PAYMENT METHOD
        // ========================================
        else {
          throw createError(409, "Purchase payment method is invalid");
        }
      }

      // ==================================
      // CHECK EXISTING REFERENCE
      // ==================================

      const existingPayment = await Payment.findOne({
        companyId: purchase.companyId,
        channel,
        referenceNumber: normalizedReference,
        status: {
          $in: ["PENDING", "SUBMITTED", "VERIFIED"],
        },
      })
        .select("_id")
        .session(session)
        .lean();

      if (existingPayment) {
        throw createError(
          409,
          "This transaction reference has already been submitted",
        );
      }

      // ==================================
      // CREATE PAYMENT RECORD
      // ==================================

      const [payment] = await Payment.create(
        [
          {
            purchaseId: purchase._id,

            investorId: purchase.investorId,

            companyId: purchase.companyId,

            amount,

            currency: "TZS",

            channel,

            referenceNumber: normalizedReference,

            status: "SUBMITTED",

            submittedAt: now,

            reviewDueAt,
          },
        ],
        {
          session,
        },
      );

      // ==================================
      // RESPONSE
      // ==================================

      return {
        id: String(payment._id),

        purchaseId: String(payment.purchaseId),

        amount: payment.amount,

        currency: payment.currency,

        channel: payment.channel,

        referenceNumber: payment.referenceNumber,

        status: payment.status,

        submittedAt: payment.submittedAt,

        reviewDueAt: payment.reviewDueAt,

        totalVerified,

        remainingBalance,
      };
    });

    return result;
  } catch (error) {
    // ======================================
    // HANDLE DATABASE CONFLICTS
    // ======================================

    if (error.code === 11000) {
      throw createError(409, "Duplicate payment transaction");
    }

    if (
      error.code === 112 ||
      error.hasErrorLabel?.("TransientTransactionError")
    ) {
      throw createError(
        409,
        "Another payment operation is in progress. Please retry.",
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

// ==========================================
// VERIFY PURCHASE PAYMENT
// ==========================================

export const verifyPurchasePayment = async ({
  companyId,
  paymentId,
  verifiedBy,
}) => {
  // ========================================
  // VALIDATE IDENTIFIERS
  // ========================================

  if (
    !mongoose.isValidObjectId(companyId) ||
    !mongoose.isValidObjectId(paymentId)
  ) {
    throw createError(400, "Invalid company or payment ID");
  }

  if (!mongoose.isValidObjectId(verifiedBy)) {
    throw createError(401, "Authenticated company staff is required");
  }

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const now = new Date();

      // ==================================
      // VERIFY APPROVED COMPANY
      // ==================================

      const company = await Company.findOne({
        _id: companyId,
        verificationStatus: "APPROVED",
      })
        .select("_id")
        .session(session)
        .lean();

      if (!company) {
        throw createError(403, "Company is not approved for operations");
      }

      // ==================================
      // VERIFY STAFF PERMISSIONS
      // ==================================

      const membership = await CompanyMembership.findOne({
        companyId: company._id,
        userId: verifiedBy,
        status: "ACTIVE",
        role: {
          $in: ["COMPANY_ADMIN", "MANAGER", "ACCOUNTANT"],
        },
      })
        .select("_id role")
        .session(session)
        .lean();

      if (!membership) {
        throw createError(403, "You do not have permission to verify payments");
      }

      // ==================================
      // FIND SUBMITTED PAYMENT
      // ==================================

      const payment = await Payment.findOne({
        _id: paymentId,
        companyId: company._id,
        status: "SUBMITTED",
      })
        .session(session)
        .lean();

      if (!payment) {
        throw createError(404, "Submitted payment not found");
      }

      // ==================================
      // FIND ASSOCIATED PURCHASE
      // ==================================

      const purchase = await Purchase.findOne({
        _id: purchaseId,
        investorId,
      })
        .select(
          "_id investorId companyId projectId " +
            "plotId totalPrice status paymentDueAt " +
            "paymentMethod installmentMonths installmentSchedule",
        )
        .session(session)
        .lean();

      if (!purchase) {
        throw createError(404, "Associated purchase not found");
      }

      // ==================================
      // VALIDATE PURCHASE STATUS
      // ==================================

      if (!["PENDING_PAYMENT", "IN_PROGRESS"].includes(purchase.status)) {
        throw createError(409, "This purchase cannot accept verified payments");
      }

      // ==================================
      // VALIDATE PAYMENT TIMING
      // ==================================

      // Staff may verify a timely submitted
      // payment after the 24-hour deadline.
      //
      // However, the investor must have
      // submitted it before that deadline.

      if (purchase.status === "PENDING_PAYMENT") {
        if (
          !payment.submittedAt ||
          payment.submittedAt > purchase.paymentDueAt
        ) {
          throw createError(
            409,
            "Payment was not submitted before the initial payment deadline",
          );
        }
      }

      // ==================================
      // LOCK PURCHASE
      // ==================================

      // Concurrent payment verifications
      // must write to the same purchase.
      //
      // This prevents two transactions
      // from independently applying
      // payments against the same balance.

      const lockedPurchase = await Purchase.findOneAndUpdate(
        {
          _id: purchase._id,
          companyId: company._id,
          status: purchase.status,
        },
        {
          $inc: {
            __v: 1,
          },
        },
        {
          session,
          returnDocument: "after",
          runValidators: true,
        },
      );

      if (!lockedPurchase) {
        throw createError(409, "Purchase status changed. Please retry.");
      }


      // ==================================
      // VERIFY RESERVED PLOT
      // ==================================

      const plot = await Plot.findOne({
        _id: purchase.plotId,
        projectId: purchase.projectId,
        status: "RESERVED",
      })
        .select("_id plotNumber status")
        .session(session)
        .lean();

      if (!plot) {
        throw createError(409, "Plot is no longer reserved for this purchase");
      }

      // ==================================
      // VERIFY LINKED RESERVATION
      // ==================================

      const expectedReservationStatus =
        purchase.status === "PENDING_PAYMENT" ? "PENDING" : "CONFIRMED";

      const reservation = await Reservation.findOne({
        _id: purchase.reservationId,
        companyId: company._id,
        investorId: purchase.investorId,
        projectId: purchase.projectId,
        plotId: purchase.plotId,
        status: expectedReservationStatus,
      })
        .select("_id status")
        .session(session)
        .lean();

      if (!reservation) {
        throw createError(409, "Purchase reservation is no longer valid");
      }

      // ==================================
      // CALCULATE VERIFIED BALANCE
      // ==================================

      const totals = await Payment.aggregate([
        {
          $match: {
            purchaseId: purchase._id,
            status: "VERIFIED",
          },
        },
        {
          $group: {
            _id: null,
            totalVerified: {
              $sum: "$amount",
            },
          },
        },
      ]).session(session);

      const previouslyVerified = totals[0]?.totalVerified ?? 0;

      if (
        !Number.isSafeInteger(purchase.totalPrice) ||
        purchase.totalPrice <= 0 ||
        !Number.isSafeInteger(payment.amount) ||
        payment.amount <= 0
      ) {
        throw createError(409, "Purchase or payment amount is invalid");
      }

      const newTotalVerified = previouslyVerified + payment.amount;

      // ==================================
      // PREVENT OVERPAYMENT
      // ==================================

      if (
        !Number.isSafeInteger(newTotalVerified) ||
        newTotalVerified > purchase.totalPrice
      ) {
        throw createError(
          409,
          "Payment exceeds the outstanding purchase balance",
        );
      }

      // ==================================
      // VALIDATE FULL PAYMENT
      // ==================================

      // ==========================================
      // CALCULATE INSTALLMENT PROGRESS
      // ==========================================

      const installmentProgress = calculateInstallmentProgress({
        purchase,
        totalVerified: newTotalVerified,
        now,
      });

      if (
        purchase.paymentMethod === "FULL" &&
        newTotalVerified !== purchase.totalPrice
      ) {
        throw createError(
          409,
          "Full payment requires the complete purchase amount",
        );
      }

      // ==================================
      // VALIDATE FIRST INSTALLMENT
      // ==================================

      if (
        purchase.paymentMethod === "INSTALLMENTS" &&
        purchase.status === "PENDING_PAYMENT"
      ) {
        if (![3, 6, 12].includes(purchase.installmentMonths)) {
          throw createError(
            409,
            "Purchase installment configuration is invalid",
          );
        }

        const minimumFirstInstallment = installmentProgress[0]?.amountDue;

        if (
          !Number.isSafeInteger(minimumFirstInstallment) ||
          minimumFirstInstallment <= 0
        ) {
          throw createError(409, "First installment amount is invalid");
        }

        if (payment.amount < minimumFirstInstallment) {
          throw createError(
            409,
            `First installment must be at least TZS ${minimumFirstInstallment}`,
          );
        }
      }

      // ==================================
      // VERIFY PAYMENT ATOMICALLY
      // ==================================

      const verifiedPayment = await Payment.findOneAndUpdate(
        {
          _id: payment._id,
          companyId: company._id,
          status: "SUBMITTED",
        },
        {
          $set: {
            status: "VERIFIED",
            verifiedAt: now,
            verifiedBy,
          },
        },
        {
          session,
          returnDocument: "after",
          runValidators: true,
        },
      );

      if (!verifiedPayment) {
        throw createError(409, "Payment has already been processed");
      }

      // ==================================
      // CONFIRM FIRST PAYMENT RESERVATION
      // ==================================

      if (purchase.status === "PENDING_PAYMENT") {
        const confirmedReservation = await Reservation.findOneAndUpdate(
          {
            _id: reservation._id,
            status: "PENDING",
          },
          {
            $set: {
              status: "CONFIRMED",
              confirmedAt: now,
              confirmedBy: verifiedBy,
            },
          },
          {
            session,
            returnDocument: "after",
            runValidators: true,
          },
        );

        if (!confirmedReservation) {
          throw createError(409, "Unable to confirm purchase reservation");
        }
      }

      // ==================================
      // DETERMINE PURCHASE COMPLETION
      // ==================================

      const isFullyPaid = newTotalVerified === purchase.totalPrice;

      const newPurchaseStatus = isFullyPaid ? "COMPLETED" : "IN_PROGRESS";

      // ==================================
      // COMPLETE PLOT SALE
      // ==================================

      let plotStatus = "RESERVED";

      if (isFullyPaid) {
        const soldPlot = await Plot.findOneAndUpdate(
          {
            _id: purchase.plotId,
            projectId: purchase.projectId,
            status: "RESERVED",
          },
          {
            $set: {
              status: "SOLD",
            },
          },
          {
            session,
            returnDocument: "after",
            runValidators: true,
          },
        );

        if (!soldPlot) {
          throw createError(409, "Unable to complete plot sale");
        }

        plotStatus = soldPlot.status;
      }

      // ==================================
      // UPDATE PURCHASE STATUS
      // ==================================

      const purchaseUpdates = {
        status: newPurchaseStatus,
      };

      if (purchase.status === "PENDING_PAYMENT") {
        purchaseUpdates.startedAt = now;
      }

      if (isFullyPaid) {
        purchaseUpdates.completedAt = now;
      }

      const updatedPurchase = await Purchase.findOneAndUpdate(
        {
          _id: purchase._id,
          companyId: company._id,
          status: purchase.status,
        },
        {
          $set: purchaseUpdates,
        },
        {
          session,
          returnDocument: "after",
          runValidators: true,
        },
      );

      if (!updatedPurchase) {
        throw createError(409, "Unable to update purchase status");
      }

      // ==================================
      // RESPONSE
      // ==================================

      return {
        payment: {
          id: String(verifiedPayment._id),
          amount: verifiedPayment.amount,
          currency: verifiedPayment.currency,
          status: verifiedPayment.status,
          verifiedAt: verifiedPayment.verifiedAt,
          verifiedBy: String(verifiedPayment.verifiedBy),
        },

        purchase: {
          id: String(updatedPurchase._id),

          status: updatedPurchase.status,

          paymentMethod: updatedPurchase.paymentMethod,

          installmentMonths: updatedPurchase.installmentMonths,

          totalPrice: updatedPurchase.totalPrice,

          totalVerified: newTotalVerified,

          remainingBalance: updatedPurchase.totalPrice - newTotalVerified,

          installmentProgress,
        },

        plot: {
          id: String(plot._id),
          plotNumber: plot.plotNumber,
          status: plotStatus,
        },
      };
    });

    return result;
  } catch (error) {
    // ======================================
    // HANDLE CONCURRENT OPERATIONS
    // ======================================

    if (
      error.code === 112 ||
      error.hasErrorLabel?.("TransientTransactionError")
    ) {
      throw createError(
        409,
        "Another payment operation is in progress. Please retry.",
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

// ==========================================
// REJECT PURCHASE PAYMENT
// ==========================================

export const rejectPurchasePayment = async ({
  companyId,
  paymentId,
  rejectedBy,
  rejectionReason,
}) => {
  // ========================================
  // VALIDATE IDENTIFIERS
  // ========================================

  if (
    !mongoose.isValidObjectId(companyId) ||
    !mongoose.isValidObjectId(paymentId)
  ) {
    throw createError(400, "Invalid company or payment ID");
  }

  if (!mongoose.isValidObjectId(rejectedBy)) {
    throw createError(401, "Authenticated company staff is required");
  }

  // ========================================
  // VALIDATE REJECTION REASON
  // ========================================

  if (
    typeof rejectionReason !== "string" ||
    rejectionReason.trim().length < 5 ||
    rejectionReason.trim().length > 500
  ) {
    throw createError(400, "Rejection reason must contain 5 to 500 characters");
  }

  const normalizedReason = rejectionReason.trim();

  // ========================================
  // START DATABASE TRANSACTION
  // ========================================

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      // ==================================
      // VERIFY APPROVED COMPANY
      // ==================================

      const company = await Company.findOne({
        _id: companyId,
        verificationStatus: "APPROVED",
      })
        .select("_id")
        .session(session)
        .lean();

      if (!company) {
        throw createError(403, "Company is not approved for operations");
      }

      // ==================================
      // VERIFY STAFF PERMISSIONS
      // ==================================

      const membership = await CompanyMembership.findOne({
        companyId: company._id,
        userId: rejectedBy,
        status: "ACTIVE",
        role: {
          $in: ["COMPANY_ADMIN", "MANAGER", "ACCOUNTANT"],
        },
      })
        .select("_id role")
        .session(session)
        .lean();

      if (!membership) {
        throw createError(403, "You do not have permission to reject payments");
      }

      // ==================================
      // FIND PAYMENT
      // ==================================

      const payment = await Payment.findOne({
        _id: paymentId,
        companyId: company._id,
      })
        .session(session)
        .lean();

      if (!payment) {
        throw createError(404, "Payment not found");
      }

      // ==================================
      // VALIDATE PAYMENT STATUS
      // ==================================

      if (payment.status !== "SUBMITTED") {
        throw createError(409, "Only submitted payments can be rejected");
      }

      // ==================================
      // VERIFY RELATED PURCHASE
      // ==================================

      const purchase = await Purchase.findOne({
        _id: payment.purchaseId,
        companyId: company._id,
        investorId: payment.investorId,
      })
        .select("_id status")
        .session(session)
        .lean();

      if (!purchase) {
        throw createError(404, "Associated purchase not found");
      }

      // ==================================
      // REJECT PAYMENT ATOMICALLY
      // ==================================

      const rejectedPayment = await Payment.findOneAndUpdate(
        {
          _id: payment._id,
          companyId: company._id,
          status: "SUBMITTED",
        },
        {
          $set: {
            status: "REJECTED",
            rejectionReason: normalizedReason,
          },
        },
        {
          session,
          returnDocument: "after",
          runValidators: true,
        },
      );

      if (!rejectedPayment) {
        throw createError(409, "Payment status has changed. Please retry.");
      }

      // ==================================
      // RETURN RESPONSE
      // ==================================

      return {
        id: String(rejectedPayment._id),

        purchaseId: String(rejectedPayment.purchaseId),

        amount: rejectedPayment.amount,

        currency: rejectedPayment.currency,

        channel: rejectedPayment.channel,

        referenceNumber: rejectedPayment.referenceNumber,

        status: rejectedPayment.status,

        rejectionReason: rejectedPayment.rejectionReason,

        purchaseStatus: purchase.status,

        updatedAt: rejectedPayment.updatedAt,
      };
    });

    return result;
  } catch (error) {
    // ======================================
    // HANDLE CONCURRENT OPERATIONS
    // ======================================

    if (
      error.code === 112 ||
      error.hasErrorLabel?.("TransientTransactionError")
    ) {
      throw createError(
        409,
        "Another payment operation is in progress. Please retry.",
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

// ==========================================
// GET COMPANY PAYMENT REVIEW QUEUE
// ==========================================

export const getCompanyPaymentReviewQueue = async ({
  companyId,
  staffUserId,
  page = 1,
  limit = 10,
}) => {
  // ========================================
  // VALIDATE IDENTIFIERS
  // ========================================

  if (!mongoose.isValidObjectId(companyId)) {
    throw createError(400, "Invalid company ID");
  }

  if (!mongoose.isValidObjectId(staffUserId)) {
    throw createError(401, "Authenticated company staff is required");
  }

  // ========================================
  // VALIDATE PAGINATION
  // ========================================

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50
  ) {
    throw createError(400, "Invalid pagination parameters");
  }

  const skip = (page - 1) * limit;

  if (!Number.isSafeInteger(skip)) {
    throw createError(400, "Invalid pagination parameters");
  }

  // ========================================
  // VERIFY APPROVED COMPANY
  // ========================================

  const company = await Company.findOne({
    _id: companyId,
    verificationStatus: "APPROVED",
  })
    .select("_id")
    .lean();

  if (!company) {
    throw createError(403, "Company is not approved for operations");
  }

  // ========================================
  // VERIFY COMPANY STAFF PERMISSIONS
  // ========================================

  const membership = await CompanyMembership.findOne({
    companyId: company._id,
    userId: staffUserId,
    status: "ACTIVE",
    role: {
      $in: ["COMPANY_ADMIN", "MANAGER", "ACCOUNTANT"],
    },
  })
    .select("_id role")
    .lean();

  if (!membership) {
    throw createError(403, "You do not have permission to review payments");
  }

  // ========================================
  // BUILD COMPANY-SCOPED FILTER
  // ========================================

  // Only payments belonging to this
  // approved company are returned.
  //
  // Only submitted payments appear in
  // the review queue.

  const filter = {
    companyId: company._id,
    status: "SUBMITTED",
  };

  // ========================================
  // FETCH PAYMENT REVIEW QUEUE
  // ========================================

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .select(
        "purchaseId investorId companyId " +
          "amount currency channel " +
          "referenceNumber status " +
          "submittedAt reviewDueAt createdAt",
      )
      .populate({
        path: "investorId",
        select: "name email phone",
      })
      .populate({
        path: "purchaseId",
        select:
          "projectId plotId paymentMethod " +
          "installmentMonths totalPrice status",
        populate: [
          {
            path: "plotId",
            select: "plotNumber areaSqm status",
          },
          {
            path: "projectId",
            select: "title",
          },
        ],
      })
      .sort({
        reviewDueAt: 1,
        submittedAt: 1,
        _id: 1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Payment.countDocuments(filter),
  ]);

  // ========================================
  // CALCULATE REVIEW STATUS
  // ========================================

  const now = new Date();

  const data = payments.map((payment) => {
    const investor = payment.investorId;
    const purchase = payment.purchaseId;

    const plot = purchase?.plotId;
    const project = purchase?.projectId;

    const reviewDueAt = payment.reviewDueAt
      ? new Date(payment.reviewDueAt)
      : null;

    const isOverdue =
      reviewDueAt instanceof Date &&
      !Number.isNaN(reviewDueAt.getTime()) &&
      reviewDueAt < now;

    return {
      id: String(payment._id),

      // ====================================
      // INVESTOR
      // ====================================

      investor: investor
        ? {
            id: String(investor._id),
            name: investor.name ?? null,
            email: investor.email ?? null,
            phone: investor.phone ?? null,
          }
        : null,

      // ====================================
      // PURCHASE
      // ====================================

      purchase: purchase
        ? {
            id: String(purchase._id),

            status: purchase.status,

            totalPrice: purchase.totalPrice,

            paymentMethod: purchase.paymentMethod,

            installmentMonths: purchase.installmentMonths,

            project: project
              ? {
                  id: String(project._id),
                  title: project.title,
                }
              : null,

            plot: plot
              ? {
                  id: String(plot._id),
                  plotNumber: plot.plotNumber,
                  areaSqm: plot.areaSqm,
                  status: plot.status,
                }
              : null,
          }
        : null,

      // ====================================
      // PAYMENT
      // ====================================

      amount: payment.amount,

      currency: payment.currency,

      channel: payment.channel,

      referenceNumber: payment.referenceNumber,

      status: payment.status,

      submittedAt: payment.submittedAt,

      reviewDueAt,

      // ====================================
      // REVIEW STATUS
      // ====================================

      isOverdue,

      reviewStatus: isOverdue ? "OVERDUE" : "AWAITING_REVIEW",

      createdAt: payment.createdAt,
    };
  });

  // ========================================
  // RETURN REVIEW QUEUE
  // ========================================

  const totalPages = Math.ceil(total / limit);

  return {
    payments: data,

    pagination: {
      page,
      limit,
      total,
      totalPages,

      hasNextPage: page < totalPages,

      hasPreviousPage: page > 1,
    },
  };
};
