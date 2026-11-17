import express from "express";

import {
  getProjectController,
  getPublicProjectsController,
} from "../controllers/projectController.js";

import {
  getPublicProjectThumbnailController,
} from "../controllers/publicProjectThumbnail.controller.js";

const router = express.Router();

// ==========================================
// PUBLIC PROJECT DISCOVERY
// ==========================================

// GET /api/project?projectType=VIWANJA
// GET /api/project?projectType=MASHAMBA

router.get(
  "/",
  getPublicProjectsController
);

// ==========================================
// PUBLIC PROJECT MAP THUMBNAIL
// ==========================================

// GET /api/project/:projectId/thumbnail.svg

router.get(
  "/:projectId/thumbnail.svg",
  getPublicProjectThumbnailController
);

// ==========================================
// PUBLIC PROJECT DETAILS
// ==========================================

// GET /api/project/:projectId

router.get(
  "/:projectId",
  getProjectController
);

export default router;