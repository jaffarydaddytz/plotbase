import {
    createProject,
    getProjectById
} from "../services/projectService.js";

const createProjectController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "GeoJSON file is required"
            });
        }

        const {
            userId,
            title,
            description,
            location,
            pricePerSqm
        } = req.body;

        if (!userId || !title || !description || !pricePerSqm) {
            return res.status(400).json({
                message: "userId, title, description and pricePerSqm are required"
            });
        }

        const result = await createProject({
            userId,
            title,
            description,
            location,
            pricePerSqm: Number(pricePerSqm),
            geoJsonFilePath: req.file.path
        });

        return res.status(201).json({
            message: "Project created successfully",
            project: result.project,
            plotCount: result.plotCount
        });

    } catch (error) {
        console.error("Project creation error:", error);

        return res.status(500).json({
            message: "Failed to create project"
        });
    }
};

const getProjectController = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({
                message: "Project ID is required"
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