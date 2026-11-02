import Company from "../models/company.model.js";

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