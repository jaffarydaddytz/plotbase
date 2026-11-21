import mongoose from "mongoose";
import Payment from "../models/payment.model.js";
import Project from "../models/project.models.js";
import Plot from "../models/plot.model.js";
import Company from "../models/company.model.js";
import Reservation from "../models/reservation.model.js";
import Purchase from "../models/purchase.model.js";
import CompanyMembership from "../models/companyMembership.model.js";


// ==========================================
// CONFIGURATION
// ==========================================

// Temporary reservation duration.
// This can later become a company-level
// booking policy.
const RESERVATION_HOURS = 24;

// ==========================================
// ERROR HELPER
// ==========================================

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ==========================================
// CREATE PLOT RESERVATION
// ==========================================

export const createPlotReservation = async ({
  investorId,
  projectId,
  plotId,
}) => {
  // ========================================
  // VALIDATE IDENTIFIERS
  // ========================================

  if (!mongoose.isValidObjectId(investorId)) {
    throw createError(
      401,
      "Authenticated investor is required"
    );
  }

  if (
    !mongoose.isValidObjectId(projectId) ||
    !mongoose.isValidObjectId(plotId)
  ) {
    throw createError(
      400,
      "Invalid project or plot ID"
    );
  }

  // ========================================
  // START DATABASE TRANSACTION
  // ========================================

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(
      async () => {
        // ==================================
        // VERIFY PUBLISHED PROJECT
        // ==================================

        const project = await Project.findOne({
          _id: projectId,
          status: "ACTIVE",

          // Only company-owned projects
          // are eligible for bookings.
          companyId: {
            $type: "objectId",
          },

          projectType: {
            $in: ["VIWANJA", "MASHAMBA"],
          },
        })
          .select("_id companyId status")
          .session(session)
          .lean();

        if (!project) {
          throw createError(
            404,
            "Project is unavailable for booking"
          );
        }

        // ==================================
        // VERIFY COMPANY APPROVAL
        // ==================================

        const company = await Company.findOne({
          _id: project.companyId,
          verificationStatus: "APPROVED",
        })
          .select("_id")
          .session(session)
          .lean();

        if (!company) {
          throw createError(
            404,
            "Project is unavailable for booking"
          );
        }

        // ==================================
        // RESERVE AVAILABLE PLOT
        // ==================================

        // Atomic conditional update:
        // only an AVAILABLE plot belonging
        // to this project can be reserved.

        const plot = await Plot.findOneAndUpdate(
          {
            _id: plotId,
            projectId: project._id,
            status: "AVAILABLE",

            // Do not reserve unpriced plots.
            totalPrice: {
              $gt: 0,
            },
          },
          {
            $set: {
              status: "RESERVED",
            },
          },
        {
        session,
        returnDocument: "after",
        runValidators: true,
        }
        );

        if (!plot) {
          throw createError(
            409,
            "This plot is no longer available for booking"
          );
        }

        // ==================================
        // CALCULATE EXPIRATION
        // ==================================

        const expiresAt = new Date(
          Date.now() +
            RESERVATION_HOURS * 60 * 60 * 1000
        );

        // ==================================
        // CREATE RESERVATION RECORD
        // ==================================

        const [reservation] = await Reservation.create(
          [
            {
              investorId,
              companyId: company._id,
              projectId: project._id,
              plotId: plot._id,

              // Snapshot the authoritative
              // price from the database.
              totalPrice: plot.totalPrice,

              status: "PENDING",
              expiresAt,
            },
          ],
          {
            session,
          }
        );

        // ==================================
        // RESPONSE DATA
        // ==================================

        return {
          id: String(reservation._id),

          investorId: String(
            reservation.investorId
          ),

          companyId: String(
            reservation.companyId
          ),

          projectId: String(
            reservation.projectId
          ),

          plotId: String(
            reservation.plotId
          ),

          plotNumber: plot.plotNumber,
          areaSqm: plot.areaSqm,

          totalPrice: reservation.totalPrice,

          status: reservation.status,

          plotStatus: plot.status,

          expiresAt: reservation.expiresAt,
          createdAt: reservation.createdAt,
        };
      }
    );

    return result;
  } catch (error) {
    // ======================================
    // HANDLE COMPETING BOOKINGS
    // ======================================

    // Duplicate reservation index.
    if (error.code === 11000) {
      throw createError(
        409,
        "This plot already has an active reservation"
      );
    }

    // MongoDB write conflict or transient
    // transaction conflict.
    if (
      error.code === 112 ||
      error.hasErrorLabel?.(
        "TransientTransactionError"
      )
    ) {
      throw createError(
        409,
        "Another booking operation is in progress. Please retry."
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
};



// ==========================================
// CANCEL PLOT RESERVATION
// ==========================================

export const cancelPlotReservation = async ({
  investorId,
  reservationId,
}) => {
  // ========================================
  // VALIDATE IDENTIFIERS
  // ========================================

  if (!mongoose.isValidObjectId(investorId)) {
    throw createError(
      401,
      "Authenticated investor is required"
    );
  }

  if (!mongoose.isValidObjectId(reservationId)) {
    throw createError(
      400,
      "Invalid reservation ID"
    );
  }

  // ========================================
  // START DATABASE TRANSACTION
  // ========================================

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(
      async () => {
        // ==================================
        // FIND INVESTOR RESERVATION
        // ==================================

        const reservation = await Reservation.findOne({
          _id: reservationId,
          investorId,
        })
          .session(session)
          .lean();

        if (!reservation) {
          throw createError(
            404,
            "Reservation not found"
          );
        }

        // ==================================
        // VALIDATE RESERVATION STATUS
        // ==================================

        if (reservation.status !== "PENDING") {
          throw createError(
            409,
            "Only pending reservations can be cancelled"
          );
        }

        // ==========================================
// PREVENT CANCELLATION OF ACTIVE PURCHASES
// ==========================================

const activePurchase = await Purchase.findOne({
  reservationId: reservation._id,
  status: {
    $in: [
      "PENDING_PAYMENT",
      "IN_PROGRESS",
      "COMPLETED",
    ],
  },
})
  .select("_id status")
  .session(session)
  .lean();

if (activePurchase) {
  throw createError(
    409,
    "This reservation is linked to a purchase and cannot be cancelled directly"
  );
}

        // ==================================
        // CANCEL RESERVATION
        // ==================================

        const cancelledAt = new Date();

        const updatedReservation =
          await Reservation.findOneAndUpdate(
            {
              _id: reservation._id,
              investorId,
              status: "PENDING",
            },
            {
              $set: {
                status: "CANCELLED",
                cancelledAt,
              },
            },
            {
              session,
              returnDocument: "after",
              runValidators: true,
            }
          );

        if (!updatedReservation) {
          throw createError(
            409,
            "Reservation status has changed. Please retry."
          );
        }

        // ==================================
        // RELEASE RESERVED PLOT
        // ==================================

        const releasedPlot =
          await Plot.findOneAndUpdate(
            {
              _id: reservation.plotId,
              projectId: reservation.projectId,
              status: "RESERVED",
            },
            {
              $set: {
                status: "AVAILABLE",
              },
            },
            {
              session,
              returnDocument: "after",
              runValidators: true,
            }
          );

        if (!releasedPlot) {
          // Throwing here aborts the entire
          // transaction, including the
          // reservation status update.

          throw createError(
            409,
            "Plot cannot be released. Reservation cancellation was not completed."
          );
        }

        // ==================================
        // RESPONSE
        // ==================================

        return {
          id: String(updatedReservation._id),

          investorId: String(
            updatedReservation.investorId
          ),

          projectId: String(
            updatedReservation.projectId
          ),

          plotId: String(
            updatedReservation.plotId
          ),

          plotNumber: releasedPlot.plotNumber,

          status: updatedReservation.status,

          plotStatus: releasedPlot.status,

          cancelledAt:
            updatedReservation.cancelledAt,

          updatedAt:
            updatedReservation.updatedAt,
        };
      }
    );

    return result;

  } catch (error) {
    // ======================================
    // HANDLE TRANSACTION CONFLICTS
    // ======================================

    if (
      error.code === 112 ||
      error.hasErrorLabel?.(
        "TransientTransactionError"
      )
    ) {
      throw createError(
        409,
        "Another reservation operation is in progress. Please retry."
      );
    }

    throw error;

  } finally {
    await session.endSession();
  }
};

// ==========================================
// EXPIRE PENDING RESERVATIONS
// ==========================================

export const expirePendingReservations = async ({
  now = new Date(),
  batchSize = 50,
} = {}) => {
  // ========================================
  // VALIDATE OPTIONS
  // ========================================

  if (
    !(now instanceof Date) ||
    Number.isNaN(now.getTime())
  ) {
    throw new Error("Invalid expiration date");
  }

  if (
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > 200
  ) {
    throw new Error(
      "Batch size must be between 1 and 200"
    );
  }


  // ========================================
  // FIND EXPIRED PENDING RESERVATIONS
  // ========================================

  const candidates = await Reservation.find({
    status: "PENDING",
    expiresAt: {
      $lte: now,
    },
  })
    .select("_id")
    .sort({
      expiresAt: 1,
      _id: 1,
    })
    .limit(batchSize)
    .lean();

  let expired = 0;
  let skipped = 0;

  // ========================================
  // PROCESS EACH RESERVATION
  // ========================================

  for (const candidate of candidates) {
    const session = await mongoose.startSession();

    try {
      const result = await session.withTransaction(
        async () => {
          // ==========================================
// CHECK FOR LINKED PURCHASE
// ==========================================

const linkedPurchase = await Purchase.findOne({
  reservationId: candidate._id,
})
  .select("_id status paymentDueAt")
  .session(session)
  .lean();

// Do not release inventory belonging to a
// purchase that has already progressed
// beyond the initial payment stage.

if (
  linkedPurchase &&
  ["IN_PROGRESS", "COMPLETED"].includes(
    linkedPurchase.status
  )
) {
  return false;
}

// Do not release the plot before the
// purchase payment deadline.

if (
  linkedPurchase?.status === "PENDING_PAYMENT" &&
  linkedPurchase.paymentDueAt > now
) {
  return false;
}

// ==========================================
// PROTECT PAYMENTS AWAITING VERIFICATION
// ==========================================

// A payment submitted within the deadline
// must be reviewed before releasing the plot.

if (linkedPurchase?.status === "PENDING_PAYMENT") {
  const pendingPayment = await Payment.findOne({
    purchaseId: linkedPurchase._id,

    status: "SUBMITTED",

    submittedAt: {
      $lte: linkedPurchase.paymentDueAt,
    },
  })
    .select("_id")
    .session(session)
    .lean();

  if (pendingPayment) {
    // Payment verification is still pending.
    // Do not expire the purchase or
    // release the reserved plot.
    return false;
  }
}
          // ==================================
          // MARK RESERVATION AS EXPIRED
          // ==================================

          const reservation =
            await Reservation.findOneAndUpdate(
              {
                _id: candidate._id,
                status: "PENDING",
                expiresAt: {
                  $lte: now,
                },
              },
              {
                $set: {
                  status: "EXPIRED",
                },
              },
              {
                session,
                returnDocument: "after",
                runValidators: true,
              }
            );

          // Another operation may already
          // have cancelled, confirmed, or
          // expired this reservation.

          if (!reservation) {
            return false;
          }

          // ==========================================
// EXPIRE LINKED UNPAID PURCHASE
// ==========================================

if (linkedPurchase?.status === "PENDING_PAYMENT") {
  const expiredPurchase =
    await Purchase.findOneAndUpdate(
      {
        _id: linkedPurchase._id,
        status: "PENDING_PAYMENT",
        paymentDueAt: {
          $lte: now,
        },
      },
      {
        $set: {
          status: "EXPIRED",
          expiredAt: now,
        },
      },
      {
        session,
        returnDocument: "after",
        runValidators: true,
      }
    );

  if (!expiredPurchase) {
    throw new Error(
      `Cannot expire purchase for reservation ${reservation._id}`
    );
  }
}

          // ==================================
          // RELEASE THE RESERVED PLOT
          // ==================================

          const plot =
            await Plot.findOneAndUpdate(
              {
                _id: reservation.plotId,
                projectId: reservation.projectId,
                status: "RESERVED",
              },
              {
                $set: {
                  status: "AVAILABLE",
                },
              },
              {
                session,
                returnDocument: "after",
                runValidators: true,
              }
            );

          // If the plot cannot be released,
          // abort the transaction.
          //
          // The reservation must not become
          // EXPIRED while its plot remains
          // RESERVED.

          if (!plot) {
            throw new Error(
              `Cannot release plot for reservation ${reservation._id}`
            );
          }

          return true;
        }
      );

      if (result) {
        expired += 1;
      } else {
        skipped += 1;
      }
    } finally {
      await session.endSession();
    }
  }

  // ========================================
  // RETURN PROCESSING SUMMARY
  // ========================================

  return {
    checked: candidates.length,
    expired,
    skipped,
  };
};

// ==========================================
// GET INVESTOR RESERVATION HISTORY
// ==========================================

export const getInvestorReservations = async ({
  investorId,
  page = 1,
  limit = 10,
}) => {
  // ========================================
  // VALIDATE INVESTOR
  // ========================================

  if (!mongoose.isValidObjectId(investorId)) {
    throw createError(
      401,
      "Authenticated investor is required"
    );
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
    throw createError(
      400,
      "Invalid pagination parameters"
    );
  }

  const skip = (page - 1) * limit;

  if (!Number.isSafeInteger(skip)) {
    throw createError(
      400,
      "Invalid pagination parameters"
    );
  }

  // ========================================
  // FETCH INVESTOR RESERVATIONS
  // ========================================

  // Security:
  // Only reservations belonging to the
  // authenticated investor are returned.

  const filter = {
    investorId,
  };

  const [reservations, total] = await Promise.all([
    Reservation.find(filter)
      .select(
        "companyId projectId plotId totalPrice " +
        "status expiresAt cancelledAt confirmedAt " +
        "createdAt updatedAt"
      )
      .populate({
        path: "projectId",
        select: "title location projectType",
      })
      .populate({
        path: "plotId",
        select: "plotNumber areaSqm status",
      })
      .populate({
        path: "companyId",
        select: "name",
      })
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Reservation.countDocuments(filter),
  ]);

  // ========================================
  // FORMAT RESPONSE
  // ========================================

  const data = reservations.map((reservation) => {
    const project = reservation.projectId;
    const plot = reservation.plotId;
    const company = reservation.companyId;

    return {
      id: String(reservation._id),

      project: project
        ? {
            id: String(project._id),
            title: project.title,
            location: project.location,
            projectType: project.projectType,
          }
        : null,

      plot: plot
        ? {
            id: String(plot._id),
            plotNumber: plot.plotNumber,
            areaSqm: plot.areaSqm,
            currentStatus: plot.status,
          }
        : null,

      company: company
        ? {
            id: String(company._id),
            name: company.name,
          }
        : null,

      // Authoritative booking price snapshot.
      totalPrice: reservation.totalPrice,

      status: reservation.status,

      expiresAt: reservation.expiresAt,

      cancelledAt: reservation.cancelledAt,

      confirmedAt: reservation.confirmedAt,

      createdAt: reservation.createdAt,

      updatedAt: reservation.updatedAt,
    };
  });

  // ========================================
  // PAGINATION
  // ========================================

  const totalPages = Math.ceil(total / limit);

  return {
    reservations: data,

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

// ==========================================
// GET INVESTOR RESERVATION DETAILS
// ==========================================

export const getInvestorReservationById = async ({
  investorId,
  reservationId,
}) => {
  // ========================================
  // VALIDATE IDENTIFIERS
  // ========================================

  if (!mongoose.isValidObjectId(investorId)) {
    throw createError(
      401,
      "Authenticated investor is required"
    );
  }

  if (!mongoose.isValidObjectId(reservationId)) {
    throw createError(
      400,
      "Invalid reservation ID"
    );
  }

  // ========================================
  // FETCH RESERVATION
  // ========================================

  // Security:
  // Both the reservation ID and investor ID
  // must match.
  //
  // Investors cannot access reservations
  // belonging to other investors.

  const reservation = await Reservation.findOne({
    _id: reservationId,
    investorId,
  })
    .select(
      "investorId companyId projectId plotId " +
      "totalPrice status expiresAt cancelledAt " +
      "confirmedAt createdAt updatedAt"
    )
    .populate({
      path: "projectId",
      select: "title location projectType",
    })
    .populate({
      path: "plotId",
      select: "plotNumber areaSqm status",
    })
    .populate({
      path: "companyId",
      select: "name",
    })
    .lean();

  // ========================================
  // RESERVATION NOT FOUND
  // ========================================

  if (!reservation) {
    throw createError(
      404,
      "Reservation not found"
    );
  }

  // ========================================
  // EXTRACT RELATED INFORMATION
  // ========================================

  const project = reservation.projectId;
  const plot = reservation.plotId;
  const company = reservation.companyId;

  // ========================================
  // FORMAT RESPONSE
  // ========================================

  return {
    id: String(reservation._id),

    investorId: String(reservation.investorId),

    // ======================================
    // PROJECT INFORMATION
    // ======================================

    project: project
      ? {
          id: String(project._id),
          title: project.title,
          location: project.location,
          projectType: project.projectType,
        }
      : null,

    // ======================================
    // PLOT INFORMATION
    // ======================================

    plot: plot
      ? {
          id: String(plot._id),
          plotNumber: plot.plotNumber,
          areaSqm: plot.areaSqm,
          currentStatus: plot.status,
        }
      : null,

    // ======================================
    // COMPANY INFORMATION
    // ======================================

    company: company
      ? {
          id: String(company._id),
          name: company.name,
        }
      : null,

    // ======================================
    // RESERVATION INFORMATION
    // ======================================

    totalPrice: reservation.totalPrice,

    status: reservation.status,

    expiresAt: reservation.expiresAt,

    cancelledAt: reservation.cancelledAt,

    confirmedAt: reservation.confirmedAt,

    createdAt: reservation.createdAt,

    updatedAt: reservation.updatedAt,
  };
};

// ==========================================
// GET COMPANY RESERVATIONS
// ==========================================

export const getCompanyReservations = async ({
  companyId,
  page = 1,
  limit = 10,
  status = null,
  projectId = null,
}) => {
  // ========================================
  // VALIDATE COMPANY IDENTIFIER
  // ========================================

  if (!mongoose.isValidObjectId(companyId)) {
    throw createError(
      400,
      "Invalid company ID"
    );
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
    throw createError(
      400,
      "Invalid pagination parameters"
    );
  }

  const skip = (page - 1) * limit;

  if (!Number.isSafeInteger(skip)) {
    throw createError(
      400,
      "Invalid pagination parameters"
    );
  }

  // ========================================
  // VALIDATE STATUS FILTER
  // ========================================

  const allowedStatuses = [
    "PENDING",
    "CONFIRMED",
    "CANCELLED",
    "EXPIRED",
  ];

  if (
    status !== null &&
    !allowedStatuses.includes(status)
  ) {
    throw createError(
      400,
      "Invalid reservation status"
    );
  }

  // ========================================
  // VALIDATE PROJECT FILTER
  // ========================================

  if (
    projectId !== null &&
    !mongoose.isValidObjectId(projectId)
  ) {
    throw createError(
      400,
      "Invalid project ID"
    );
  }

  // ========================================
  // BUILD COMPANY-SCOPED QUERY
  // ========================================

  // SECURITY:
  //
  // Company ID must come from the verified
  // company context in the controller.
  //
  // The companyId filter ensures that
  // reservations belonging to another
  // company are never returned.

  const filter = {
    companyId,
  };

  if (status !== null) {
    filter.status = status;
  }

  if (projectId !== null) {
    filter.projectId = projectId;
  }

  // ========================================
  // FETCH RESERVATIONS
  // ========================================

  const [reservations, total] =
    await Promise.all([
      Reservation.find(filter)
        .select(
          "investorId companyId projectId plotId " +
          "totalPrice status expiresAt " +
          "cancelledAt confirmedAt " +
          "createdAt updatedAt"
        )
        .populate({
          path: "investorId",
          select: "name email phone",
        })
        .populate({
          path: "projectId",
          select: "title location projectType",
        })
        .populate({
          path: "plotId",
          select: "plotNumber areaSqm status",
        })
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Reservation.countDocuments(filter),
    ]);

  // ========================================
  // FORMAT RESERVATION RECORDS
  // ========================================

  const data = reservations.map(
    (reservation) => {
      const investor = reservation.investorId;
      const project = reservation.projectId;
      const plot = reservation.plotId;

      return {
        id: String(reservation._id),

        // ==================================
        // INVESTOR
        // ==================================

        investor: investor
          ? {
              id: String(investor._id),
              name: investor.name ?? null,
              email: investor.email ?? null,
              phone: investor.phone ?? null,
            }
          : null,

        // ==================================
        // PROJECT
        // ==================================

        project: project
          ? {
              id: String(project._id),
              title: project.title,
              location: project.location,
              projectType: project.projectType,
            }
          : null,

        // ==================================
        // PLOT
        // ==================================

        plot: plot
          ? {
              id: String(plot._id),
              plotNumber: plot.plotNumber,
              areaSqm: plot.areaSqm,
              currentStatus: plot.status,
            }
          : null,

        // ==================================
        // RESERVATION
        // ==================================

        totalPrice: reservation.totalPrice,

        status: reservation.status,

        expiresAt: reservation.expiresAt,

        cancelledAt: reservation.cancelledAt,

        confirmedAt: reservation.confirmedAt,

        createdAt: reservation.createdAt,

        updatedAt: reservation.updatedAt,
      };
    }
  );

  // ========================================
  // PAGINATION
  // ========================================

  const totalPages = Math.ceil(total / limit);

  return {
    reservations: data,

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

// ==========================================
// CONFIRM PLOT RESERVATION
// ==========================================

export const confirmPlotReservation = async ({
  companyId,
  reservationId,
  confirmedBy,
}) => {
  // ========================================
  // VALIDATE IDENTIFIERS
  // ========================================

  if (
    !mongoose.isValidObjectId(companyId) ||
    !mongoose.isValidObjectId(reservationId)
  ) {
    throw createError(
      400,
      "Invalid company or reservation ID"
    );
  }

  if (!mongoose.isValidObjectId(confirmedBy)) {
    throw createError(
      401,
      "Authenticated company staff is required"
    );
  }

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(
      async () => {
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
          throw createError(
            403,
            "Company is not approved for operations"
          );
        }

        // ==================================
        // VERIFY COMPANY STAFF PERMISSION
        // ==================================

        const membership =
          await CompanyMembership.findOne({
            companyId: company._id,
            userId: confirmedBy,
            status: "ACTIVE",
            role: {
              $in: ["COMPANY_ADMIN", "MANAGER"],
            },
          })
            .select("_id role")
            .session(session)
            .lean();

        if (!membership) {
          throw createError(
            403,
            "You do not have permission to confirm reservations"
          );
        }

        // ==================================
        // FIND COMPANY RESERVATION
        // ==================================

        const reservation = await Reservation.findOne({
          _id: reservationId,
          companyId: company._id,
        })
          .session(session)
          .lean();

        if (!reservation) {
          throw createError(
            404,
            "Reservation not found"
          );
        }

        // ==================================
        // VALIDATE RESERVATION STATUS
        // ==================================

        if (reservation.status !== "PENDING") {
          throw createError(
            409,
            "Only pending reservations can be confirmed"
          );
        }

        // ==================================
        // CHECK EXPIRATION
        // ==================================

        if (reservation.expiresAt <= new Date()) {
          throw createError(
            409,
            "Reservation has expired and cannot be confirmed"
          );
        }

        // ==========================================
// PROTECT RESERVATIONS LINKED TO PURCHASES
// ==========================================

const activePurchase = await Purchase.findOne({
  reservationId: reservation._id,
  status: {
    $in: [
      "PENDING_PAYMENT",
      "IN_PROGRESS",
      "COMPLETED",
    ],
  },
})
  .select("_id status")
  .session(session)
  .lean();

if (activePurchase) {
  throw createError(
    409,
    "This reservation is linked to an active purchase. Complete the purchase payment workflow instead."
  );
}

        // ==================================
        // VERIFY RESERVED PLOT
        // ==================================

        const plot = await Plot.findOne({
          _id: reservation.plotId,
          projectId: reservation.projectId,
          status: "RESERVED",
        })
          .select("_id plotNumber status")
          .session(session)
          .lean();

        if (!plot) {
          throw createError(
            409,
            "Plot is not available for confirmation"
          );
        }

        // ==================================
        // CONFIRM RESERVATION ATOMICALLY
        // ==================================

        const confirmedAt = new Date();

        const confirmedReservation =
          await Reservation.findOneAndUpdate(
            {
              _id: reservation._id,
              companyId: company._id,
              status: "PENDING",

              // Recheck the deadline at update time.
              expiresAt: {
                $gt: confirmedAt,
              },
            },
            {
              $set: {
                status: "CONFIRMED",
                confirmedAt,
                confirmedBy,
              },
            },
            {
              session,
              returnDocument: "after",
              runValidators: true,
            }
          );

        if (!confirmedReservation) {
          throw createError(
            409,
            "Reservation is no longer eligible for confirmation"
          );
        }

        // ==================================
        // RETURN CONFIRMATION DETAILS
        // ==================================

        return {
          id: String(confirmedReservation._id),

          companyId: String(
            confirmedReservation.companyId
          ),

          investorId: String(
            confirmedReservation.investorId
          ),

          projectId: String(
            confirmedReservation.projectId
          ),

          plotId: String(
            confirmedReservation.plotId
          ),

          plotNumber: plot.plotNumber,

          totalPrice:
            confirmedReservation.totalPrice,

          status: confirmedReservation.status,

          plotStatus: plot.status,

          confirmedAt:
            confirmedReservation.confirmedAt,

          confirmedBy: String(
            confirmedReservation.confirmedBy
          ),

          expiresAt:
            confirmedReservation.expiresAt,
        };
      }
    );

    return result;

  } catch (error) {
    // ======================================
    // HANDLE TRANSACTION CONFLICTS
    // ======================================

    if (
      error.code === 112 ||
      error.hasErrorLabel?.(
        "TransientTransactionError"
      )
    ) {
      throw createError(
        409,
        "Another reservation operation is in progress. Please retry."
      );
    }

    throw error;

  } finally {
    await session.endSession();
  }
};