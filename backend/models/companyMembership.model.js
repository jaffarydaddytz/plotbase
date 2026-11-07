import mongoose from "mongoose";

const companyMembershipSchema = new mongoose.Schema(
  {
    // Existing Plotbase user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Real-estate company
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    // User's responsibility within this company
    role: {
      type: String,
      enum: [
        "COMPANY_ADMIN",
        "MANAGER",
        "SALES_OFFICER",
        "ACCOUNTANT",
        "FIELD_OFFICER",
        "TITLE_DEED_OFFICER",
      ],
      required: true,
    },

    // Membership lifecycle
    status: {
      type: String,
      enum: [
        "PENDING",
        "ACTIVE",
        "SUSPENDED",
        "REVOKED",
      ],
      default: "PENDING",
    },

    // User who added or invited this member
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Date the membership became active
    joinedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate memberships within the same company
companyMembershipSchema.index(
  { userId: 1, companyId: 1 },
  { unique: true }
);

const CompanyMembership = mongoose.model(
  "CompanyMembership",
  companyMembershipSchema
);

export default CompanyMembership;