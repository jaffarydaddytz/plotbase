import mongoose from "mongoose";

import Company from "../models/company.model.js";
import CompanyMembership from "../models/companyMembership.model.js";

// =====================================================
// SHARED VALIDATION HELPERS
// =====================================================

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const editableApplicantFields = [
  "phone",
  "positionTitle",
  "relationshipToCompany",
  "authorizedToApply",
];

const isRecord = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

// =====================================================
// 1. REGISTER COMPANY
// =====================================================

// Register a new real-estate company as a draft.
export const registerCompany = async (req, res) => {
  let session;

  try {
    const {
      name,
      registrationNumber,
      contactEmail,
      contactPhone,
      address,
    } = req.body || {};

    // ---------------------------------------------
    // Validate required company information
    // ---------------------------------------------

    const requiredFields = {
      name,
      registrationNumber,
      contactEmail,
      contactPhone,
      address,
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (typeof value !== "string" || !value.trim()) {
        return res.status(400).json({
          success: false,
          message: `${field} is required and must be a non-empty string`,
        });
      }
    }

    // ---------------------------------------------
    // Normalize company information
    // ---------------------------------------------

    const normalizedName = name.trim();

    const normalizedRegistrationNumber =
      registrationNumber.trim().toUpperCase();

    const normalizedEmail =
      contactEmail.trim().toLowerCase();

    const normalizedPhone = contactPhone.trim();

    const normalizedAddress = address.trim();

    if (normalizedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Company name must contain at least 2 characters",
      });
    }

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company email address",
      });
    }

    // ---------------------------------------------
    // Identify authenticated applicant
    // ---------------------------------------------

    // Applicant identity must come from authentication.
    // Never accept applicant identity from the frontend.

    const userId = req.user._id;

    // ---------------------------------------------
    // Validate applicant information
    // ---------------------------------------------

    const applicantInput =
      req.body?.applicantInfo === undefined
        ? {}
        : req.body.applicantInfo;

    if (
      !isRecord(applicantInput) ||
      Object.keys(applicantInput).some(
        (field) => !editableApplicantFields.includes(field)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid applicant information",
      });
    }

    // Validate editable applicant text fields.

    for (const field of [
      "phone",
      "positionTitle",
      "relationshipToCompany",
    ]) {
      const value = applicantInput[field];

      if (value !== undefined) {
        const maxLength = field === "phone" ? 30 : 100;

        if (
          typeof value !== "string" ||
          value.trim().length > maxLength
        ) {
          return res.status(400).json({
            success: false,
            message: `Invalid applicant ${field}`,
          });
        }
      }
    }

    // Authorization confirmation must be a boolean.

    if (
      applicantInput.authorizedToApply !== undefined &&
      typeof applicantInput.authorizedToApply !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "Authorization confirmation must be a boolean",
      });
    }

    // ---------------------------------------------
    // Prepare applicant information
    // ---------------------------------------------

    const applicantInfo = {
      // Identity comes from the authenticated account.

      fullName:
        typeof req.user.name === "string"
          ? req.user.name.trim()
          : "",

      email:
        typeof req.user.email === "string"
          ? req.user.email.trim().toLowerCase()
          : "",

      // Personal contact information.

      phone:
        applicantInput.phone !== undefined
          ? applicantInput.phone.trim()
          : typeof req.user.phone === "string"
            ? req.user.phone.trim()
            : "",

      // Applicant's position within the company.

      positionTitle:
        applicantInput.positionTitle?.trim() || "",

      // Applicant's relationship to the company.

      relationshipToCompany:
        applicantInput.relationshipToCompany?.trim() || "",

      // Authorization confirmation.

      authorizedToApply:
        applicantInput.authorizedToApply === true,
    };

    // ---------------------------------------------
    // Create company and membership atomically
    // ---------------------------------------------

    session = await mongoose.startSession();

    let company;

    await session.withTransaction(async () => {
      const createdCompanies = await Company.create(
        [
          {
            name: normalizedName,

            registrationNumber:
              normalizedRegistrationNumber,

            contactEmail: normalizedEmail,

            contactPhone: normalizedPhone,

            address: normalizedAddress,

            // User responsible for creating the application.
            createdBy: userId,

            // Applicant personal details.
            applicantInfo,

            // Submission has not happened yet.
            submittedBy: null,

            submittedAt: null,

            // Newly created applications remain drafts.
            verificationStatus: "DRAFT",

            verificationDocuments: [],
          },
        ],
        { session }
      );

      company = createdCompanies[0];

      // ---------------------------------------------
      // Create founding company membership
      // ---------------------------------------------

      // Membership remains PENDING until the company
      // has successfully passed administrator approval.

      await CompanyMembership.create(
        [
          {
            userId,

            companyId: company._id,

            role: "COMPANY_ADMIN",

            status: "PENDING",

            addedBy: userId,
          },
        ],
        { session }
      );
    });

    // ---------------------------------------------
    // Return successful registration
    // ---------------------------------------------

    // IMPORTANT:
    // Use "company", not "updatedCompany".
    // This controller creates a company record.

    return res.status(201).json({
      success: true,

      message:
        "Company draft saved successfully. Upload the required documents and review your information before submitting for admin approval",

      company: {
        id: company._id,

        name: company.name,

        registrationNumber: company.registrationNumber,

        contactEmail: company.contactEmail,

        contactPhone: company.contactPhone,

        address: company.address,

        applicantInfo: {
          fullName:
            company.applicantInfo?.fullName || "",

          email:
            company.applicantInfo?.email || "",

          phone:
            company.applicantInfo?.phone || "",

          positionTitle:
            company.applicantInfo?.positionTitle || "",

          relationshipToCompany:
            company.applicantInfo?.relationshipToCompany || "",

          authorizedToApply:
            company.applicantInfo?.authorizedToApply === true,
        },

        verificationStatus: company.verificationStatus,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Company registration number already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Company registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register company",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// =====================================================
// 2. GET MY COMPANY APPLICATIONS
// =====================================================

// Retrieve applications created by the authenticated user.

export const getMyCompanyApplications = async (req, res) => {
  try {
    const companies = await Company.find({
      createdBy: req.user._id,
    })
      .select(
        "name registrationNumber contactEmail contactPhone address " +
          "applicantInfo verificationStatus " +
          "verificationDocuments.documentType " +
          "verificationDocuments.uploadedAt " +
          "verificationDocuments.reviewStatus " +
          "createdAt updatedAt submittedAt reviewedAt rejectionReason"
      )
      .sort({ createdAt: -1 })
      .lean();

    // ---------------------------------------------
    // Format safe application response
    // ---------------------------------------------

    const applications = companies.map((company) => ({
      id: company._id,

      name: company.name,

      registrationNumber: company.registrationNumber,

      contactEmail: company.contactEmail,

      contactPhone: company.contactPhone,

      address: company.address,

      // Applicant information.

      applicantInfo: {
        fullName:
          company.applicantInfo?.fullName || "",

        email:
          company.applicantInfo?.email || "",

        phone:
          company.applicantInfo?.phone || "",

        positionTitle:
          company.applicantInfo?.positionTitle || "",

        relationshipToCompany:
          company.applicantInfo?.relationshipToCompany || "",

        authorizedToApply:
          company.applicantInfo?.authorizedToApply === true,
      },

      verificationStatus: company.verificationStatus,

      // Return document metadata only.

      documents: (company.verificationDocuments || []).map(
        (document) => ({
          documentType: document.documentType,

          uploadedAt: document.uploadedAt,

          reviewStatus: document.reviewStatus,
        })
      ),

      // Application timeline.

      createdAt: company.createdAt,

      updatedAt: company.updatedAt,

      submittedAt: company.submittedAt,

      reviewedAt: company.reviewedAt,

      rejectionReason: company.rejectionReason,
    }));

    return res.status(200).json({
      success: true,

      count: applications.length,

      applications,
    });
  } catch (error) {
    console.error("Get company applications error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve company applications",
    });
  }
};

// =====================================================
// 3. SUBMIT COMPANY APPLICATION
// =====================================================

// Submit a completed draft for administrator review.

export const submitCompanyApplication = async (req, res) => {
  try {
    const { companyId } = req.params;

    const userId = req.user._id;

    // ---------------------------------------------
    // Validate company ID
    // ---------------------------------------------

    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // ---------------------------------------------
    // Verify application ownership
    // ---------------------------------------------

    const company = await Company.findOne({
      _id: companyId,

      createdBy: userId,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company application not found",
      });
    }

    // ---------------------------------------------
    // Only drafts can be submitted
    // ---------------------------------------------

    if (company.verificationStatus !== "DRAFT") {
      return res.status(409).json({
        success: false,
        message: "Only draft applications can be submitted",
      });
    }

    // ---------------------------------------------
    // Validate company information
    // ---------------------------------------------

    const requiredFields = [
      "name",
      "registrationNumber",
      "contactEmail",
      "contactPhone",
      "address",
    ];

    const missingFields = requiredFields.filter(
      (field) =>
        typeof company[field] !== "string" ||
        !company[field].trim()
    );

    if (
      missingFields.length > 0 ||
      company.name.trim().length < 2 ||
      !emailRegex.test(company.contactEmail)
    ) {
      return res.status(422).json({
        success: false,

        message:
          "Complete all valid company information before submitting",
      });
    }

    // ---------------------------------------------
    // Validate applicant information
    // ---------------------------------------------

    const applicant = company.applicantInfo;

    const requiredApplicantFields = [
      "phone",
      "positionTitle",
      "relationshipToCompany",
    ];

    const missingApplicantFields =
      requiredApplicantFields.filter(
        (field) =>
          typeof applicant?.[field] !== "string" ||
          !applicant[field].trim()
      );

    if (missingApplicantFields.length > 0) {
      return res.status(422).json({
        success: false,

        message:
          "Complete all required applicant information before submitting.",

        missingFields: missingApplicantFields,
      });
    }

    // ---------------------------------------------
    // Require authorization confirmation
    // ---------------------------------------------

    if (applicant?.authorizedToApply !== true) {
      return res.status(422).json({
        success: false,

        message:
          "You must confirm that you are authorized to apply on behalf of this company.",
      });
    }

    // ---------------------------------------------
    // Validate required verification documents
    // ---------------------------------------------

    const requiredDocuments = [
      "REGISTRATION_CERTIFICATE",
      "TAX_CERTIFICATE",
      "BUSINESS_LICENSE",
    ];

    const uploadedDocuments =
      company.verificationDocuments || [];

    const missingDocuments = requiredDocuments.filter(
      (type) =>
        !uploadedDocuments.some(
          (document) => document.documentType === type
        )
    );

    if (missingDocuments.length > 0) {
      return res.status(422).json({
        success: false,

        message:
          "Upload all required verification documents before submitting",

        missingDocuments,
      });
    }

    // ---------------------------------------------
    // Capture applicant identity at submission
    // ---------------------------------------------

    // Identity comes from the authenticated account,
    // not user-controlled request body fields.

    const applicantFullName =
      typeof req.user.name === "string"
        ? req.user.name.trim()
        : "";

    const applicantEmail =
      typeof req.user.email === "string"
        ? req.user.email.trim().toLowerCase()
        : "";

    if (
      applicantFullName.length < 2 ||
      !emailRegex.test(applicantEmail)
    ) {
      return res.status(422).json({
        success: false,

        message:
          "Your Plotbase account must have a valid name and email before submitting a company application.",
      });
    }

    // ---------------------------------------------
    // Record submission timestamp
    // ---------------------------------------------

    const submittedAt = new Date();

    // ---------------------------------------------
    // Atomically submit application
    // ---------------------------------------------

    // Recheck ownership, status and required documents
    // during the final database update.

    const submittedCompany = await Company.findOneAndUpdate(
      {
        _id: companyId,

        createdBy: userId,

        verificationStatus: "DRAFT",

        "verificationDocuments.documentType": {
          $all: requiredDocuments,
        },
      },
      {
        $set: {
          // Application is now awaiting admin review.
          verificationStatus: "PENDING",

          // Submission information.
          submittedAt,

          submittedBy: userId,

          // Preserve applicant identity at submission.
          "applicantInfo.fullName": applicantFullName,

          "applicantInfo.email": applicantEmail,
        },
      },
      {
        returnDocument: "after",

        runValidators: true,

        projection: {
          name: 1,

          registrationNumber: 1,

          verificationStatus: 1,

          submittedAt: 1,
        },
      }
    );

    if (!submittedCompany) {
      return res.status(409).json({
        success: false,

        message:
          "The application has changed. Refresh and review it before submitting again.",
      });
    }

    // ---------------------------------------------
    // Return submission confirmation
    // ---------------------------------------------

    return res.status(200).json({
      success: true,

      message:
        "Company application submitted successfully for administrator review",

      company: {
        id: submittedCompany._id,

        name: submittedCompany.name,

        registrationNumber:
          submittedCompany.registrationNumber,

        verificationStatus:
          submittedCompany.verificationStatus,

        submittedAt: submittedCompany.submittedAt,
      },
    });
  } catch (error) {
    console.error("Submit company application error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit company application",
    });
  }
};

// =====================================================
// 4. UPDATE COMPANY DRAFT
// =====================================================

// Update company and applicant details while the
// application is still in DRAFT status.

export const updateCompanyDraft = async (req, res) => {
  try {
    const { companyId } = req.params;

    const userId = req.user._id;

    // ---------------------------------------------
    // Validate company ID
    // ---------------------------------------------

    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // ---------------------------------------------
    // Allowed company update fields
    // ---------------------------------------------

    const allowedFields = [
      "name",
      "registrationNumber",
      "contactEmail",
      "contactPhone",
      "address",
      "applicantInfo",
    ];

    const fields = req.body;

    if (!isRecord(fields)) {
      return res.status(400).json({
        success: false,
        message: "Valid company information is required",
      });
    }

    const keys = Object.keys(fields);

    if (
      keys.length === 0 ||
      keys.some(
        (field) => !allowedFields.includes(field)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid company update fields",
      });
    }

    const updates = {};

    // ---------------------------------------------
    // Validate incoming fields
    // ---------------------------------------------

    for (const field of keys) {
      const value = fields[field];

      // -------------------------------------------
      // Applicant information
      // -------------------------------------------

      if (field === "applicantInfo") {
        if (!isRecord(value)) {
          return res.status(400).json({
            success: false,
            message: "Valid applicant information is required",
          });
        }

        const applicantKeys = Object.keys(value);

        // Only editable applicant fields are allowed.
        // Full name and email cannot be changed here.

        if (
          applicantKeys.length === 0 ||
          applicantKeys.some(
            (key) => !editableApplicantFields.includes(key)
          )
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid applicant information fields",
          });
        }

        for (const key of applicantKeys) {
          const applicantValue = value[key];

          // ---------------------------------------
          // Authorization confirmation
          // ---------------------------------------

          if (key === "authorizedToApply") {
            if (typeof applicantValue !== "boolean") {
              return res.status(400).json({
                success: false,

                message:
                  "Authorization confirmation must be a boolean",
              });
            }

            updates["applicantInfo.authorizedToApply"] =
              applicantValue;

            continue;
          }

          // ---------------------------------------
          // Applicant text fields
          // ---------------------------------------

          if (typeof applicantValue !== "string") {
            return res.status(400).json({
              success: false,
              message: `${key} must be a string`,
            });
          }

          const normalizedValue = applicantValue.trim();

          const maxLength =
            key === "phone" ? 30 : 100;

          if (normalizedValue.length > maxLength) {
            return res.status(400).json({
              success: false,

              message:
                `${key} must not exceed ${maxLength} characters`,
            });
          }

          // Empty values are allowed while saving drafts.
          // Submission will validate required fields.

          updates[`applicantInfo.${key}`] =
            normalizedValue;
        }

        continue;
      }

      // -------------------------------------------
      // Company information
      // -------------------------------------------

      if (
        typeof value !== "string" ||
        !value.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a non-empty string`,
        });
      }

      updates[field] = value.trim();
    }

    // ---------------------------------------------
    // Validate company name
    // ---------------------------------------------

    if (
      updates.name &&
      updates.name.length < 2
    ) {
      return res.status(400).json({
        success: false,
        message: "Company name must contain at least 2 characters",
      });
    }

    // ---------------------------------------------
    // Normalize registration number
    // ---------------------------------------------

    if (updates.registrationNumber) {
      updates.registrationNumber =
        updates.registrationNumber.toUpperCase();
    }

    // ---------------------------------------------
    // Validate company email
    // ---------------------------------------------

    if (updates.contactEmail) {
      updates.contactEmail =
        updates.contactEmail.toLowerCase();

      if (!emailRegex.test(updates.contactEmail)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company email address",
        });
      }
    }

    // ---------------------------------------------
    // Verify application ownership
    // ---------------------------------------------

    const company = await Company.findOne({
      _id: companyId,

      createdBy: userId,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company application not found",
      });
    }

    // ---------------------------------------------
    // Only drafts can be edited
    // ---------------------------------------------

    if (company.verificationStatus !== "DRAFT") {
      return res.status(409).json({
        success: false,
        message: "Only draft applications can be edited",
      });
    }

    // ---------------------------------------------
    // Update draft safely
    // ---------------------------------------------

    const updatedCompany = await Company.findOneAndUpdate(
      {
        _id: companyId,

        createdBy: userId,

        verificationStatus: "DRAFT",
      },
      {
        $set: updates,
      },
      {
        returnDocument: "after",

        runValidators: true,
      }
    );

    if (!updatedCompany) {
      return res.status(409).json({
        success: false,

        message:
          "Application status changed. Please refresh.",
      });
    }

    // ---------------------------------------------
    // Return updated draft information
    // ---------------------------------------------

    return res.status(200).json({
      success: true,

      message: "Company draft updated successfully",

      company: {
        id: updatedCompany._id,

        name: updatedCompany.name,

        registrationNumber:
          updatedCompany.registrationNumber,

        contactEmail:
          updatedCompany.contactEmail,

        contactPhone:
          updatedCompany.contactPhone,

        address:
          updatedCompany.address,

        applicantInfo: {
          fullName:
            updatedCompany.applicantInfo?.fullName || "",

          email:
            updatedCompany.applicantInfo?.email || "",

          phone:
            updatedCompany.applicantInfo?.phone || "",

          positionTitle:
            updatedCompany.applicantInfo?.positionTitle || "",

          relationshipToCompany:
            updatedCompany.applicantInfo?.relationshipToCompany || "",

          authorizedToApply:
            updatedCompany.applicantInfo?.authorizedToApply === true,
        },

        verificationStatus:
          updatedCompany.verificationStatus,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,

        message:
          "Company incorporation number already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Update company draft error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update company draft",
    });
  }
};