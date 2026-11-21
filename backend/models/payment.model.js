import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
      index: true,
    },

    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "Payment amount must be a whole number",
      },
    },

    currency: {
      type: String,
      enum: ["TZS"],
      default: "TZS",
      required: true,
    },

    channel: {
      type: String,
      enum: [
        "BANK_TRANSFER",
        "MOBILE_MONEY",
        "CASH",
        "CLICKPESA",
      ],
      required: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: null,
    },

    providerTransactionId: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "SUBMITTED",
        "VERIFIED",
        "REJECTED",
        "FAILED",
      ],
      default: "PENDING",
      required: true,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    // ======================================
// PAYMENT REVIEW DEADLINE
// ======================================

// Internal company review target.
//
// Missing this deadline must NOT
// automatically reject a payment or
// release a reserved plot.

reviewDueAt: {
  type: Date,
  default: null,
},

    verifiedAt: {
      type: Date,
      default: null,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// PURCHASE PAYMENT HISTORY
// ==========================================

paymentSchema.index({
  purchaseId: 1,
  createdAt: -1,
});

// ==========================================
// COMPANY PAYMENT HISTORY
// ==========================================

paymentSchema.index({
  companyId: 1,
  createdAt: -1,
});

// ==========================================
// PREVENT DUPLICATE PROVIDER TRANSACTIONS
// ==========================================

paymentSchema.index(
  {
    channel: 1,
    providerTransactionId: 1,
  },
  {
    name: "unique_provider_transaction",
    unique: true,
    partialFilterExpression: {
      providerTransactionId: {
        $type: "string",
      },
    },
  }
);

// ==========================================
// COMPANY PAYMENT REVIEW QUEUE
// ==========================================

// Supports finding submitted payments
// that are approaching or past their
// review deadline.

paymentSchema.index({
  companyId: 1,
  status: 1,
  reviewDueAt: 1,
});

// ==========================================
// PREVENT DUPLICATE PAYMENT REFERENCES
// ==========================================

// A transaction reference cannot be reused
// for the same company and payment channel.
//
// This protects against concurrent payment
// submissions using the same reference.

paymentSchema.index(
  {
    companyId: 1,
    channel: 1,
    referenceNumber: 1,
  },
  {
    name: "unique_company_payment_reference",
    unique: true,
    partialFilterExpression: {
      referenceNumber: {
        $type: "string",
      },
    },
  }
);

const Payment = mongoose.model(
  "Payment",
  paymentSchema
);

export default Payment;