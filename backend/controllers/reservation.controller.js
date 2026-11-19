import {
  createPlotReservation,
  cancelPlotReservation,
  getInvestorReservations,
  getInvestorReservationById,
  getCompanyReservations,
  confirmPlotReservation,
} from "../services/reservationService.js";

// ==========================================
// CREATE PLOT RESERVATION CONTROLLER
// ==========================================

export const createReservationController = async (
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
        message: "Valid booking information is required",
      });
    }

    // Only accept projectId and plotId.
    // Investor identity, company identity,
    // plot price and booking status must
    // never come from the frontend.

    const allowedFields = [
      "projectId",
      "plotId",
    ];

    const requestFields = Object.keys(req.body);

    if (
      requestFields.length !== allowedFields.length ||
      requestFields.some(
        (field) => !allowedFields.includes(field)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Only projectId and plotId are allowed",
      });
    }

    const { projectId, plotId } = req.body;

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
    // CREATE RESERVATION
    // ======================================

    const reservation = await createPlotReservation({
      investorId,
      projectId: projectId.trim(),
      plotId: plotId.trim(),
    });

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(201).json({
      success: true,
      message: "Plot reserved successfully",
      reservation,
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
      "Create reservation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create plot reservation",
    });
  }
};


// ==========================================
// CANCEL PLOT RESERVATION CONTROLLER
// ==========================================

export const cancelReservationController = async (
  req,
  res
) => {
  try {
    // ======================================
    // VERIFY AUTHENTICATED INVESTOR
    // ======================================

    const investorId = req.user?._id;

    if (!investorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required",
      });
    }

    // ======================================
    // EXTRACT RESERVATION ID
    // ======================================

    const { reservationId } = req.params;

    if (
      typeof reservationId !== "string" ||
      !reservationId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Reservation ID is required",
      });
    }

    // ======================================
    // CANCEL RESERVATION
    // ======================================

    const reservation = await cancelPlotReservation({
      investorId,
      reservationId: reservationId.trim(),
    });

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      message: "Reservation cancelled successfully",
      reservation,
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
      "Cancel reservation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to cancel reservation",
    });
  }
};


// ==========================================
// GET INVESTOR RESERVATION HISTORY
// ==========================================

export const getMyReservationsController = async (
  req,
  res
) => {
  try {
    // ======================================
    // AUTHENTICATED INVESTOR
    // ======================================

    const investorId = req.user?._id;

    if (!investorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required",
      });
    }

    // ======================================
    // PAGINATION PARAMETERS
    // ======================================

    const rawPage = req.query.page ?? "1";
    const rawLimit = req.query.limit ?? "10";

    // Accept positive integer strings only.
    // Reject arrays, decimals, and invalid values.

    if (
      typeof rawPage !== "string" ||
      typeof rawLimit !== "string" ||
      !/^\d+$/.test(rawPage) ||
      !/^\d+$/.test(rawLimit)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
    }

    const page = Number(rawPage);
    const limit = Number(rawLimit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Page must be positive and limit must be between 1 and 50",
      });
    }

    // ======================================
    // FETCH RESERVATION HISTORY
    // ======================================

    const result = await getInvestorReservations({
      investorId,
      page,
      limit,
    });

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      reservations: result.reservations,
      pagination: result.pagination,
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
      "Get investor reservations error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve reservations",
    });
  }
};


// ==========================================
// GET INVESTOR RESERVATION DETAILS
// ==========================================

export const getReservationDetailsController = async (
  req,
  res
) => {
  try {
    // ======================================
    // VERIFY AUTHENTICATED INVESTOR
    // ======================================

    const investorId = req.user?._id;

    if (!investorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required",
      });
    }

    // ======================================
    // VALIDATE RESERVATION ID
    // ======================================

    const { reservationId } = req.params;

    if (
      typeof reservationId !== "string" ||
      !reservationId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Reservation ID is required",
      });
    }

    // ======================================
    // FETCH RESERVATION DETAILS
    // ======================================

    const reservation =
      await getInvestorReservationById({
        investorId,
        reservationId: reservationId.trim(),
      });

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      reservation,
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
      "Get reservation details error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve reservation details",
    });
  }
};



// ==========================================
// GET COMPANY RESERVATIONS
// ==========================================

export const getCompanyReservationsController = async (
  req,
  res
) => {
  try {
    // ======================================
    // VERIFY AUTHENTICATION
    // ======================================

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required",
      });
    }

    // ======================================
    // GET VERIFIED COMPANY CONTEXT
    // ======================================

    // requireCompanyMembership middleware
    // must run before this controller.
    //
    // Never use a company ID supplied
    // in the request body.

    const companyId = req.company?._id;

    if (!companyId || !req.companyMembership) {
      return res.status(403).json({
        success: false,
        message: "Company access is required",
      });
    }

    // ======================================
    // PAGINATION PARAMETERS
    // ======================================

    const rawPage = req.query.page ?? "1";
    const rawLimit = req.query.limit ?? "10";

    if (
      typeof rawPage !== "string" ||
      typeof rawLimit !== "string" ||
      !/^\d+$/.test(rawPage) ||
      !/^\d+$/.test(rawLimit)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
    }

    const page = Number(rawPage);
    const limit = Number(rawLimit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Page must be positive and limit must be between 1 and 50",
      });
    }

    // ======================================
    // OPTIONAL FILTERS
    // ======================================

    const status = req.query.status ?? null;
    const projectId = req.query.projectId ?? null;

    // Reject arrays and other invalid values.

    if (
      (status !== null &&
        (typeof status !== "string" || !status.trim())) ||
      (projectId !== null &&
        (typeof projectId !== "string" || !projectId.trim()))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid reservation filters",
      });
    }

    // ======================================
    // FETCH COMPANY RESERVATIONS
    // ======================================

    const result = await getCompanyReservations({
      companyId,
      page,
      limit,
      status: status === null ? null : status.trim(),
      projectId:
        projectId === null ? null : projectId.trim(),
    });

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      reservations: result.reservations,
      pagination: result.pagination,
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

    if (allowedErrorCodes.includes(error.statusCode)) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    // ======================================
    // HANDLE UNEXPECTED ERRORS
    // ======================================

    console.error(
      "Get company reservations error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve company reservations",
    });
  }
};

// ==========================================
// CONFIRM PLOT RESERVATION
// ==========================================

export const confirmReservationController = async (
  req,
  res
) => {
  try {
    // ======================================
    // VERIFY AUTHENTICATED USER
    // ======================================

    const confirmedBy = req.user?._id;

    if (!confirmedBy) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required",
      });
    }

    // ======================================
    // VERIFY COMPANY ACCESS
    // ======================================

    // The requireCompanyMembership middleware
    // must execute before this controller.

    const companyId = req.company?._id;
    const membership = req.companyMembership;

    if (!companyId || !membership) {
      return res.status(403).json({
        success: false,
        message: "Company access is required",
      });
    }

    // ======================================
    // VERIFY STAFF PERMISSION
    // ======================================

    const allowedRoles = [
      "COMPANY_ADMIN",
      "MANAGER",
    ];

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to confirm reservations",
      });
    }

    // ======================================
    // VALIDATE RESERVATION ID
    // ======================================

    const { reservationId } = req.params;

    if (
      typeof reservationId !== "string" ||
      !reservationId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Reservation ID is required",
      });
    }

    // ======================================
    // CONFIRM RESERVATION
    // ======================================

    const reservation = await confirmPlotReservation({
      companyId,
      reservationId: reservationId.trim(),
      confirmedBy,
    });

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      message: "Reservation confirmed successfully",
      reservation,
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

    if (allowedErrorCodes.includes(error.statusCode)) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    // ======================================
    // HANDLE UNEXPECTED ERRORS
    // ======================================

    console.error(
      "Confirm reservation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to confirm reservation",
    });
  }
};