import Project from "../models/project.models.js";
import Plot from "../models/plot.model.js";
import readGeoJsonFile from "./geojsonService.js";

const createProject = async ({
    userId,
    title,
    description,
    location,
    pricePerSqm,
    geoJsonFilePath
}) => {
    const plots = await readGeoJsonFile(geoJsonFilePath);

    const project = await Project.create({
        userId,
        title,
        description,
        location,
        pricePerSqm
    });

    const plotDocuments = plots.map((plot, index) => ({
        projectId: project._id,
        plotNumber: `PLOT-${index + 1}`,
        areaSqm: plot.areaSqm,
        totalPrice: plot.areaSqm * pricePerSqm,
        status: "AVAILABLE",
        geometry: plot.geometry,
        coordinates: plot.coordinates
    }));

    await Plot.insertMany(plotDocuments);

    return {
        project,
        plotCount: plotDocuments.length
    };
};

const getProjectById = async (projectId) => {
    const project = await Project.findById(projectId).lean();

    if (!project) {
        throw new Error("Project not found");
    }

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