import fs from "node:fs/promises";
import mongoose from "mongoose";

import {
    createProject,
    getProjectById
} from "../services/projectService.js";

// ==========================================
// CREATE PROJECT
// ==========================================

const createProjectController = async (req, res) => {
    try {
        // Require authenticated user and authorized company.
        if (!req.user?._id || !req.company?._id) {
            return res.status(403).json({
                message: "Authorized company access is required"
            });
        }

        // GeoJSON file is required.
        if (!req.file) {
            return res.status(400).json({
                message: "GeoJSON file is required"
            });
        }

        const {
            title,
            description,
            location,
            pricePerSqm
        } = req.body;

        const price = Number(pricePerSqm);

        // Validate project information.
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
                message:
                    "Valid title, description and pricePerSqm are required"
            });
        }

        // Ownership comes from authenticated company context.
        const result = await createProject({
            companyId: req.company._id,
            createdBy: req.user._id,
            title: title.trim(),
            description: description.trim(),
            location,
            pricePerSqm: price,
            geoJsonFilePath: req.file.path
        });

        return res.status(201).json({
            message: "Project created successfully",
            project: result.project,
            plotCount: result.plotCount
        });

    } catch (error) {
        // Return validation errors.
        if (error.statusCode === 400) {
            return res.status(400).json({
                message: error.message
            });
        }

        // Handle unexpected server errors.
        console.error("Project creation error:", error);

        return res.status(500).json({
            message: "Failed to create project"
        });

    } finally {
        // Always remove temporary uploaded GeoJSON files.
        if (req.file?.path) {
            try {
                await fs.rm(req.file.path, {
                    force: true
                });
            } catch (cleanupError) {
                console.error(
                    "Failed to remove temporary GeoJSON file:",
                    cleanupError
                );
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
                message: "Project ID is required"
            });
        }

        // Validate MongoDB ObjectId.
        if (!mongoose.isValidObjectId(projectId)) {
            return res.status(400).json({
                message: "Invalid project ID"
            });
        }

        const result = await getProjectById(projectId);

        return res.status(200).json(result);

    } catch (error) {
        console.error("Get project error:", error);

        if (error.message === "Project not found") {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        return res.status(500).json({
            message: "Failed to retrieve project"
        });
    }
};

export {
    createProjectController,
    getProjectController
};