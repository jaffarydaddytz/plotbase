import express from "express";
import multer from "multer";

import { protect } from "../middlewares/auth.middleware.js";

import { registerCompany , getMyCompanyApplications,submitCompanyApplication, updateCompanyDraft} from "../controllers/company.controller.js";

import { uploadVerificationDocument } from "../controllers/companyDocument.controller.js";

import companyDocumentUpload from "../middlewares/companyDocumentUpload.middleware.js";

const router = express.Router();

// Register a real-estate company
router.post("/register", protect, registerCompany);

// Get company applications created by the authenticated investor
router.get(
  "/my-applications",
  protect,
  getMyCompanyApplications,
);

// Submit a completed company application for admin review
router.post(
  "/:companyId/submit",
  protect,
  submitCompanyApplication
);

// Document upload middleware
const uploadDocument = companyDocumentUpload.single("document");

// Handle upload validation errors
const handleDocumentUpload = (req, res, next) => {
  uploadDocument(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Document exceeds the 5 MB limit"
            : "Invalid document upload",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Invalid document upload",
    });
  });
};

// Upload company verification documents
router.post(
  "/:companyId/documents",
  protect,
  handleDocumentUpload,
  uploadVerificationDocument
);


// Update company information while the application is DRAFT
router.patch(
  "/:companyId/draft",
  protect,
  updateCompanyDraft
);


export default router;