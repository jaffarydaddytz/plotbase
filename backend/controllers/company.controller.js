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

            verificationStatus: "PENDING",
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
      message: "Company application submitted successfully",
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