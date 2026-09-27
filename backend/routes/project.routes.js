import express from "express";
import geoJsonUploadMiddleware from "../middlewares/geoJsonUploadMiddleware.js";

import {
    createProjectController,
    getProjectController
} from "../controllers/projectController.js";

const router = express.Router();

router.post(
    "/",
    geoJsonUploadMiddleware.single("geojson"),
    createProjectController
);

router.get(
    "/:projectId",
    getProjectController
);

export default router;