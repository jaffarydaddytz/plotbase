import mongoose from "mongoose";

import Company from "../models/company.model.js";
import CompanyMembership from "../models/companyMembership.model.js";

// Register a new real-estate company
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

    // Validate required fields
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

    const normalizedName = name.trim();
    const normalizedRegistrationNumber =
      registrationNumber.trim().toUpperCase();

    const normalizedEmail = contactEmail.trim().toLowerCase();
    const normalizedPhone = contactPhone.trim();
    const normalizedAddress = address.trim();

    if (normalizedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Company name must contain at least 2 characters",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company email address",
      });
    }

    // req.user is provided by the existing protect middleware
    const userId = req.user._id;

    // Create company and founding membership atomically
    session = await mongoose.startSession();

    let company;

    await session.withTransaction(async () => {
      const createdCompanies = await Company.create(
        [
          {
            name: normalizedName,
            registrationNumber: normalizedRegistrationNumber,
            contactEmail: normalizedEmail,
            contactPhone: normalizedPhone,
            address: normalizedAddress,

            createdBy: userId,

            verificationStatus: "DRAFT",
            submittedAt: null,
            verificationDocuments: [],
          },
        ],
        { session }
      );

      company = createdCompanies[0];

      // The applicant becomes the pending company administrator
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

    return res.status(201).json({
      success: true,
      message: "Company draft saved successfully. Upload the required documents and review your information before submitting for admin approval",
      company: {
        id: company._id,
        name: company.name,
        registrationNumber: company.registrationNumber,
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

// Retrieve company applications created by the authenticated user
export const getMyCompanyApplications = async (req, res) => {
  try {
    const userId = req.user._id;

    // Retrieve only applications created by this user
    const companies = await Company.find({
      createdBy: userId,
    })
      .select(
        "name registrationNumber contactEmail contactPhone address " +
        "verificationStatus verificationDocuments.documentType " +
        "verificationDocuments.uploadedAt " +
        "verificationDocuments.reviewStatus " +
        "createdAt updatedAt submittedAt reviewedAt rejectionReason"
      )
      .sort({ createdAt: -1 })
      .lean();

    // Return safe application details
    const applications = companies.map((company) => ({
      id: company._id,
      name: company.name,
      registrationNumber: company.registrationNumber,

      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
      address: company.address,

      verificationStatus: company.verificationStatus,

      documents: (company.verificationDocuments || []).map(
        (document) => ({
          documentType: document.documentType,
          uploadedAt: document.uploadedAt,
          reviewStatus: document.reviewStatus,
        })
      ),

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



// Submit a completed company application for administrator review
export const submitCompanyApplication = async (req, res) => {
  try {
    const { companyId } = req.params;
    const userId = req.user._id;

    // Validate company ID
    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // Only the applicant can submit their own company
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

    // Only drafts can be submitted
    if (company.verificationStatus !== "DRAFT") {
      return res.status(409).json({
        success: false,
        message: "Only draft applications can be submitted",
      });
    }

    // Validate company information
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
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.contactEmail)
    ) {
      return res.status(422).json({
        success: false,
        message: "Complete all valid company information before submitting",
      });
    }

    // All three verification documents are required
    const requiredDocuments = [
      "REGISTRATION_CERTIFICATE",
      "TAX_CERTIFICATE",
      "BUSINESS_LICENSE",
    ];

    const uploadedDocuments = company.verificationDocuments || [];

    const missingDocuments = requiredDocuments.filter(
      (type) =>
        !uploadedDocuments.some(
          (document) => document.documentType === type
        )
    );

    if (missingDocuments.length > 0) {
      return res.status(422).json({
        success: false,
        message: "Upload all required verification documents before submitting",
        missingDocuments,
      });
    }

    // Atomically submit only if the application is still a
    // draft and still contains all required documents.
    const submittedAt = new Date();

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
          verificationStatus: "PENDING",
          submittedAt,
        },
      },
      {
        new: true,
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

    return res.status(200).json({
      success: true,
      message: "Company application submitted successfully for administrator review",
      company: {
        id: submittedCompany._id,
        name: submittedCompany.name,
        registrationNumber: submittedCompany.registrationNumber,
        verificationStatus: submittedCompany.verificationStatus,
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

// Update company information while the application is still a draft
export const updateCompanyDraft = async (req, res) => {
  try {
    const { companyId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const allowedFields = [
      "name",
      "registrationNumber",
      "contactEmail",
      "contactPhone",
      "address",
    ];

    const fields = req.body;

    if (
      !fields ||
      typeof fields !== "object" ||
      Array.isArray(fields)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid company information is required",
      });
    }

    const keys = Object.keys(fields);

    if (
      keys.length === 0 ||
      keys.some((field) => !allowedFields.includes(field))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid company update fields",
      });
    }

    const updates = {};

    for (const field of keys) {
      const value = fields[field];

      if (typeof value !== "string" || !value.trim()) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a non-empty string`,
        });
      }

      updates[field] = value.trim();
    }

    // Validate company name
    if (updates.name && updates.name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Company name must contain at least 2 characters",
      });
    }

    // Normalize incorporation number
    if (updates.registrationNumber) {
      updates.registrationNumber =
        updates.registrationNumber.toUpperCase();
    }

    // Validate and normalize email
    if (updates.contactEmail) {
      updates.contactEmail =
        updates.contactEmail.toLowerCase();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(updates.contactEmail)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company email address",
        });
      }
    }

    // Verify ownership
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

    // Only DRAFT applications can be edited
    if (company.verificationStatus !== "DRAFT") {
      return res.status(409).json({
        success: false,
        message: "Only draft applications can be edited",
      });
    }

    // Update only if the company is still DRAFT
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
        new: true,
        runValidators: true,
      }
    );

    if (!updatedCompany) {
      return res.status(409).json({
        success: false,
        message: "Application status changed. Please refresh.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Company draft updated successfully",
      company: {
        id: updatedCompany._id,
        name: updatedCompany.name,
        registrationNumber: updatedCompany.registrationNumber,
        contactEmail: updatedCompany.contactEmail,
        contactPhone: updatedCompany.contactPhone,
        address: updatedCompany.address,
        verificationStatus: updatedCompany.verificationStatus,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Company incorporation number already exists",
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