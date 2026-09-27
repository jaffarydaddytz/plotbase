import Project from "../models/project.models.js";
import Plot from "../models/";
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

export default createProject;