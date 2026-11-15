import express from "express";

import {
  getProjectController
} from "../controllers/projectController.js";

const router = express.Router();

// Public project retrieval.
// Only ACTIVE projects are returned by the project service.
router.get(
  "/:projectId",
  getProjectController
);

export default router;
