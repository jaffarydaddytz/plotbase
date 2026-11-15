import Project from "../models/project.models.js";
import Plot from "../models/plot.model.js";
import readGeoJsonFile from "./geojsonService.js";
import mongoose from "mongoose";

const createProject = async ({
    companyId,
    createdBy,
    title,
    description,
    location,
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
                        pricePerSqm,
                        status: "DRAFT"
                    }
                ],
                { session }
            );

            project = createdProjects[0];

            // Prepare associated plots.
            const plotDocuments = plots.map((plot, index) => ({
                projectId: project._id,
                plotNumber: `PLOT-${index + 1}`,
                areaSqm: plot.areaSqm,
                totalPrice: plot.areaSqm * pricePerSqm,
                status: "AVAILABLE",
                geometry: plot.geometry,
                coordinates: plot.coordinates
            }));

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
            pricePerSqm: project.pricePerSqm,
            status: project.status
        },

        plots: geoJson
    };
};

export {
    createProject,
    getProjectById
};