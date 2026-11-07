import CompanyMembership from "../models/companyMembership.model.js";

/**
 * GET /api/companies/my-workspaces
 *
 * Returns companies where the authenticated user
 * has an ACTIVE membership and the company is APPROVED.
 *
 * Requires protect middleware.
 */
export const getMyWorkspaces = async (req, res) => {
  try {
    const userId = req.user._id;

    const memberships = await CompanyMembership.find({
      userId,
      status: "ACTIVE",
    })
      .select("companyId role")
      .populate({
        path: "companyId",
        match: {
          verificationStatus: "APPROVED",
        },
        select: "_id name registrationNumber verificationStatus",
      })
      .lean();

    // Exclude memberships whose companies are not approved.
    const workspaces = memberships
      .filter((membership) => membership.companyId)
      .map((membership) => ({
        companyId: membership.companyId._id,
        name: membership.companyId.name,
        registrationNumber: membership.companyId.registrationNumber,
        role: membership.role,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({
      success: true,
      workspaces,
    });
  } catch (error) {
    console.error("Failed to retrieve company workspaces:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve company workspaces",
    });
  }
};