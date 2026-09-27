import express from "express";
import geoJsonUploadMiddleware from "../middlewares/geoJsonUploadMiddleware.js";
import uploadGeoJson from "../controllers/projectController.js";

const projectRouter = express.Router();

projectRouter.post(
    "/",
    geoJsonUploadMiddleware.single("geojson"),
    uploadGeoJson
);

export default projectRouter;