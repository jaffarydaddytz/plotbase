import {
  submitPurchasePayment,
  verifyPurchasePayment,
  rejectPurchasePayment,
  getCompanyPaymentReviewQueue,
} from "../services/paymentService.js";

// ==========================================
// ERROR HANDLER
// ==========================================

const handlePaymentError = (error, res, operation) => {
  const allowedErrorCodes = [400, 401, 403, 404, 409];

  if (allowedErrorCodes.includes(error.statusCode)) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  console.error(`${operation}:`, error);

  return res.status(500).json({
    success: false,
    message: "Unable to process payment request",
  });
};

// ==========================================
// SUBMIT PURCHASE PAYMENT
// ==========================================

export const submitPaymentController = async (req, res) => {
  try {
    const investorId = req.user?._id;
    const { purchaseId } = req.params;

    if (!investorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // ======================================
    // VALIDATE REQUEST BODY
    // ======================================

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Valid payment information is required",
      });
    }

    const allowedFields = ["amount", "channel", "referenceNumber"];

    const requestFields = Object.keys(req.body);

    if (
      requestFields.length !== allowedFields.length ||
      requestFields.some((field) => !allowedFields.includes(field))
    ) {
      return res.status(400).json({
        success: false,
        message: "Only amount, channel and referenceNumber are allowed",
      });
    }

    // ======================================
    // SUBMIT PAYMENT
    // ======================================

    const payment = await submitPurchasePayment({
      investorId,
      purchaseId,
      amount: req.body.amount,
      channel: req.body.channel,
      referenceNumber: req.body.referenceNumber,
    });

    return res.status(201).json({
      success: true,
      message: "Payment submitted for verification",
      payment,
    });
  } catch (error) {
    return handlePaymentError(error, res, "Submit payment error");
  }
};

// ==========================================
// VERIFY PURCHASE PAYMENT
// ==========================================

export const verifyPaymentController = async (req, res) => {
  try {
    const verifiedBy = req.user?._id;
    const companyId = req.company?._id;
    const { paymentId } = req.params;

    if (!verifiedBy) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Verified company access is required",
      });
    }

    const payment = await verifyPurchasePayment({
      companyId,
      paymentId,
      verifiedBy,
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      ...payment,
    });
  } catch (error) {
    return handlePaymentError(error, res, "Verify payment error");
  }
};

// ==========================================
// REJECT PURCHASE PAYMENT
// ==========================================

export const rejectPaymentController = async (req, res) => {
  try {
    const rejectedBy = req.user?._id;
    const companyId = req.company?._id;
    const { paymentId } = req.params;

    if (!rejectedBy) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Verified company access is required",
      });
    }

    // ======================================
    // VALIDATE REQUEST BODY
    // ======================================

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const requestFields = Object.keys(req.body);

    if (requestFields.length !== 1 || requestFields[0] !== "rejectionReason") {
      return res.status(400).json({
        success: false,
        message: "Only rejectionReason is allowed",
      });
    }

    // ======================================
    // REJECT PAYMENT
    // ======================================

    const payment = await rejectPurchasePayment({
      companyId,
      paymentId,
      rejectedBy,
      rejectionReason: req.body.rejectionReason,
    });

    return res.status(200).json({
      success: true,
      message: "Payment rejected successfully",
      payment,
    });
  } catch (error) {
    return handlePaymentError(error, res, "Reject payment error");
  }
};


// ==========================================
// GET COMPANY PAYMENT REVIEW QUEUE
// ==========================================

export const getPaymentReviewQueueController = async (
  req,
  res
) => {
  try {
    // ======================================
    // VERIFY AUTHENTICATION
    // ======================================

    const staffUserId = req.user?._id;

    if (!staffUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // ======================================
    // VERIFY COMPANY CONTEXT
    // ======================================

    const companyId = req.company?._id;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Verified company access is required",
      });
    }

    // ======================================
    // VALIDATE PAGINATION
    // ======================================

    const page = req.query.page === undefined
      ? 1
      : Number(req.query.page);

    const limit = req.query.limit === undefined
      ? 10
      : Number(req.query.limit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
    }

    // ======================================
    // FETCH PAYMENT REVIEW QUEUE
    // ======================================

    const result = await getCompanyPaymentReviewQueue({
      companyId,
      staffUserId,
      page,
      limit,
    });

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      message: "Payment review queue retrieved successfully",
      payments: result.payments,
      pagination: result.pagination,
    });

  } catch (error) {
    return handlePaymentError(
      error,
      res,
      "Get payment review queue error"
    );
  }
};
