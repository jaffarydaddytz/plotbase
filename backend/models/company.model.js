import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },

    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Personal details of the individual applying
// on behalf of the real-estate company.
applicantInfo: {
  fullName: {
    type: String,
    trim: true,
  },

  email: {
    type: String,
    trim: true,
    lowercase: true,
  },

  phone: {
    type: String,
    trim: true,
  },

  // Applicant's position within the company.
  // Example: Managing Director, CEO, General Manager.
  positionTitle: {
    type: String,
    trim: true,
  },

  // Example: Founder, Employee, Authorized Representative.
  relationshipToCompany: {
    type: String,
    trim: true,
  },

  // Applicant confirms they are authorized
  // to represent the company.
  authorizedToApply: {
    type: Boolean,
    default: false,
  },
},

// User who submitted the completed application.
// May differ from the user who originally created the draft.
submittedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},

    verificationDocuments: [
      {
        documentType: {
          type: String,
          required: true,
        },

        storageKey: {
          type: String,
          required: true,
        },

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        reviewStatus: {
  type: String,
  enum: ["PENDING", "VERIFIED", "REJECTED"],
  default: "PENDING",
},

reviewedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},

reviewedAt: {
  type: Date,
  default: null,
},

reviewNotes: {
  type: String,
  trim: true,
  default: "",
},
      },
    ],

verificationStatus: {
  type: String,
  enum: [
    "DRAFT",
    "PENDING",
    "APPROVED",
    "REJECTED",
    "SUSPENDED",
  ],
  default: "PENDING",
},
submittedAt: {
  type: Date,
  default: null,
},

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Company = mongoose.model("Company", companySchema);

export default Company;