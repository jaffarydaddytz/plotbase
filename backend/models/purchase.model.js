import mongoose from "mongoose";

// ==========================================
// PURCHASE MODEL
// ==========================================

const purchaseSchema = new mongoose.Schema(
  {
    // ======================================
    // INVESTOR
    // ======================================

    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ======================================
    // COMPANY
    // ======================================

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // ======================================
    // PROJECT
    // ======================================

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    // ======================================
    // PLOT
    // ======================================

    plotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plot",
      required: true,
    },

    // ======================================
    // RESERVATION
    // ======================================

    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
      unique: true,
    },

    // ======================================
    // PAYMENT METHOD
    // ======================================

    paymentMethod: {
      type: String,
      enum: ["FULL", "INSTALLMENTS"],
      required: true,
      immutable: true,
    },

    // ======================================
    // INSTALLMENT DURATION
    // ======================================

    installmentMonths: {
      type: Number,
      enum: [3, 6, 12],
      default: null,
      immutable: true,
    },

    // ======================================
    // AGREED PURCHASE PRICE
    // ======================================

    // Authoritative price snapshot.
    // Must not come directly from frontend.

    totalPrice: {
      type: Number,
      required: true,
      min: 1,
      immutable: true,
    },

    // ======================================
    // PURCHASE STATUS
    // ======================================

    status: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "EXPIRED",
      ],
      default: "PENDING_PAYMENT",
      required: true,
    },

    // ======================================
    // INITIAL PAYMENT DEADLINE
    // ======================================

    paymentDueAt: {
      type: Date,
      required: true,
    },

    // ======================================
    // PURCHASE LIFECYCLE
    // ======================================

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    expiredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// PAYMENT METHOD VALIDATION
// ==========================================

purchaseSchema.path("installmentMonths").validate(
  function (months) {
    if (this.paymentMethod === "FULL") {
      return months == null;
    }

    if (this.paymentMethod === "INSTALLMENTS") {
      return [3, 6, 12].includes(months);
    }

    return false;
  },
  "Invalid payment method or installment duration"
);

// ==========================================
// PREVENT DUPLICATE ACTIVE PURCHASES
// ==========================================

purchaseSchema.index(
  {
    plotId: 1,
  },
  {
    name: "unique_active_plot_purchase",
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          "PENDING_PAYMENT",
          "IN_PROGRESS",
          "COMPLETED",
        ],
      },
    },
  }
);

// ==========================================
// INVESTOR PURCHASE HISTORY
// ==========================================

purchaseSchema.index({
  investorId: 1,
  createdAt: -1,
});

// ==========================================
// COMPANY PURCHASE HISTORY
// ==========================================

purchaseSchema.index({
  companyId: 1,
  createdAt: -1,
});

// ==========================================
// PURCHASE EXPIRATION LOOKUP
// ==========================================

purchaseSchema.index({
  status: 1,
  paymentDueAt: 1,
});

// ==========================================
// EXPORT PURCHASE MODEL
// ==========================================

const Purchase = mongoose.model(
  "Purchase",
  purchaseSchema
);

export default Purchase;