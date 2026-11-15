import "dotenv/config";

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import mongoose from "mongoose";

import Project from "../models/project.models.js";
import Plot from "../models/plot.model.js";
import { createProject } from "../services/projectService.js";

test("Rollback project creation when plot insertion fails", async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  const testId = randomUUID();
  const title = `ROLLBACK-TEST-${testId}`;

  const companyId = new mongoose.Types.ObjectId();
  const createdBy = new mongoose.Types.ObjectId();

  const geoJsonFilePath = path.join(
    tmpdir(),
    `plotbase-rollback-${testId}.geojson`
  );

  const originalInsertMany = Plot.insertMany;
  let insertionAttempted = false;

  const geoJson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          plotNumber: "TEST-001",
          legalArea: 500
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [39.25, -6.8],
            [39.2502, -6.8],
            [39.2502, -6.8002],
            [39.25, -6.8002],
            [39.25, -6.8]
          ]]
        }
      }
    ]
  };

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    await fs.writeFile(
      geoJsonFilePath,
      JSON.stringify(geoJson),
      "utf-8"
    );

    // Simulate database insertion failure.
    Plot.insertMany = async () => {
      insertionAttempted = true;
      throw new Error("Simulated plot insertion failure");
    };

    await assert.rejects(
      () => createProject({
        companyId,
        createdBy,
        title,
        description: "Testing transaction rollback",
        location: "Dar es Salaam",
        pricePerSqm: 5000,
        geoJsonFilePath
      }),
      /Simulated plot insertion failure/
    );

    assert.equal(insertionAttempted, true);

    // Verify the project was rolled back.
    const project = await Project.findOne({
      companyId,
      title
    }).lean();

    assert.equal(
      project,
      null,
      "Project should not exist after rollback"
    );

    console.log("PASS: Transaction rollback verified");

  } finally {
    Plot.insertMany = originalInsertMany;

    // Cleanup is restricted to this test's unique records.
    if (mongoose.connection.readyState === 1) {
      try {
        const leftovers = await Project.find({
          companyId,
          title
        }).select("_id").lean();

        const ids = leftovers.map(item => item._id);

        if (ids.length > 0) {
          await Plot.deleteMany({
            projectId: { $in: ids }
          });

          await Project.deleteMany({
            companyId,
            title
          });
        }
      } finally {
        await mongoose.disconnect();
      }
    } else {
      await mongoose.disconnect();
    }

    await fs.rm(geoJsonFilePath, {
      force: true
    });
  }
});
