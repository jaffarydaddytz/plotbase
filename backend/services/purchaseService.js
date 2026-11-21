import mongoose from "mongoose";

import Project from "../models/project.models.js";
import Plot from "../models/plot.model.js";
import Company from "../models/company.model.js";
import Reservation from "../models/reservation.model.js";
import Purchase from "../models/purchase.model.js";
import Payment from "../models/payment.model.js";

// ==========================================
// CONFIGURATION
// ==========================================

const PURCHASE_RESERVATION_HOURS = 24;

const ALLOWED_INSTALLMENT_MONTHS = [3, 6, 12];

// ==========================================
// ERROR HELPER
// ==========================================

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ==========================================
// GENERATE INSTALLMENT PAYMENT SCHEDULE
// ==========================================

const generateInstallmentSchedule = ({
  paymentMethod,
  installmentMonths,
  totalPrice,
  firstDueAt,
}) => {
  // ========================================
  // VALIDATE PURCHASE PRICE
  // ========================================

  if (
    !Number.isSafeInteger(totalPrice) ||
    totalPrice <= 0
  ) {
    throw createError(
      409,
      "Purchase price must be a positive whole number"
    );
  }

  // ========================================
  // FULL PAYMENT
  // ========================================

  // Full payment does not require
  // an installment schedule.

  if (paymentMethod === "FULL") {
    return [];
  }

  // ========================================
  // VALIDATE INSTALLMENT PLAN
  // ========================================

  if (
    paymentMethod !== "INSTALLMENTS" ||
    ![3, 6, 12].includes(installmentMonths)
  ) {
    throw createError(
      400,
      "Invalid installment payment plan"
    );
  }

  // Every installment must have a
  // positive whole-number TZS amount.

  if (totalPrice < installmentMonths) {
    throw createError(
      409,
      "Purchase amount is too small for the selected installment plan"
    );
  }

  // ========================================
  // VALIDATE FIRST PAYMENT DEADLINE
  // ========================================

  const firstDeadline = new Date(firstDueAt);

  if (Number.isNaN(firstDeadline.getTime())) {
    throw createError(
      409,
      "Invalid initial payment deadline"
    );
  }

  // ========================================
  // CALCULATE INSTALLMENT AMOUNTS
  // ========================================

  const baseAmount = Math.floor(
    totalPrice / installmentMonths
  );

  const remainder =
    totalPrice % installmentMonths;

  // ========================================
  // PRESERVE CALENDAR MONTH ALIGNMENT
  // ========================================

  const startYear =
    firstDeadline.getUTCFullYear();

  const startMonth =
    firstDeadline.getUTCMonth();

  const startDay =
    firstDeadline.getUTCDate();

  const hours =
    firstDeadline.getUTCHours();

  const minutes =
    firstDeadline.getUTCMinutes();

  const seconds =
    firstDeadline.getUTCSeconds();

  const milliseconds =
    firstDeadline.getUTCMilliseconds();

  // ========================================
  // GENERATE SCHEDULE
  // ========================================

  const schedule = [];

  for (
    let index = 0;
    index < installmentMonths;
    index++
  ) {
    // ======================================
    // CALCULATE AMOUNT
    // ======================================

    // Distribute any remainder across
    // the earliest installments.

    // Example:
    // TZS 1,000,000 / 3 months:
    //
    // Month 1: 333,334
    // Month 2: 333,333
    // Month 3: 333,333

    const amountDue =
      baseAmount + (index < remainder ? 1 : 0);

    // ======================================
    // CALCULATE DUE DATE
    // ======================================

    // Anchor each installment to the
    // original deadline's calendar day.
    //
    // Clamp to the last day of shorter
    // months (e.g. January 31 -> February 28).

    const lastDayOfTargetMonth =
      new Date(
        Date.UTC(
          startYear,
          startMonth + index + 1,
          0
        )
      ).getUTCDate();

    const targetDay = Math.min(
      startDay,
      lastDayOfTargetMonth
    );

    const dueAt = new Date(
      Date.UTC(
        startYear,
        startMonth + index,
        targetDay,
        hours,
        minutes,
        seconds,
        milliseconds
      )
    );

    // ======================================
    // ADD INSTALLMENT
    // ======================================

    schedule.push({
      number: index + 1,
      amountDue,
      dueAt,
    });
  }

  return schedule;
};

// ==========================================
// VALIDATE PAYMENT SELECTION
// ==========================================

const validatePaymentSelection = ({
  paymentMethod,
  installmentMonths,
  paymentTerms,
}) => {
  const fullPaymentEnabled =
    paymentTerms?.fullPaymentEnabled ?? true;

  const availableInstallments = Array.isArray(
    paymentTerms?.installmentDurationsMonths
  )
    ? paymentTerms.installmentDurationsMonths
    : [];

  // ========================================
  // FULL PAYMENT
  // ========================================

  if (paymentMethod === "FULL") {
    if (!fullPaymentEnabled) {
      throw createError(
        400,
        "Full payment is not available for this project"
      );
    }

    if (installmentMonths != null) {
      throw createError(
        400,
        "Installment duration must not be provided for full payment"
      );
    }

    return {
      paymentMethod: "FULL",
      installmentMonths: null,
    };
  }

  // ========================================
  // INSTALLMENT PAYMENTS
  // ========================================

  if (paymentMethod === "INSTALLMENTS") {
    if (
      !Number.isInteger(installmentMonths) ||
      !ALLOWED_INSTALLMENT_MONTHS.includes(
        installmentMonths
      )
    ) {
      throw createError(
        400,
        "Select a valid installment duration"
      );
    }

    if (
      !availableInstallments.includes(
        installmentMonths
      )
    ) {
      throw createError(
        400,
        "Selected installment duration is not available for this project"
      );
    }

    return {
      paymentMethod: "INSTALLMENTS",
      installmentMonths,
    };
  }

  throw createError(
    400,
    "Invalid payment method"
  );
};

// ==========================================
// START PLOT PURCHASE
// ==========================================

export const startPlotPurchase = async ({
  investorId,
  projectId,
  plotId,
  paymentMethod,
  installmentMonths = null,
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
  // START TRANSACTION
  // ========================================

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(
      async () => {
        const now = new Date();

        // ==================================
        // VERIFY PROJECT
        // ==================================

        const project = await Project.findOne({
          _id: projectId,

          status: "ACTIVE",

          companyId: {
            $type: "objectId",
          },

          projectType: {
            $in: ["VIWANJA", "MASHAMBA"],
          },
        })
          .select(
            "_id companyId status projectType paymentTerms"
          )
          .session(session)
          .lean();

        if (!project) {
          throw createError(
            404,
            "Project is unavailable for purchasing"
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
            "Project is unavailable for purchasing"
          );
        }

        // ==================================
        // VALIDATE COMPANY PAYMENT TERMS
        // ==================================

        const selectedPayment = validatePaymentSelection({
          paymentMethod,
          installmentMonths,
          paymentTerms: project.paymentTerms,
        });

        // ==================================
        // FIND THE PLOT
        // ==================================

        const existingPlot = await Plot.findOne({
          _id: plotId,
          projectId: project._id,
        })
          .select(
            "_id plotNumber areaSqm totalPrice status"
          )
          .session(session)
          .lean();

        if (!existingPlot) {
          throw createError(
            404,
            "Plot not found"
          );
        }

        if (
          !Number.isFinite(existingPlot.totalPrice) ||
          existingPlot.totalPrice <= 0
        ) {
          throw createError(
            409,
            "This plot does not have a valid purchase price"
          );
        }

        // ==================================
        // CHECK FOR EXISTING PURCHASE
        // ==================================

        const existingPurchase =
          await Purchase.findOne({
            plotId: existingPlot._id,
            status: {
              $in: [
                "PENDING_PAYMENT",
                "IN_PROGRESS",
                "COMPLETED",
              ],
            },
          })
            .select("_id")
            .session(session)
            .lean();

        if (existingPurchase) {
          throw createError(
            409,
            "This plot already has an active purchase"
          );
        }

        let reservation;
        let purchasePrice;
        let reservedPlot;

        // ==================================
        // SCENARIO 1: DIRECT BUY
        // ==================================

        if (existingPlot.status === "AVAILABLE") {
          // Atomically reserve the available plot.

          reservedPlot =
            await Plot.findOneAndUpdate(
              {
                _id: existingPlot._id,
                projectId: project._id,
                status: "AVAILABLE",

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

          if (!reservedPlot) {
            throw createError(
              409,
              "This plot is no longer available for purchasing"
            );
          }

          // ==================================
          // CALCULATE DEADLINE
          // ==================================

          const expiresAt = new Date(
            now.getTime() +
              PURCHASE_RESERVATION_HOURS *
                60 *
                60 *
                1000
          );

          // ==================================
          // CREATE RESERVATION
          // ==================================

          const [createdReservation] =
            await Reservation.create(
              [
                {
                  investorId,
                  companyId: company._id,
                  projectId: project._id,
                  plotId: reservedPlot._id,

                  totalPrice:
                    reservedPlot.totalPrice,

                  status: "PENDING",

                  expiresAt,
                },
              ],
              {
                session,
              }
            );

          reservation = createdReservation;

          purchasePrice =
            createdReservation.totalPrice;
        }

        // ==================================
        // SCENARIO 2: EXISTING RESERVATION
        // ==================================

        else if (
          existingPlot.status === "RESERVED"
        ) {
          // Only the investor who owns an
          // eligible reservation may buy it.
          //
          // Incrementing the reservation
          // version makes this a write inside
          // the transaction, allowing MongoDB
          // to detect concurrent cancellation
          // or expiration operations.

          reservation =
            await Reservation.findOneAndUpdate(
              {
                plotId: existingPlot._id,
                projectId: project._id,
                companyId: company._id,
                investorId,

                status: "PENDING",

                expiresAt: {
                  $gt: now,
                },
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
              }
            );

          if (!reservation) {
            throw createError(
              409,
              "This plot does not have an eligible reservation belonging to you"
            );
          }

          // Verify the plot remains RESERVED
          // inside the same transaction.
          //
          // This also creates a plot write,
          // protecting against concurrent
          // inventory changes.

          reservedPlot =
            await Plot.findOneAndUpdate(
              {
                _id: existingPlot._id,
                projectId: project._id,
                status: "RESERVED",
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
              }
            );

          if (!reservedPlot) {
            throw createError(
              409,
              "Plot reservation is no longer valid"
            );
          }

          // Use the original booking price.
          //
          // Company pricing may have changed
          // since the investor booked.

          purchasePrice =
            reservation.totalPrice;

          if (
            !Number.isFinite(purchasePrice) ||
            purchasePrice <= 0
          ) {
            throw createError(
              409,
              "Reservation does not have a valid purchase price"
            );
          }
        }

        // ==================================
        // PLOT NOT ELIGIBLE
        // ==================================

        else {
          throw createError(
            409,
            "This plot is not available for purchasing"
          );
        }

        // ==========================================
// GENERATE PAYMENT SCHEDULE
// ==========================================

const installmentSchedule =
  generateInstallmentSchedule({
    paymentMethod:
      selectedPayment.paymentMethod,

    installmentMonths:
      selectedPayment.installmentMonths,

    totalPrice:
      purchasePrice,

    firstDueAt:
      reservation.expiresAt,
  });

        // ==================================
        // CREATE PURCHASE
        // ==================================

        const [purchase] = await Purchase.create(
          [
            {
              investorId,

              companyId: company._id,

              projectId: project._id,

              plotId: reservedPlot._id,

              reservationId: reservation._id,

paymentMethod:
  selectedPayment.paymentMethod,

installmentMonths:
  selectedPayment.installmentMonths,

// Generated payment schedule.
installmentSchedule,

// Authoritative price snapshot.
totalPrice: purchasePrice,

              status: "PENDING_PAYMENT",

              // Payment deadline follows
              // the reservation deadline.
              paymentDueAt:
                reservation.expiresAt,
            },
          ],
          {
            session,
          }
        );

        // ==================================
        // RESPONSE
        // ==================================

        return {
          id: String(purchase._id),

          investorId: String(
            purchase.investorId
          ),

          companyId: String(
            purchase.companyId
          ),

          projectId: String(
            purchase.projectId
          ),

          plotId: String(
            purchase.plotId
          ),

          plotNumber:
            reservedPlot.plotNumber,

          areaSqm:
            reservedPlot.areaSqm,

          reservationId: String(
            purchase.reservationId
          ),

          paymentMethod:
            purchase.paymentMethod,

installmentMonths:
  purchase.installmentMonths,

installmentSchedule:
  purchase.installmentSchedule.map(
    (installment) => ({
      number: installment.number,
      amountDue: installment.amountDue,
      dueAt: installment.dueAt,
    })
  ),

totalPrice:
  purchase.totalPrice,

          status:
            purchase.status,

          plotStatus:
            reservedPlot.status,

          paymentDueAt:
            purchase.paymentDueAt,

          createdAt:
            purchase.createdAt,
        };
      }
    );

    return result;
  } catch (error) {
    // ======================================
    // DUPLICATE PURCHASE / RESERVATION
    // ======================================

    if (error.code === 11000) {
      throw createError(
        409,
        "This plot already has an active purchase or reservation"
      );
    }

    // ======================================
    // TRANSACTION CONFLICT
    // ======================================

    if (
      error.code === 112 ||
      error.hasErrorLabel?.(
        "TransientTransactionError"
      )
    ) {
      throw createError(
        409,
        "Another purchase operation is in progress. Please retry."
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

// ==========================================
// GET INVESTOR PURCHASE HISTORY
// ==========================================

export const getInvestorPurchases = async ({
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
  // INVESTOR OWNERSHIP FILTER
  // ========================================

  // Investors can retrieve only their
  // own purchase records.

  const filter = {
    investorId,
  };

  // ========================================
  // FETCH PURCHASES
  // ========================================

  const [purchases, total] = await Promise.all([
    Purchase.find(filter)
      .select(
        "companyId projectId plotId reservationId " +
        "paymentMethod installmentMonths " +
        "totalPrice status paymentDueAt " +
        "startedAt completedAt createdAt updatedAt"
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

    Purchase.countDocuments(filter),
  ]);

  // ========================================
  // CALCULATE VERIFIED PAYMENT TOTALS
  // ========================================

  const purchaseIds = purchases.map(
    (purchase) => purchase._id
  );

  let paymentTotals = [];

  if (purchaseIds.length > 0) {
    paymentTotals = await Payment.aggregate([
      {
        $match: {
          purchaseId: {
            $in: purchaseIds,
          },
          status: "VERIFIED",
        },
      },
      {
        $group: {
          _id: "$purchaseId",
          totalVerified: {
            $sum: "$amount",
          },
        },
      },
    ]);
  }

  // ========================================
  // MAP PAYMENT TOTALS
  // ========================================

  const verifiedAmountByPurchase = new Map(
    paymentTotals.map((item) => [
      String(item._id),
      item.totalVerified,
    ])
  );

  // ========================================
  // FORMAT PURCHASE HISTORY
  // ========================================

  const data = purchases.map((purchase) => {
    const project = purchase.projectId;
    const plot = purchase.plotId;
    const company = purchase.companyId;

    const totalVerified =
      verifiedAmountByPurchase.get(
        String(purchase._id)
      ) ?? 0;

    const remainingBalance = Math.max(
      0,
      purchase.totalPrice - totalVerified
    );

    return {
      id: String(purchase._id),

      // ====================================
      // PROJECT
      // ====================================

      project: project
        ? {
            id: String(project._id),
            title: project.title,
            location: project.location,
            projectType: project.projectType,
          }
        : null,

      // ====================================
      // PLOT
      // ====================================

      plot: plot
        ? {
            id: String(plot._id),
            plotNumber: plot.plotNumber,
            areaSqm: plot.areaSqm,
            currentStatus: plot.status,
          }
        : null,

      // ====================================
      // COMPANY
      // ====================================

      company: company
        ? {
            id: String(company._id),
            name: company.name,
          }
        : null,

      // ====================================
      // PURCHASE INFORMATION
      // ====================================

      reservationId: String(
        purchase.reservationId
      ),

      paymentMethod: purchase.paymentMethod,

      installmentMonths: purchase.installmentMonths,

      totalPrice: purchase.totalPrice,

      totalVerified,

      remainingBalance,

      currency: "TZS",

      status: purchase.status,

      paymentDueAt: purchase.paymentDueAt,

      startedAt: purchase.startedAt,

      completedAt: purchase.completedAt,

      createdAt: purchase.createdAt,

      updatedAt: purchase.updatedAt,
    };
  });

  // ========================================
  // PAGINATION
  // ========================================

  const totalPages = Math.ceil(total / limit);

  return {
    purchases: data,

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
// GET INVESTOR PURCHASE DETAILS
// ==========================================

export const getInvestorPurchaseById = async ({
  investorId,
  purchaseId,
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

  if (!mongoose.isValidObjectId(purchaseId)) {
    throw createError(
      400,
      "Invalid purchase ID"
    );
  }

  // ========================================
  // FETCH INVESTOR PURCHASE
  // ========================================

  // SECURITY:
  // The purchase must belong to the
  // authenticated investor.

  const purchase = await Purchase.findOne({
    _id: purchaseId,
    investorId,
  })
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

  if (!purchase) {
    throw createError(
      404,
      "Purchase not found"
    );
  }

  // ========================================
  // FETCH PURCHASE PAYMENT HISTORY
  // ========================================

  const payments = await Payment.find({
    purchaseId: purchase._id,
    investorId,
  })
    .select(
      "amount currency channel referenceNumber " +
      "status submittedAt reviewDueAt verifiedAt " +
      "rejectionReason createdAt updatedAt"
    )
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .lean();

  // ========================================
  // CALCULATE VERIFIED PAYMENTS
  // ========================================

  const totalVerified = payments
    .filter(
      (payment) => payment.status === "VERIFIED"
    )
    .reduce(
      (total, payment) => total + payment.amount,
      0
    );

  if (
    !Number.isSafeInteger(purchase.totalPrice) ||
    purchase.totalPrice <= 0 ||
    !Number.isSafeInteger(totalVerified) ||
    totalVerified < 0 ||
    totalVerified > purchase.totalPrice
  ) {
    throw createError(
      409,
      "Purchase payment totals are invalid"
    );
  }

  const remainingBalance =
    purchase.totalPrice - totalVerified;

  // ========================================
  // CALCULATE INSTALLMENT PROGRESS
  // ========================================

  const now = new Date();

  let installmentProgress = [];

  if (purchase.paymentMethod === "INSTALLMENTS") {
    const schedule = purchase.installmentSchedule;

    if (
      ![3, 6, 12].includes(purchase.installmentMonths) ||
      !Array.isArray(schedule) ||
      schedule.length !== purchase.installmentMonths
    ) {
      throw createError(
        409,
        "Purchase installment schedule is invalid"
      );
    }

    let remainingVerified = totalVerified;
    let totalScheduled = 0;
    let previousDueAt = null;

    installmentProgress = schedule.map(
      (installment, index) => {
        const dueAt = new Date(installment.dueAt);

        if (
          installment.number !== index + 1 ||
          !Number.isSafeInteger(installment.amountDue) ||
          installment.amountDue <= 0 ||
          Number.isNaN(dueAt.getTime()) ||
          (previousDueAt && dueAt <= previousDueAt)
        ) {
          throw createError(
            409,
            "Invalid installment schedule entry"
          );
        }

        previousDueAt = dueAt;
        totalScheduled += installment.amountDue;

        // Apply verified payments to the
        // oldest unpaid installment first.

        const amountPaid = Math.min(
          installment.amountDue,
          remainingVerified
        );

        remainingVerified -= amountPaid;

        const remainingAmount =
          installment.amountDue - amountPaid;

        const isOverdue =
          remainingAmount > 0 && dueAt < now;

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
          status,
          isOverdue,
        };
      }
    );

    if (totalScheduled !== purchase.totalPrice) {
      throw createError(
        409,
        "Installment amounts do not match the purchase price"
      );
    }
  }

  // ========================================
  // FORMAT PAYMENT HISTORY
  // ========================================

  const paymentHistory = payments.map(
    (payment) => ({
      id: String(payment._id),

      amount: payment.amount,
      currency: payment.currency,
      channel: payment.channel,

      referenceNumber: payment.referenceNumber,

      status: payment.status,

      submittedAt: payment.submittedAt,
      reviewDueAt: payment.reviewDueAt,
      verifiedAt: payment.verifiedAt,

      rejectionReason: payment.rejectionReason,

      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    })
  );

  // ========================================
  // EXTRACT RELATED RECORDS
  // ========================================

  const project = purchase.projectId;
  const plot = purchase.plotId;
  const company = purchase.companyId;

  // ========================================
  // RETURN PURCHASE DETAILS
  // ========================================

  return {
    id: String(purchase._id),

    // ======================================
    // PROJECT
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
    // PLOT
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
    // COMPANY
    // ======================================

    company: company
      ? {
          id: String(company._id),
          name: company.name,
        }
      : null,

    // ======================================
    // PURCHASE
    // ======================================

    reservationId: String(purchase.reservationId),

    paymentMethod: purchase.paymentMethod,

    installmentMonths: purchase.installmentMonths,

    status: purchase.status,

    // ======================================
    // FINANCIAL SUMMARY
    // ======================================

    currency: "TZS",

    totalPrice: purchase.totalPrice,

    totalVerified,

    remainingBalance,

    // ======================================
    // INSTALLMENTS
    // ======================================

    installmentProgress,

    // ======================================
    // PAYMENT HISTORY
    // ======================================

    payments: paymentHistory,

    // ======================================
    // IMPORTANT DATES
    // ======================================

    paymentDueAt: purchase.paymentDueAt,

    startedAt: purchase.startedAt,

    completedAt: purchase.completedAt,

    cancelledAt: purchase.cancelledAt,

    expiredAt: purchase.expiredAt,

    createdAt: purchase.createdAt,

    updatedAt: purchase.updatedAt,
  };
};