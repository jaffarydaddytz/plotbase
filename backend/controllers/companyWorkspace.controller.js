/**
 * Plotbase — Company Workspace Controller
 *
 * Phase 1A: Company Management
 *
 * Company access is verified by:
 * 1. protect middleware
 * 2. requireCompanyMembership middleware
 *
 * Only approved companies with active memberships
 * can access their workspace.
 */

// GET /api/companies/:companyId/workspace
export const getCompanyWorkspace = async (req, res) => {
  try {
    // These values are provided by companyAccess.middleware.js
    const company = req.company;
    const membership = req.companyMembership;

    if (!company || !membership) {
      return res.status(403).json({
        success: false,
        message: "Company access denied",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Company workspace retrieved successfully",

      company: {
        id: company._id,
        name: company.name,
        registrationNumber: company.registrationNumber,
        verificationStatus: company.verificationStatus,
      },

      membership: {
        role: membership.role,
        status: membership.status,
      },
    });

  } catch (error) {
    console.error("Company workspace error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve company workspace",
    });
  }
};