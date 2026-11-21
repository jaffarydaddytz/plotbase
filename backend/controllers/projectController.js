import fs from "node:fs/promises";
import mongoose from "mongoose";
import {
  createProject,
  getProjectById,
  getPublicProjects,
  updateCompanyProject,
  updateCompanyProjectPricing,
  updateCompanyProjectPaymentTerms,
  updateCompanyProjectPublication,
} from "../services/projectService.js";

import Project from "../models/project.models.js";
import Plot from "../models/plot.model.js";

// ==========================================
// CREATE PROJECT
// ==========================================

// ==========================================
// CREATE COMPANY PROJECT
// ==========================================

const createProjectController = async (req, res) => {
  try {
    // ==================================
    // VERIFY COMPANY ACCESS
    // ==================================

    if (!req.user?._id || !req.company?._id) {
      return res.status(403).json({
        message: "Authorized company access is required",
      });
    }

    // ==================================
    // VALIDATE GEOJSON FILE
    // ==================================

    if (!req.file) {
      return res.status(400).json({
        message: "GeoJSON file is required",
      });
    }

    // ==================================
    // EXTRACT PROJECT INFORMATION
    // ==================================

    const { title, description, location, projectType, pricePerSqm } = req.body;

    // ==================================
    // VALIDATE PROJECT TYPE
    // ==================================

    const allowedProjectTypes = ["VIWANJA", "MASHAMBA"];

    const normalizedProjectType =
      typeof projectType === "string" ? projectType.trim().toUpperCase() : "";

    if (!allowedProjectTypes.includes(normalizedProjectType)) {
      return res.status(400).json({
        message: "Project type must be VIWANJA or MASHAMBA",
      });
    }

    // ==================================
    // VALIDATE PROJECT INFORMATION
    // ==================================

    const price = Number(pricePerSqm);

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof description !== "string" ||
      !description.trim() ||
      pricePerSqm === undefined ||
      pricePerSqm === null ||
      String(pricePerSqm).trim() === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        message: "Valid title, description and pricePerSqm are required",
      });
    }

    // ==================================
    // CREATE PROJECT
    // ==================================

    // Company ownership comes from
    // authenticated company context.

    const result = await createProject({
      companyId: req.company._id,
      createdBy: req.user._id,

      title: title.trim(),
      description: description.trim(),
      location,

      projectType: normalizedProjectType,

      pricePerSqm: price,
      geoJsonFilePath: req.file.path,
    });

    // ==================================
    // SUCCESS RESPONSE
    // ==================================

    return res.status(201).json({
      message: "Project created successfully",
      project: result.project,
      plotCount: result.plotCount,
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("Project creation error:", error);

    return res.status(500).json({
      message: "Failed to create project",
    });
  } finally {
    // ==================================
    // CLEAN UP TEMPORARY GEOJSON
    // ==================================

    if (req.file?.path) {
      try {
        await fs.rm(req.file.path, {
          force: true,
        });
      } catch (cleanupError) {
        console.error("Failed to remove temporary GeoJSON file:", cleanupError);
      }
    }
  }
};

// ==========================================
// GET PUBLIC PROJECT DETAILS
// ==========================================

const getProjectController = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        message: "Project ID is required",
      });
    }

    // Validate MongoDB ObjectId.
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const result = await getProjectById(projectId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get project error:", error);

    if (error.message === "Project not found") {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    return res.status(500).json({
      message: "Failed to retrieve project",
    });
  }
};

// ==========================================
// GET COMPANY PROJECTS
// ==========================================

const getCompanyProjectsController = async (req, res) => {
  try {
    // Company ownership has already been verified
    // by requireCompanyMembership middleware.
    const companyId = req.company?._id;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Authorized company access is required",
      });
    }

    // Retrieve only projects belonging to this company.
    // Legacy seller projects are not included.
    const projects = await Project.find({
      companyId,
    })
      .select(
        "title description location pricePerSqm status createdAt updatedAt",
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    // Calculate plot statistics in one aggregation
    // instead of querying plots separately per project.
    const projectIds = projects.map((project) => project._id);

    const plotStatistics = projectIds.length
      ? await Plot.aggregate([
          {
            $match: {
              projectId: {
                $in: projectIds,
              },
            },
          },
          {
            $group: {
              _id: "$projectId",

              plotCount: {
                $sum: 1,
              },

              availablePlots: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$status", "AVAILABLE"],
                    },
                    1,
                    0,
                  ],
                },
              },

              totalInventoryValue: {
                $sum: "$totalPrice",
              },
            },
          },
        ])
      : [];

    // Make project statistics easy to access.
    const statisticsMap = new Map(
      plotStatistics.map((item) => [String(item._id), item]),
    );

    const companyProjects = projects.map((project) => {
      const stats = statisticsMap.get(String(project._id));

      return {
        id: String(project._id),

        title: project.title,
        description: project.description,
        location: project.location,

        pricePerSqm: project.pricePerSqm,
        status: project.status,

        plotCount: stats?.plotCount || 0,
        availablePlots: stats?.availablePlots || 0,

        totalInventoryValue: stats?.totalInventoryValue || 0,

        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      total: companyProjects.length,
      projects: companyProjects,
    });
  } catch (error) {
    console.error("Get company projects error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve company projects",
    });
  }
};

// ==========================================
// GET COMPANY PROJECT DETAILS
// ==========================================

const getCompanyProjectDetailsController = async (req, res) => {
  try {
    const companyId = req.company?._id;
    const { projectId } = req.params;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Authorized company access is required",
      });
    }

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // Find the project using BOTH its ID and company ownership.
    // This prevents accessing projects owned by another company.
    const project = await Project.findOne({
      _id: projectId,
      companyId,
    }).lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Aggregate plot information.
    const statistics = await Plot.aggregate([
      {
        $match: {
          projectId: project._id,
        },
      },
      {
        $group: {
          _id: "$projectId",

          totalPlots: {
            $sum: 1,
          },

          availablePlots: {
            $sum: {
              $cond: [{ $eq: ["$status", "AVAILABLE"] }, 1, 0],
            },
          },

          reservedPlots: {
            $sum: {
              $cond: [{ $eq: ["$status", "RESERVED"] }, 1, 0],
            },
          },

          soldPlots: {
            $sum: {
              $cond: [{ $eq: ["$status", "SOLD"] }, 1, 0],
            },
          },

          totalAreaSqm: {
            $sum: "$areaSqm",
          },

          totalInventoryValue: {
            $sum: "$totalPrice",
          },
        },
      },
    ]);

    const stats = statistics[0] || {};

    return res.status(200).json({
      success: true,

      project: {
        id: String(project._id),
        companyId: String(project.companyId),

        title: project.title,
        description: project.description,
        location: project.location,

        pricePerSqm: project.pricePerSqm,
        status: project.status,

        // ==========================================
        // PROJECT PAYMENT TERMS
        // ==========================================

        paymentTerms: {
          fullPaymentEnabled: project.paymentTerms?.fullPaymentEnabled ?? true,

          installmentDurationsMonths:
            project.paymentTerms?.installmentDurationsMonths ?? [],
        },

        createdAt: project.createdAt,
        updatedAt: project.updatedAt,

        statistics: {
          totalPlots: stats.totalPlots || 0,
          availablePlots: stats.availablePlots || 0,
          reservedPlots: stats.reservedPlots || 0,
          soldPlots: stats.soldPlots || 0,
          totalAreaSqm: stats.totalAreaSqm || 0,
          totalInventoryValue: stats.totalInventoryValue || 0,
        },
      },
    });
  } catch (error) {
    console.error("Get company project details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve project details",
    });
  }
};

// ==========================================
// GET COMPANY PROJECT PLOTS
// ==========================================

const getCompanyProjectPlotsController = async (req, res) => {
  try {
    const companyId = req.company?._id;
    const { projectId } = req.params;

    // ======================================
    // COMPANY ACCESS
    // ======================================

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Authorized company access is required",
      });
    }

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // Verify that the project belongs to
    // the authenticated company.
    const project = await Project.findOne({
      _id: projectId,
      companyId,
    })
      .select("_id")
      .lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // ======================================
    // PAGINATION
    // ======================================

    const parsePositiveInteger = (value, fallback) => {
      if (value === undefined) {
        return fallback;
      }

      if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
        return null;
      }

      const number = Number(value);

      return Number.isSafeInteger(number) ? number : null;
    };

    const page = parsePositiveInteger(req.query.page, 1);

    const limit = parsePositiveInteger(req.query.limit, 20);

    if (page === null || limit === null || limit > 100) {
      return res.status(400).json({
        success: false,
        message:
          "Page must be a positive integer and limit must be between 1 and 100",
      });
    }

    const skip = (page - 1) * limit;

    if (!Number.isSafeInteger(skip)) {
      return res.status(400).json({
        success: false,
        message: "Requested page is too large",
      });
    }

    // ======================================
    // STATUS FILTER
    // ======================================

    const allowedStatuses = ["ALL", "AVAILABLE", "RESERVED", "SOLD"];

    const status = req.query.status ?? "ALL";

    if (typeof status !== "string" || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid plot status",
      });
    }

    // ======================================
    // SEARCH FILTER
    // ======================================

    const search = req.query.search ?? "";

    if (typeof search !== "string" || search.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Invalid search term",
      });
    }

    const filter = {
      projectId: project._id,
    };

    if (status !== "ALL") {
      filter.status = status;
    }

    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      // Escape regex characters so search
      // behaves as a literal text search.
      const escapedSearch = trimmedSearch.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

      filter.plotNumber = {
        $regex: escapedSearch,
        $options: "i",
      };
    }

    // ======================================
    // RETRIEVE PLOTS
    // ======================================

    const [total, plots] = await Promise.all([
      Plot.countDocuments(filter),

      Plot.find(filter)
        .select("plotNumber areaSqm totalPrice status createdAt updatedAt")
        .sort({
          plotNumber: 1,
          _id: 1,
        })
        .collation({
          locale: "en",
          numericOrdering: true,
        })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,

      plots: plots.map((plot) => ({
        id: String(plot._id),
        plotNumber: plot.plotNumber,
        areaSqm: plot.areaSqm,
        totalPrice: plot.totalPrice,
        status: plot.status,
        createdAt: plot.createdAt,
        updatedAt: plot.updatedAt,
      })),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get company project plots error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve project plots",
    });
  }
};

// ==========================================
// GET COMPANY PROJECT MAP
// ==========================================

const getCompanyProjectMapController = async (req, res) => {
  try {
    const companyId = req.company?._id;
    const { projectId } = req.params;

    // Require an authorized company.
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Authorized company access is required",
      });
    }

    // Validate project ID.
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // Verify project ownership.
    const project = await Project.findOne({
      _id: projectId,
      companyId,
    })
      .select("_id")
      .lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Prevent unrestricted geometry downloads.
    // Larger projects will require viewport-based loading.
    const MAX_MAP_PLOTS = 2000;

    const plots = await Plot.find({
      projectId: project._id,
    })
      .select("plotNumber areaSqm totalPrice status geometry coordinates")
      .limit(MAX_MAP_PLOTS + 1)
      .lean();

    if (plots.length > MAX_MAP_PLOTS) {
      return res.status(413).json({
        success: false,
        message:
          "Project exceeds the supported map size. " +
          "Viewport-based loading is required.",
      });
    }

    // Convert saved plot records into GeoJSON.
    const features = plots.map((plot) => ({
      type: "Feature",

      properties: {
        id: String(plot._id),

        plotNumber: plot.plotNumber,
        areaSqm: plot.areaSqm,
        totalPrice: plot.totalPrice,
        status: plot.status,
      },

      geometry: {
        type: plot.geometry,
        coordinates: plot.coordinates,
      },
    }));

    const geojson = {
      type: "FeatureCollection",
      features,
    };

    return res.status(200).json({
      success: true,

      projectId: String(project._id),
      plotCount: features.length,

      geojson,
    });
  } catch (error) {
    console.error("Get company project map error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve project map",
    });
  }
};
// ==========================================
// UPDATE COMPANY PROJECT
// ==========================================

const updateCompanyProjectController = async (req, res) => {
  try {
    const companyId = req.company?._id;
    const { projectId } = req.params;

    // ======================================
    // VERIFY COMPANY ACCESS
    // ======================================

    if (!req.user?._id || !companyId) {
      return res.status(403).json({
        success: false,
        message: "Authorized company access is required",
      });
    }

    // ======================================
    // VALIDATE PROJECT ID
    // ======================================

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // ======================================
    // VALIDATE REQUEST BODY
    // ======================================

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Valid project information is required",
      });
    }

    // Only these fields may be edited through
    // this endpoint.
    const allowedFields = ["title", "description", "location", "projectType"];

    const requestedFields = Object.keys(req.body);

    if (requestedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    const invalidFields = requestedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Only title, description, location and projectType can be updated",
      });
    }

    // ======================================
    // PREPARE VALIDATED UPDATES
    // ======================================

    const updates = {};

    for (const field of requestedFields) {
      const value = req.body[field];

      if (typeof value !== "string") {
        return res.status(400).json({
          success: false,
          message: `${field} must be a string`,
        });
      }

      const trimmedValue = value.trim();

      // ======================================
      // VALIDATE PROJECT TYPE
      // ======================================

      if (field === "projectType") {
        const normalizedType = trimmedValue.toUpperCase();

        if (!["VIWANJA", "MASHAMBA"].includes(normalizedType)) {
          return res.status(400).json({
            success: false,
            message: "Project type must be VIWANJA or MASHAMBA",
          });
        }
      }

      // Title and description cannot be empty.
      if ((field === "title" || field === "description") && !trimmedValue) {
        return res.status(400).json({
          success: false,
          message: `${field} cannot be empty`,
        });
      }

      // Limit excessive input.
      const maxLengths = {
        title: 160,
        description: 5000,
        location: 200,
        projectType: 20,
      };

      if (trimmedValue.length > maxLengths[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} exceeds the allowed length`,
        });
      }

      updates[field] =
        field === "projectType" ? trimmedValue.toUpperCase() : trimmedValue;
    }

    // ======================================
    // UPDATE COMPANY PROJECT
    // ======================================

    const project = await updateCompanyProject({
      companyId,
      projectId,
      updates,
    });

    // ======================================
    // HANDLE ACTIVE PROJECT TYPE RESTRICTION
    // ======================================

    if (
      !project &&
      Object.prototype.hasOwnProperty.call(updates, "projectType")
    ) {
      const existingProject = await Project.findOne({
        _id: projectId,
        companyId,
      })
        .select("status")
        .lean();

      if (existingProject?.status === "ACTIVE") {
        return res.status(409).json({
          success: false,
          message: "Unpublish this project before changing its type",
        });
      }
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",

      project: {
        id: String(project._id),
        companyId: String(project.companyId),

        title: project.title,
        description: project.description,
        location: project.location,

        // Project classification
        projectType: project.projectType || null,

        pricePerSqm: project.pricePerSqm,
        status: project.status,

        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid project information",
      });
    }

    console.error("Update company project error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update project",
    });
  }
};

// ==========================================
// UPDATE COMPANY PROJECT PRICING
// ==========================================

const updateCompanyProjectPricingController = async (req, res) => {
  try {
    const companyId = req.company?._id;
    const { projectId } = req.params;

    // ======================================
    // VERIFY COMPANY ACCESS
    // ======================================

    if (!req.user?._id || !companyId) {
      return res.status(403).json({
        success: false,
        message: "Authorized company access is required",
      });
    }

    // ======================================
    // VALIDATE PROJECT ID
    // ======================================

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // ======================================
    // VALIDATE REQUEST BODY
    // ======================================

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Valid pricing information is required",
      });
    }

    const fields = Object.keys(req.body);

    // Only pricePerSqm is accepted.
    if (fields.length !== 1 || fields[0] !== "pricePerSqm") {
      return res.status(400).json({
        success: false,
        message: "Only pricePerSqm can be updated",
      });
    }

    const { pricePerSqm } = req.body;

    if (
      typeof pricePerSqm !== "number" ||
      !Number.isFinite(pricePerSqm) ||
      pricePerSqm < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Price per sqm must be a valid non-negative number",
      });
    }

    // ======================================
    // UPDATE PRICING
    // ======================================

    const result = await updateCompanyProjectPricing({
      companyId,
      projectId,
      pricePerSqm,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      message: "Project pricing updated successfully",

      project: result.project,

      pricing: {
        pricePerSqm: result.project.pricePerSqm,

        availablePlotsMatched: result.availablePlotsMatched,

        availablePlotsUpdated: result.availablePlotsUpdated,
      },
    });
  } catch (error) {
    // Business-rule conflict.
    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid project pricing",
      });
    }

    // Concurrent pricing or reservation writes
    // may produce a transaction conflict.
    if (
      error.code === 112 ||
      error.hasErrorLabel?.("TransientTransactionError")
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Pricing update conflicted with another operation. Please retry.",
      });
    }

    console.error("Update company project pricing error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update project pricing",
    });
  }
};

// ==========================================
// UPDATE COMPANY PROJECT PAYMENT TERMS
// ==========================================

const updateCompanyProjectPaymentTermsController = async (req, res) => {
  try {
    // ==================================
    // VERIFY COMPANY ACCESS
    // ==================================

    const companyId = req.company?._id;
    const { projectId } = req.params;

    if (!req.user?._id || !companyId) {
      return res.status(403).json({
        success: false,
        message: "Authorized company access is required",
      });
    }

    // ==================================
    // VALIDATE PROJECT ID
    // ==================================

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // ==================================
    // VALIDATE REQUEST BODY
    // ==================================

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Valid payment terms are required",
      });
    }

    const fields = Object.keys(req.body);

    const allowedFields = ["fullPaymentEnabled", "installmentDurationsMonths"];

    if (
      fields.length !== 2 ||
      !fields.every((field) => allowedFields.includes(field))
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only fullPaymentEnabled and installmentDurationsMonths are accepted",
      });
    }

    const { fullPaymentEnabled, installmentDurationsMonths } = req.body;

    // ==================================
    // UPDATE PAYMENT TERMS
    // ==================================

    const project = await updateCompanyProjectPaymentTerms({
      companyId,
      projectId,
      fullPaymentEnabled,
      installmentDurationsMonths,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // ==================================
    // SUCCESS RESPONSE
    // ==================================

    return res.status(200).json({
      success: true,
      message: "Payment terms updated successfully",
      paymentTerms: project.paymentTerms,
    });
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 409) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid payment terms",
      });
    }

    console.error("Update company payment terms error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update payment terms",
    });
  }
};

// ==========================================
// UPDATE COMPANY PROJECT PUBLICATION
// ==========================================

const updateCompanyProjectPublicationController = async (req, res) => {
  try {
    // ==================================
    // COMPANY AUTHORIZATION
    // ==================================

    const companyId = req.company?._id;
    const { projectId } = req.params;

    if (!req.user?._id || !companyId) {
      return res.status(403).json({
        success: false,
        message: "Authorized company access is required",
      });
    }

    // ==================================
    // VALIDATE PROJECT ID
    // ==================================

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // ==================================
    // VALIDATE REQUEST BODY
    // ==================================

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Valid publication information is required",
      });
    }

    const fields = Object.keys(req.body);

    if (fields.length !== 1 || fields[0] !== "action") {
      return res.status(400).json({
        success: false,
        message: "Only a publication action is allowed",
      });
    }

    const { action } = req.body;

    if (action !== "PUBLISH" && action !== "UNPUBLISH") {
      return res.status(400).json({
        success: false,
        message: "Action must be PUBLISH or UNPUBLISH",
      });
    }

    // ==================================
    // UPDATE PUBLICATION
    // ==================================

    const result = await updateCompanyProjectPublication({
      companyId,
      projectId,
      action,
    });

    if (!result.success) {
      return res.status(result.statusCode).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Project publication error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update project publication",
    });
  }
};

// ==========================================
// GET PUBLIC PROJECT LISTINGS
// ==========================================

const getPublicProjectsController = async (req, res) => {
  try {
    // ==================================
    // VALIDATE PROJECT TYPE
    // ==================================

    const projectType =
      typeof req.query.projectType === "string"
        ? req.query.projectType.trim().toUpperCase()
        : "";

    if (!["VIWANJA", "MASHAMBA"].includes(projectType)) {
      return res.status(400).json({
        success: false,
        message: "Project type must be VIWANJA or MASHAMBA",
      });
    }

    // ==================================
    // PAGINATION
    // ==================================

    const page = req.query.page === undefined ? 1 : Number(req.query.page);

    const limit = req.query.limit === undefined ? 12 : Number(req.query.limit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 24 ||
      !Number.isSafeInteger((page - 1) * limit)
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 24",
      });
    }

    // ==================================
    // RETRIEVE PUBLISHED PROJECTS
    // ==================================

    const result = await getPublicProjects({
      projectType,
      page,
      limit,
    });

    // ==================================
    // RESPONSE
    // ==================================

    return res.status(200).json({
      success: true,

      projectType,

      projects: result.projects,

      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error("Public projects retrieval error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve public projects",
    });
  }
};

export {
  createProjectController,
  getProjectController,
  getPublicProjectsController,
  getCompanyProjectsController,
  getCompanyProjectDetailsController,
  getCompanyProjectPlotsController,
  getCompanyProjectMapController,
  updateCompanyProjectController,
  updateCompanyProjectPricingController,
  updateCompanyProjectPublicationController,
  updateCompanyProjectPaymentTermsController,
};
