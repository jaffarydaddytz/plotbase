import {
  startPlotPurchase,
  getInvestorPurchases,
  getInvestorPurchaseById,
} from "../services/purchaseService.js";

// ==========================================
// START PLOT PURCHASE CONTROLLER
// ==========================================

export const startPurchaseController = async (
  req,
  res
) => {
  try {
    // ======================================
    // VERIFY AUTHENTICATED USER
    // ======================================

    const investorId = req.user?._id;

    if (!investorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required",
      });
    }

    // ======================================
    // VALIDATE REQUEST BODY
    // ======================================

    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid purchase information is required",
      });
    }

    // ======================================
    // ALLOWED REQUEST FIELDS
    // ======================================

    // Never accept investorId, companyId,
    // totalPrice, status, or paymentDueAt
    // from the frontend.

    const allowedFields = [
      "projectId",
      "plotId",
      "paymentMethod",
      "installmentMonths",
    ];

    const requestFields = Object.keys(req.body);

    if (
      requestFields.some(
        (field) => !allowedFields.includes(field)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Purchase request contains unsupported fields",
      });
    }

    // ======================================
    // EXTRACT REQUEST DATA
    // ======================================

    const {
      projectId,
      plotId,
      paymentMethod,
      installmentMonths,
    } = req.body;

    // ======================================
    // VALIDATE PROJECT AND PLOT
    // ======================================

    if (
      typeof projectId !== "string" ||
      typeof plotId !== "string" ||
      !projectId.trim() ||
      !plotId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid projectId and plotId are required",
      });
    }

    // ======================================
    // VALIDATE PAYMENT METHOD
    // ======================================

    if (
      !["FULL", "INSTALLMENTS"].includes(
        paymentMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    // ======================================
    // VALIDATE INSTALLMENT SELECTION
    // ======================================

    if (paymentMethod === "FULL") {
      if (installmentMonths != null) {
        return res.status(400).json({
          success: false,
          message:
            "Installment duration is not allowed for full payment",
        });
      }
    }

    if (paymentMethod === "INSTALLMENTS") {
      if (
        !Number.isInteger(installmentMonths) ||
        ![3, 6, 12].includes(installmentMonths)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Select a valid installment duration",
        });
      }
    }

    // ======================================
    // START PURCHASE
    // ======================================

    // The service performs:
    //
    // - Project availability validation
    // - Company approval validation
    // - Payment terms validation
    // - Plot availability validation
    // - Existing reservation validation
    // - Authoritative price calculation
    // - Transactional purchase creation

    const purchase = await startPlotPurchase({
      investorId,

      projectId: projectId.trim(),

      plotId: plotId.trim(),

      paymentMethod,

      installmentMonths:
        paymentMethod === "INSTALLMENTS"
          ? installmentMonths
          : null,
    });

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(201).json({
      success: true,
      message: "Plot purchase initiated successfully",
      purchase,
    });

  } catch (error) {
    // ======================================
    // HANDLE EXPECTED ERRORS
    // ======================================

    const allowedErrorCodes = [
      400,
      401,
      403,
      404,
      409,
    ];

    if (
      allowedErrorCodes.includes(error.statusCode)
    ) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    // ======================================
    // HANDLE UNEXPECTED ERRORS
    // ======================================

    console.error(
      "Start purchase error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to initiate plot purchase",
    });
  }
};


// ==========================================
// GET INVESTOR PURCHASE HISTORY
// ==========================================

export const getMyPurchasesController = async (req, res) => {
  try {
    // ======================================
    // VERIFY AUTHENTICATION
    // ======================================

    const investorId = req.user?._id;

    if (!investorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required",
      });
    }

    // ======================================
    // VALIDATE PAGINATION
    // ======================================

    const page =
      req.query.page === undefined
        ? 1
        : Number(req.query.page);

    const limit =
      req.query.limit === undefined
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
    // FETCH INVESTOR PURCHASES
    // ======================================

    const result = await getInvestorPurchases({
      investorId,
      page,
      limit,
    });

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      message: "Purchase history retrieved successfully",
      purchases: result.purchases,
      pagination: result.pagination,
    });
  } catch (error) {
    if ([400, 401, 403, 404, 409].includes(error.statusCode)) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Get investor purchases error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve purchase history",
    });
  }
};

// ==========================================
// GET INVESTOR PURCHASE DETAILS
// ==========================================

export const getPurchaseDetailsController = async (req, res) => {
  try {
    // ======================================
    // VERIFY AUTHENTICATION
    // ======================================

    const investorId = req.user?._id;

    if (!investorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required",
      });
    }

    // ======================================
    // GET PURCHASE ID
    // ======================================

    const { purchaseId } = req.params;

    if (
      typeof purchaseId !== "string" ||
      !purchaseId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid purchase ID is required",
      });
    }

    // ======================================
    // FETCH PURCHASE DETAILS
    // ======================================

    const purchase = await getInvestorPurchaseById({
      investorId,
      purchaseId: purchaseId.trim(),
    });

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      message: "Purchase details retrieved successfully",
      purchase,
    });
  } catch (error) {
    if ([400, 401, 403, 404, 409].includes(error.statusCode)) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Get purchase details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve purchase details",
    });
  }
};