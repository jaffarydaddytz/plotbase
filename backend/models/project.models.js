import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    // Legacy project ownership.
    // Retained temporarily for backward compatibility.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return !this.companyId;
      },
      index: true,
    },

    // Company ownership for the new architecture.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: undefined,
      index: true,
    },

    // Authenticated user who created the company project.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return Boolean(this.companyId);
      },
    },

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

    pricePerSqm: {
      type: Number,
      required: true,
      min: 0,
    },

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

const Project = mongoose.model("Project", projectSchema);

export default Project;