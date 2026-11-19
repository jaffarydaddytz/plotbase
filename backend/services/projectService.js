import Project from "../models/project.models.js";
import Plot from "../models/plot.model.js";
import readGeoJsonFile from "./geojsonService.js";
import mongoose from "mongoose";
import Company from "../models/company.model.js";

const createProject = async ({
    companyId,
    createdBy,
    title,
    description,
    location,
    projectType,
    pricePerSqm,
    geoJsonFilePath
}) => {

    // Process GeoJSON before starting the transaction.
    const plots = await readGeoJsonFile(geoJsonFilePath);

    const session = await mongoose.startSession();

    try {
        let project;

        await session.withTransaction(async () => {

            // Create project within the transaction.
const createdProjects = await Project.create(
    [
        {
            companyId,
            createdBy,

            title,
            description,
            location,

            projectType,

            pricePerSqm,

            status: "DRAFT"
        }
    ],
    { session }
);

            project = createdProjects[0];

// Reserve all imported plot numbers before generating fallbacks.
const usedPlotNumbers = new Set(
    plots
        .filter((plot) => plot.plotNumber)
        .map((plot) => plot.plotNumber.toLowerCase())
);

let nextGeneratedNumber = 1;

// Prepare associated plots.
const plotDocuments = plots.map((plot) => {

    // Preserve the imported plot number when available.
    let plotNumber = plot.plotNumber;

    // Generate a unique fallback when no number was imported.
    if (!plotNumber) {

        do {
            plotNumber = `PLOT-${nextGeneratedNumber}`;
            nextGeneratedNumber++;
        } while (
            usedPlotNumbers.has(plotNumber.toLowerCase())
        );

        usedPlotNumbers.add(plotNumber.toLowerCase());
    }

    return {
        projectId: project._id,
        plotNumber,
        areaSqm: plot.areaSqm,
        totalPrice: plot.areaSqm * pricePerSqm,
        status: "AVAILABLE",
        geometry: plot.geometry,
        coordinates: plot.coordinates
    };
});

            // Insert plots within the same transaction.
            await Plot.insertMany(
                plotDocuments,
                { session }
            );

        });

        return {
            project,
            plotCount: plots.length
        };

    } finally {

        // Always close the MongoDB session.
        await session.endSession();

    }
};

const getProjectById = async (projectId) => {
    // Public requests can retrieve ACTIVE projects only.
    // Draft and inactive projects must remain private.
    const project = await Project.findOne({
        _id: projectId,
        status: "ACTIVE"
    }).lean();

    // Return 404 if the project does not exist
    // or is not publicly available.
    if (!project) {
        throw new Error("Project not found");
    }

    // ==========================================
// VERIFY PUBLIC COMPANY PROJECT VISIBILITY
// ==========================================

// Preserve legacy project compatibility.
// New company projects require an approved
// company and a valid project classification.

if (project.companyId) {

    const validProjectType = [
        "VIWANJA",
        "MASHAMBA"
    ].includes(project.projectType);

    if (!validProjectType) {
        const error = new Error("Project not found");
        error.statusCode = 404;
        throw error;
    }

    const approvedCompany = await Company.exists({
        _id: project.companyId,
        verificationStatus: "APPROVED"
    });

    if (!approvedCompany) {
        const error = new Error("Project not found");
        error.statusCode = 404;
        throw error;
    }
}

    // Retrieve plots belonging to this project.
    const plots = await Plot.find({
        projectId: project._id
    }).lean();

    const geoJson = {
        type: "FeatureCollection",
        features: plots.map((plot) => ({
            type: "Feature",

            properties: {
                id: plot._id,
                plotNumber: plot.plotNumber,
                areaSqm: plot.areaSqm,
                totalPrice: plot.totalPrice,
                status: plot.status
            },

            geometry: {
                type: plot.geometry,
                coordinates: plot.coordinates
            }
        }))
    };

return {
    project: {
        id: project._id,
        title: project.title,
        description: project.description,
        location: project.location,
        projectType: project.projectType || null,
        pricePerSqm: project.pricePerSqm,
        status: project.status
    },

    plots: geoJson
};
};


// ==========================================
// UPDATE COMPANY PROJECT INFORMATION
// ==========================================

// ==========================================
// UPDATE COMPANY PROJECT INFORMATION
// ==========================================

const updateCompanyProject = async ({
    companyId,
    projectId,
    updates
}) => {

    // ======================================
    // ENFORCE COMPANY OWNERSHIP
    // ======================================

    const filter = {
        _id: projectId,
        companyId
    };

    // ======================================
    // RESTRICT PROJECT TYPE CHANGES
    // ======================================

    // Project type can only be changed when
    // the project is DRAFT or INACTIVE.
    //
    // Including status in the update filter
    // ensures the restriction is atomic.

    if (
        Object.prototype.hasOwnProperty.call(
            updates,
            "projectType"
        )
    ) {
        filter.status = {
            $in: ["DRAFT", "INACTIVE"]
        };
    }

    // ======================================
    // UPDATE PROJECT
    // ======================================

    const project = await Project.findOneAndUpdate(
        filter,
        {
            $set: updates
        },
        {
            new: true,
            runValidators: true
        }
    )
        .select(
            "companyId title description location projectType pricePerSqm status createdAt updatedAt"
        )
        .lean();

    return project;
};





// ==========================================
// UPDATE COMPANY PROJECT PRICING
// ==========================================

const updateCompanyProjectPricing = async ({
    companyId,
    projectId,
    pricePerSqm
}) => {

    // Validate the authoritative pricing value.
    if (
        typeof pricePerSqm !== "number" ||
        !Number.isFinite(pricePerSqm) ||
        pricePerSqm < 0
    ) {
        const error = new Error(
            "Price per sqm must be a valid non-negative number"
        );

        error.statusCode = 400;
        throw error;
    }

    const session = await mongoose.startSession();

    try {
        let result = null;

        await session.withTransaction(async () => {

            // ======================================
            // UPDATE PROJECT PRICING
            // ======================================

            // Company ownership is enforced directly
            // in the database query.
            //
            // Updating this record within the
            // transaction also coordinates concurrent
            // project pricing updates.

// ======================================
// ENFORCE PRICING RULES AT DATABASE LEVEL
// ======================================

const pricingFilter = {
    _id: projectId,
    companyId
};

// Zero pricing is permitted only for
// DRAFT and INACTIVE projects.

if (pricePerSqm === 0) {
    pricingFilter.status = {
        $in: ["DRAFT", "INACTIVE"]
    };
}

const project = await Project.findOneAndUpdate(
    pricingFilter,
                {
                    $set: {
                        pricePerSqm
                    }
                },
                {
                    new: true,
                    runValidators: true,
                    session
                }
            );

if (!project) {

    // Distinguish a missing project from
    // an ACTIVE project rejecting zero pricing.

    if (pricePerSqm === 0) {

        const activeProject = await Project.exists({
            _id: projectId,
            companyId,
            status: "ACTIVE"
        }).session(session);

        if (activeProject) {
            const error = new Error(
                "ACTIVE projects must have a positive price per sqm"
            );

            error.statusCode = 409;
            throw error;
        }
    }

    result = null;
    return;
}

            // ======================================
            // RECALCULATE AVAILABLE PLOTS
            // ======================================

            // MongoDB aggregation update pipeline.
            //
            // Each plot's price is calculated using
            // its own saved areaSqm.
            //
            // RESERVED and SOLD plots are excluded.

const plotUpdate = await Plot.updateMany(
    {
        projectId: project._id,
        status: "AVAILABLE"
    },
    [
        {
            $set: {
                totalPrice: {
                    $multiply: [
                        "$areaSqm",
                        pricePerSqm
                    ]
                }
            }
        }
    ],
    {
        session,
        updatePipeline: true
    }
);

            // ======================================
            // PREPARE RESPONSE
            // ======================================

            result = {
                project: {
                    id: String(project._id),
                    companyId: String(project.companyId),

                    title: project.title,
                    pricePerSqm: project.pricePerSqm,
                    status: project.status,

                    updatedAt: project.updatedAt
                },

                availablePlotsMatched:
                    plotUpdate.matchedCount,

                availablePlotsUpdated:
                    plotUpdate.modifiedCount
            };
        });

        return result;

    } finally {

        // Always close the MongoDB session.
        await session.endSession();
    }
};

// ==========================================
// COMPANY PROJECT PUBLICATION MANAGEMENT
// ==========================================

const updateCompanyProjectPublication = async ({
    companyId,
    projectId,
    action
}) => {

    // ======================================
    // VERIFY PROJECT OWNERSHIP
    // ======================================

    const project = await Project.findOne({
        _id: projectId,
        companyId
    }).lean();

    if (!project) {
        return {
            success: false,
            statusCode: 404,
            message: "Project not found"
        };
    }

    // ==========================================
// VALIDATE PUBLIC COMPANY PROJECT VISIBILITY
// ==========================================

// Company projects must belong to approved
// real-estate companies and have a valid type.
//
// Legacy projects are preserved during migration.

    // ======================================
    // DETERMINE STATUS TRANSITION
    // ======================================

    const isPublishing = action === "PUBLISH";

    const allowedStatuses = isPublishing
        ? ["DRAFT", "INACTIVE"]
        : ["ACTIVE"];

    const nextStatus = isPublishing
        ? "ACTIVE"
        : "INACTIVE";

    if (!allowedStatuses.includes(project.status)) {
        return {
            success: false,
            statusCode: 409,
            message: isPublishing
                ? "Only DRAFT or INACTIVE projects can be published"
                : "Only ACTIVE projects can be unpublished"
        };
    }

    // ======================================
    // VALIDATE BEFORE PUBLISHING
    // ======================================

    if (isPublishing) {

        const missingFields = [];

        // ======================================
// VALIDATE PROJECT TYPE
// ======================================

if (
    !["VIWANJA", "MASHAMBA"].includes(
        project.projectType
    )
) {
    missingFields.push(
        "Project type (Viwanja or Mashamba)"
    );
}

        if (!project.title?.trim()) {
            missingFields.push("Project name");
        }

        if (!project.description?.trim()) {
            missingFields.push("Project description");
        }

        if (!project.location?.trim()) {
            missingFields.push("Project location");
        }

        if (
            !Number.isFinite(project.pricePerSqm) ||
            project.pricePerSqm <= 0
        ) {
            missingFields.push("Valid project pricing");
        }

        if (missingFields.length > 0) {
            return {
                success: false,
                statusCode: 422,
                message:
                    "Complete the project information before publishing",
                missingFields
            };
        }

        // ==================================
        // VALIDATE PLOT INVENTORY
        // ==================================

        const availablePlots = await Plot.countDocuments({
            projectId: project._id,
            status: "AVAILABLE"
        });

        if (availablePlots === 0) {
            return {
                success: false,
                statusCode: 422,
                message:
                    "A project must have at least one AVAILABLE plot before publishing"
            };
        }

        // Verify all AVAILABLE plots have
        // valid areas and positive prices.

        const validAvailablePlots = await Plot.countDocuments({
            projectId: project._id,
            status: "AVAILABLE",
            areaSqm: { $gt: 0 },
            totalPrice: { $gt: 0 }
        });

        if (validAvailablePlots !== availablePlots) {
            return {
                success: false,
                statusCode: 422,
                message:
                    "Some AVAILABLE plots have invalid areas or prices"
            };
        }
    }

    // ======================================
    // ATOMIC STATUS UPDATE
    // ======================================

    // The previous status is part of the query.
    // This prevents stale requests from overwriting
    // another publication status change.

    const updatedProject = await Project.findOneAndUpdate(
        {
            _id: projectId,
            companyId,
            status: project.status
        },
        {
            $set: {
                status: nextStatus
            }
        },
        {
            new: true,
            runValidators: true
        }
    )
.select(
    "companyId title description location projectType pricePerSqm status createdAt updatedAt"
)
        .lean();

    if (!updatedProject) {
        return {
            success: false,
            statusCode: 409,
            message:
                "Project status changed during this operation. Refresh and try again."
        };
    }

    return {
        success: true,

        message: isPublishing
            ? "Project published successfully"
            : "Project unpublished successfully",

        project: {
            id: String(updatedProject._id),
            companyId: String(updatedProject.companyId),

            title: updatedProject.title,
            description: updatedProject.description,
            location: updatedProject.location,

            projectType: updatedProject.projectType || null,

            pricePerSqm: updatedProject.pricePerSqm,
            status: updatedProject.status,

            createdAt: updatedProject.createdAt,
            updatedAt: updatedProject.updatedAt
        },

        publication: {
            previousStatus: project.status,
            currentStatus: updatedProject.status
        }
    };
};

// ==========================================
// GET PUBLIC COMPANY PROJECTS
// ==========================================

const getPublicProjects = async ({
    projectType,
    page = 1,
    limit = 12
}) => {

    const skip = (page - 1) * limit;

    const results = await Project.aggregate([
        // ==================================
        // ONLY PUBLISHED COMPANY PROJECTS
        // ==================================

        {
            $match: {
                status: "ACTIVE",
                projectType,
                companyId: {
                    $type: "objectId"
                }
            }
        },

        // ==================================
        // JOIN PROJECTS WITH COMPANIES
        // ==================================

        {
            $lookup: {
                from: Company.collection.name,
                localField: "companyId",
                foreignField: "_id",
                as: "company"
            }
        },

        // ==================================
        // APPROVED COMPANIES ONLY
        // ==================================

        {
            $match: {
                "company.verificationStatus": "APPROVED"
            }
        },

        // ==================================
        // NEWEST PROJECTS FIRST
        // ==================================

        {
            $sort: {
                createdAt: -1,
                _id: -1
            }
        },

        // ==================================
        // PAGINATION AND RESPONSE
        // ==================================

        {
            $facet: {
                projects: [
                    {
                        $skip: skip
                    },
                    {
                        $limit: limit
                    },
                    {
                        $project: {
                            _id: 0,

                            id: {
                                $toString: "$_id"
                            },

                            companyId: {
                                $toString: "$companyId"
                            },

                            companyName: {
                                $arrayElemAt: [
                                    "$company.name",
                                    0
                                ]
                            },

                            title: 1,
                            description: 1,
                            location: 1,
                            projectType: 1,
                            pricePerSqm: 1,
                            status: 1,
                            createdAt: 1,
                            updatedAt: 1
                        }
                    }
                ],

                metadata: [
                    {
                        $count: "total"
                    }
                ]
            }
        }
    ]);

    const result = results[0] || {};

    return {
        projects: result.projects || [],
        total: result.metadata?.[0]?.total || 0
    };
};

export {
    createProject,
    getProjectById,
    getPublicProjects,
    updateCompanyProject,
    updateCompanyProjectPricing,
    updateCompanyProjectPublication
};