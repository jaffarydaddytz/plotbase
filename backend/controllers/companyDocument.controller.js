import mongoose from "mongoose";

import Company from "../models/company.model.js";
import CompanyMembership from "../models/companyMembership.model.js";

import cloudinary from "../config/cloudinary.js";

import { uploadCompanyDocument } from "../utils/uploadCompanyDocument.js";

const allowedDocumentTypes = [
  "REGISTRATION_CERTIFICATE",
  "TAX_CERTIFICATE",
  "BUSINESS_LICENSE",
];

// Upload a company verification document
export const uploadVerificationDocument = async (req, res) => {
  let uploadedDocument = null;
  let documentSaved = false;

  try {
    const { companyId } = req.params;
    const { documentType } = req.body;

    const userId = req.user._id;

    // Validate company ID
    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // Validate document type
    if (!allowedDocumentTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document type",
      });
    }

    // Validate uploaded file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Verification document is required",
      });
    }

    // Verify company ownership and application status
    const company = await Company.findOne({
      _id: companyId,
      createdBy: userId,
      verificationStatus: "PENDING",
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Pending company application not found",
      });
    }

    // Verify applicant's company membership
    const membership = await CompanyMembership.findOne({
      companyId,
      userId,
      role: "COMPANY_ADMIN",
      status: "PENDING",
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to upload company documents",
      });
    }

    // Prevent duplicate document types
    const documentExists = company.verificationDocuments.some(
      (document) => document.documentType === documentType
    );

    if (documentExists) {
      return res.status(409).json({
        success: false,
        message: "This document type has already been uploaded",
      });
    }

    // Upload the document to protected Cloudinary storage
    uploadedDocument = await uploadCompanyDocument(req.file);

    const uploadedAt = new Date();

    // Save document reference only if company is still pending.
    // The condition also prevents concurrent duplicate document types.
    const result = await Company.updateOne(
      {
        _id: companyId,
        createdBy: userId,
        verificationStatus: "PENDING",
        "verificationDocuments.documentType": {
          $ne: documentType,
        },
      },
      {
        $push: {
          verificationDocuments: {
            documentType,
            storageKey: uploadedDocument.storageKey,
            uploadedAt,
          },
        },
      }
    );

    if (result.modifiedCount !== 1) {
      return res.status(409).json({
        success: false,
        message: "Company application changed or document already exists",
      });
    }

    documentSaved = true;

    return res.status(201).json({
      success: true,
      message: "Company verification document uploaded successfully",
      document: {
        documentType,
        uploadedAt,
      },
    });

  } catch (error) {
    console.error("Company document upload error:", error);

    if (
      error.message === "Invalid or unsupported document content" ||
      error.message === "Document exceeds the 5 MB limit" ||
      error.message === "No document provided"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to upload company verification document",
    });

  } finally {
    // Best-effort cleanup if MongoDB did not save the document reference
    if (uploadedDocument && !documentSaved) {
      try {
        await cloudinary.uploader.destroy(
          uploadedDocument.storageKey,
          {
            resource_type: "raw",
            type: "authenticated",
          }
        );
      } catch (cleanupError) {
        console.error("Document cleanup failed:", cleanupError);
      }
    }
  }
};