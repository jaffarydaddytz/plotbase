import Company from "../models/company.model.js";
import mongoose from "mongoose";
import { getCompanyDocumentUrl } from "../utils/getCompanyDocumentUrl.js";
import CompanyMembership from "../models/companyMembership.model.js";

// Get companies awaiting administrator verification
export const getPendingCompanies = async (req, res) => {
  try {
    const companies = await Company.find({
      verificationStatus: "PENDING",
    })
      .select(
        "name registrationNumber contactEmail contactPhone address verificationStatus createdBy createdAt"
      )
      .populate("createdBy", "name email")
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: companies.length,
      companies,
    });
  } catch (error) {
    console.error("Get pending companies error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve pending companies",
    });
  }
};

// Get company verification details for administrator review
export const getCompanyVerificationDetails = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const company = await Company.findById(companyId)
      .populate("createdBy", "name email")
      .lean();

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    return res.status(200).json({
      success: true,
      company: {
        id: company._id,
        name: company.name,
        registrationNumber: company.registrationNumber,
        contactEmail: company.contactEmail,
        contactPhone: company.contactPhone,
        address: company.address,
        verificationStatus: company.verificationStatus,
        createdBy: company.createdBy,
        createdAt: company.createdAt,

documents: company.verificationDocuments.map((doc) => ({
  id: doc._id,
  documentType: doc.documentType,
  uploadedAt: doc.uploadedAt,

  reviewStatus: doc.reviewStatus,
  reviewedAt: doc.reviewedAt,
  reviewNotes: doc.reviewNotes,
})),
      },
    });
  } catch (error) {
    console.error("Company verification details error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve company verification details",
    });
  }
};

// Generate a temporary viewing URL for a company document
export const viewCompanyVerificationDocument = async (req, res) => {
  try {
    const { companyId, documentId } = req.params;

    // Validate MongoDB IDs
    if (
      !mongoose.isValidObjectId(companyId) ||
      !mongoose.isValidObjectId(documentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid company or document ID",
      });
    }

    // Find company and its verification documents
    const company = await Company.findById(companyId)
      .select("verificationDocuments");

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Find the requested document
    const document = company.verificationDocuments.id(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Verification document not found",
      });
    }

    // Generate a short-lived Cloudinary access URL
    const url = getCompanyDocumentUrl(document.storageKey);

    // Prevent caching of sensitive document access information
    res.set("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,
      document: {
        documentType: document.documentType,
        url,
        expiresInSeconds: 60,
      },
    });

  } catch (error) {
    console.error("Company document viewing error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to access verification document",
    });
  }
};

// Review a company verification document
export const reviewCompanyDocument = async (req, res) => {
  try {
    const { companyId, documentId } = req.params;
    const { reviewStatus, reviewNotes = "" } = req.body || {};

    // Validate MongoDB IDs
    if (
      !mongoose.isValidObjectId(companyId) ||
      !mongoose.isValidObjectId(documentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid company or document ID",
      });
    }

    // Validate review decision
    if (!["VERIFIED", "REJECTED"].includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        message: "Review status must be VERIFIED or REJECTED",
      });
    }

    // Validate review notes
    if (
      typeof reviewNotes !== "string" ||
      reviewNotes.length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Review notes must be a string of at most 1000 characters",
      });
    }

    const notes = reviewNotes.trim();

    if (reviewStatus === "REJECTED" && !notes) {
      return res.status(400).json({
        success: false,
        message: "Review notes are required when rejecting a document",
      });
    }

    // Atomically review only a pending document
    // belonging to a pending company application.
    const result = await Company.updateOne(
      {
        _id: companyId,
        verificationStatus: "PENDING",
        verificationDocuments: {
          $elemMatch: {
            _id: documentId,
            reviewStatus: { $in: [null, "PENDING"] },
          },
        },
      },
      {
        $set: {
          "verificationDocuments.$.reviewStatus": reviewStatus,
          "verificationDocuments.$.reviewedBy": req.user._id,
          "verificationDocuments.$.reviewedAt": new Date(),
          "verificationDocuments.$.reviewNotes": notes,
        },
      }
    );

    if (result.modifiedCount !== 1) {
      return res.status(409).json({
        success: false,
        message:
          "Pending document not found or document already reviewed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Company document reviewed successfully",
      document: {
        id: documentId,
        reviewStatus,
        reviewNotes: notes,
      },
    });

  } catch (error) {
    console.error("Company document review error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to review company document",
    });
  }
};

// Reject a pending company application
export const rejectCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { rejectionReason } = req.body || {};

    // Validate company ID
    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // Validate rejection reason
    if (
      typeof rejectionReason !== "string" ||
      rejectionReason.trim().length < 10 ||
      rejectionReason.trim().length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason must contain 10 to 1000 characters",
      });
    }

    const company = await Company.findOneAndUpdate(
      {
        _id: companyId,
        verificationStatus: "PENDING",
      },
      {
        $set: {
          verificationStatus: "REJECTED",
          rejectionReason: rejectionReason.trim(),
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!company) {
      return res.status(409).json({
        success: false,
        message: "Company not found or application is no longer pending",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Company application rejected successfully",
      company: {
        id: company._id,
        name: company.name,
        verificationStatus: company.verificationStatus,
        rejectionReason: company.rejectionReason,
        reviewedAt: company.reviewedAt,
      },
    });

  } catch (error) {
    console.error("Company rejection error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reject company application",
    });
  }
};

// Approve a verified real-estate company
export const approveCompany = async (req, res) => {
  const { companyId } = req.params;

  if (!mongoose.isValidObjectId(companyId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid company ID",
    });
  }

  const session = await mongoose.startSession();

  try {
    let approvedCompany;

    await session.withTransaction(async () => {
      const company = await Company.findOne({
        _id: companyId,
        verificationStatus: "PENDING",
      }).session(session);

      if (!company) {
        const error = new Error(
          "Company not found or application is no longer pending"
        );
        error.statusCode = 409;
        throw error;
      }

      // Provisional document requirements.
      // These must be finalized before production approval.
      const requiredDocuments = [
        "REGISTRATION_CERTIFICATE",
        "TAX_CERTIFICATE",
        "BUSINESS_LICENSE",
      ];

      const documents = company.verificationDocuments;

      const hasVerifiedDocuments = requiredDocuments.every(
        (type) =>
          documents.some(
            (doc) =>
              doc.documentType === type &&
              doc.reviewStatus === "VERIFIED"
          )
      );

      const allSubmittedDocumentsVerified = documents.every(
        (doc) => doc.reviewStatus === "VERIFIED"
      );

      if (!hasVerifiedDocuments || !allSubmittedDocumentsVerified) {
        const error = new Error(
          "All required company documents must be verified before approval"
        );
        error.statusCode = 422;
        throw error;
      }

      // Verify the founding company administrator
      const membership = await CompanyMembership.findOne({
        companyId: company._id,
        userId: company.createdBy,
        role: "COMPANY_ADMIN",
        status: "PENDING",
      }).session(session);

      if (!membership) {
        const error = new Error(
          "Pending founding company administrator membership not found"
        );
        error.statusCode = 409;
        throw error;
      }

      const now = new Date();

      // Approve company
      const companyResult = await Company.updateOne(
        {
          _id: company._id,
          verificationStatus: "PENDING",
        },
        {
          $set: {
            verificationStatus: "APPROVED",
            reviewedBy: req.user._id,
            reviewedAt: now,
            rejectionReason: "",
          },
        },
        { session }
      );

      if (companyResult.modifiedCount !== 1) {
        throw new Error("Company approval could not be completed");
      }

      // Activate founding company administrator
      const membershipResult = await CompanyMembership.updateOne(
        {
          _id: membership._id,
          status: "PENDING",
        },
        {
          $set: {
            status: "ACTIVE",
            joinedAt: now,
          },
        },
        { session }
      );

      if (membershipResult.modifiedCount !== 1) {
        throw new Error("Company membership activation failed");
      }

      approvedCompany = {
        id: company._id,
        name: company.name,
        verificationStatus: "APPROVED",
        reviewedAt: now,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Company approved successfully",
      company: approvedCompany,
    });

  } catch (error) {
    console.error("Company approval error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode
          ? error.message
          : "Unable to approve company",
    });

  } finally {
    await session.endSession();
  }
};