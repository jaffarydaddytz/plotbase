import mongoose from "mongoose";

import Company from "../models/company.model.js";
import CompanyMembership from "../models/companyMembership.model.js";

/**
 * Protect company-specific operations.
 *
 * Must be used AFTER the existing `protect` middleware.
 *
 * Example:
 * router.get(
 *   "/:companyId/workspace",
 *   protect,
 *   requireCompanyMembership("COMPANY_ADMIN", "MANAGER"),
 *   controller
 * );
 */
export const requireCompanyMembership = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { companyId } = req.params;

      // Authentication must already be established.
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Validate the company identifier.
      if (!mongoose.isValidObjectId(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID",
        });
      }

      // First verify that this user belongs to this company.
      const membership = await CompanyMembership.findOne({
        companyId,
        userId: req.user._id,
        status: "ACTIVE",
      })
        .select("companyId userId role status")
        .lean();

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this company",
        });
      }

      // Company must be approved before operational access.
      const company = await Company.findOne({
        _id: companyId,
        verificationStatus: "APPROVED",
      })
        .select("_id name registrationNumber verificationStatus")
        .lean();

      if (!company) {
        return res.status(403).json({
          success: false,
          message: "Company is not approved for operations",
        });
      }

      // Check company-specific role permissions.
      if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(membership.role)
      ) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action",
        });
      }

      // Make the verified company and membership
      // available to the next controller.
      req.company = company;
      req.companyMembership = membership;

      next();
    } catch (error) {
      console.error("Company authorization error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to verify company access",
      });
    }
  };
};