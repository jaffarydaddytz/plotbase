import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    // ==========================================
    // LEGACY PROJECT OWNERSHIP
    // ==========================================

    // Retained temporarily for backward compatibility.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return !this.companyId;
      },
      index: true,
    },

    // ==========================================
    // COMPANY OWNERSHIP
    // ==========================================

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: undefined,
      index: true,
    },

    // Authenticated user who created the project.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return Boolean(this.companyId);
      },
    },

    // ==========================================
    // PROJECT INFORMATION
    // ==========================================

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    // ==========================================
    // PROJECT TYPE
    // ==========================================

    // VIWANJA: Residential, commercial and other plots.
    // MASHAMBA: Agricultural and farming projects.
    //
    // No default is assigned because existing projects
    // must be classified explicitly.
    //
    // The create controller and publication service
    // will enforce this field in subsequent steps.

    projectType: {
      type: String,
      enum: ["VIWANJA", "MASHAMBA"],
      uppercase: true,
      trim: true,
      default: undefined,
      index: true,
    },

    // ==========================================
    // PROJECT PRICING
    // ==========================================

    pricePerSqm: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==========================================
    // PROJECT PAYMENT TERMS
    // ==========================================

    paymentTerms: {
      // Allow full payment
      fullPaymentEnabled: {
        type: Boolean,
        default: true,
      },

      // Interest-free installment plans
      installmentDurationsMonths: {
        type: [Number],
        default: [],
        validate: {
          validator: (months) =>
            months.every((month) =>
              [3, 6, 12].includes(month)
            ) &&
            new Set(months).size === months.length,

          message:
            "Installment durations must be unique and limited to 3, 6, or 12 months",
        },
      },
    },
    // ==========================================
    // PUBLICATION STATUS
    // ==========================================

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "DRAFT"],
      default: "DRAFT",
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// PROJECT DISCOVERY INDEX
// ==========================================

// Supports filtering published company projects
// by marketplace type.

projectSchema.index({
  companyId: 1,
  status: 1,
  projectType: 1,
});

const Project = mongoose.model(
  "Project",
  projectSchema
);

export default Project;