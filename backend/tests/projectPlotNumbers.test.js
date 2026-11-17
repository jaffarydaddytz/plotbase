import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import mongoose from "mongoose";

import Project from "../models/project.models.js";
import Plot from "../models/plot.model.js";

import { createProject } from "../services/projectService.js";

// ==========================================
// TEST HELPERS
// ==========================================

const createFeature = (properties) => ({
  type: "Feature",
  properties,
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [39.25, -6.8],
        [39.2502, -6.8],
        [39.2502, -6.8002],
        [39.25, -6.8002],
        [39.25, -6.8],
      ],
    ],
  },
});

// ==========================================
// TEST: PROJECT PLOT NUMBERS
// ==========================================

test(
  "Preserves imported plot numbers and generates collision-free fallbacks",
  async () => {
    const directory = await fs.mkdtemp(
      path.join(tmpdir(), "plotbase-project-plots-")
    );

    const geoJsonFilePath = path.join(
      directory,
      "plots.geojson"
    );

    // Save original database methods.
    const originalStartSession = mongoose.startSession;
    const originalCreate = Project.create;
    const originalInsertMany = Plot.insertMany;

    let insertedPlots = [];
    let transactionExecuted = false;
    let sessionEnded = false;

    const fakeSession = {
      withTransaction: async (callback) => {
        transactionExecuted = true;
        return callback();
      },

      endSession: async () => {
        sessionEnded = true;
      },
    };

    try {
      // ==========================================
      // PREPARE TEST GEOJSON
      // ==========================================

      const geoJson = {
        type: "FeatureCollection",
        features: [
          createFeature({
            plotNumber: "A-105",
            legalArea: 500,
          }),

          createFeature({
            plotNumber: "102",
            legalArea: 600,
          }),

          createFeature({
            legalArea: 700,
          }),

          createFeature({
            plotNumber: "PLOT-2",
            legalArea: 800,
          }),

          createFeature({
            legalArea: 900,
          }),
        ],
      };

      await fs.writeFile(
        geoJsonFilePath,
        JSON.stringify(geoJson),
        "utf8"
      );

      // ==========================================
      // MOCK DATABASE OPERATIONS
      // ==========================================

      mongoose.startSession = async () => fakeSession;

      Project.create = async (documents, options) => {
        assert.equal(options.session, fakeSession);

        return [
          {
            _id: new mongoose.Types.ObjectId(),
            ...documents[0],
          },
        ];
      };

      Plot.insertMany = async (documents, options) => {
        assert.equal(options.session, fakeSession);

        insertedPlots = documents;

        return documents;
      };

      // ==========================================
      // EXECUTE PROJECT CREATION
      // ==========================================

      const result = await createProject({
        companyId: new mongoose.Types.ObjectId(),
        createdBy: new mongoose.Types.ObjectId(),

        title: "Plot Number Test Project",
        description: "Testing imported plot identifiers",
        location: "Dar es Salaam",

        pricePerSqm: 5000,
        geoJsonFilePath,
      });

      // ==========================================
      // VERIFY PROJECT
      // ==========================================

      assert.equal(result.plotCount, 5);

      assert.equal(result.project.status, "DRAFT");

      // ==========================================
      // VERIFY PLOT NUMBERS
      // ==========================================

      const plotNumbers = insertedPlots.map(
        (plot) => plot.plotNumber
      );

      assert.deepEqual(plotNumbers, [
        "A-105",
        "102",
        "PLOT-1",
        "PLOT-2",
        "PLOT-3",
      ]);

      // All identifiers must be unique.
      assert.equal(
        new Set(
          plotNumbers.map((number) => number.toLowerCase())
        ).size,
        plotNumbers.length
      );

      // ==========================================
      // VERIFY PRICING
      // ==========================================

      assert.deepEqual(
        insertedPlots.map((plot) => plot.totalPrice),
        [
          2500000,
          3000000,
          3500000,
          4000000,
          4500000,
        ]
      );

      // ==========================================
      // VERIFY TRANSACTION
      // ==========================================

      assert.equal(transactionExecuted, true);
      assert.equal(sessionEnded, true);

      // Verify plot lifecycle status.
      assert.equal(
        insertedPlots.every(
          (plot) => plot.status === "AVAILABLE"
        ),
        true
      );
    } finally {
      // Restore original database methods.
      mongoose.startSession = originalStartSession;
      Project.create = originalCreate;
      Plot.insertMany = originalInsertMany;

      // Remove temporary test files.
      await fs.rm(directory, {
        recursive: true,
        force: true,
      });
    }
  }
);