import "dotenv/config";

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import Project from "../models/project.models.js";
import Plot from "../models/plot.model.js";

import {
  updateCompanyProjectPricing,
} from "../services/projectService.js";

// ==========================================
// TEST CONFIGURATION
// ==========================================

// Use the existing Plotbase development database.
// Tests create temporary projects and plots.
//
// Do not run against a production database.

const testUri = process.env.MONGODB_URI;

// ==========================================
// TEST PLOT GEOMETRY
// ==========================================

const coordinates = [
  [
    [39.25, -6.8],
    [39.2502, -6.8],
    [39.2502, -6.8002],
    [39.25, -6.8002],
    [39.25, -6.8],
  ],
];

// ==========================================
// COMPANY PROJECT PRICING TESTS
// ==========================================

test(
  "Company project pricing rules and transaction safety",
  async (t) => {
    // ======================================
    // VERIFY DATABASE CONFIGURATION
    // ======================================

    if (!testUri) {
      throw new Error("MONGODB_URI is missing");
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Pricing tests cannot run in production mode"
      );
    }

    if (process.env.ALLOW_EXISTING_DB_TESTS !== "YES") {
      throw new Error(
        "Set ALLOW_EXISTING_DB_TESTS=YES to run tests against the existing development database"
      );
    }

    // ======================================
    // TEST IDENTIFIERS
    // ======================================

    const companyId = new mongoose.Types.ObjectId();

    const otherCompanyId =
      new mongoose.Types.ObjectId();

    const createdBy = new mongoose.Types.ObjectId();

    const testProjectIds = [];

    // ======================================
    // CREATE TEMPORARY TEST PROJECT
    // ======================================

    async function createFixture(status) {
      const projectId = new mongoose.Types.ObjectId();

      testProjectIds.push(projectId);

      const project = await Project.create({
        _id: projectId,

        companyId,
        createdBy,

        title: `PRICING-TEST-${randomUUID()}`,

        description:
          "Temporary automated pricing verification project",

        location: "Dar es Salaam",

        projectType: "VIWANJA",

        pricePerSqm: 5000,

        status,
      });

      // Create three test plots.
      // Each has a different availability status.

      await Plot.insertMany([
        {
          projectId,

          plotNumber: "TEST-001",

          areaSqm: 500,

          totalPrice: 2500000,

          status: "AVAILABLE",

          geometry: "Polygon",

          coordinates,
        },

        {
          projectId,

          plotNumber: "TEST-002",

          areaSqm: 600,

          totalPrice: 3000000,

          status: "RESERVED",

          geometry: "Polygon",

          coordinates,
        },

        {
          projectId,

          plotNumber: "TEST-003",

          areaSqm: 700,

          totalPrice: 3500000,

          status: "SOLD",

          geometry: "Polygon",

          coordinates,
        },
      ]);

      return project;
    }

    // ======================================
    // CONNECT TO DATABASE
    // ======================================

    try {
      await mongoose.connect(testUri);

      // Create temporary projects for testing.

      const activeProject =
        await createFixture("ACTIVE");

      const draftProject =
        await createFixture("DRAFT");

      const inactiveProject =
        await createFixture("INACTIVE");

      // ======================================
      // TEST 1: ACTIVE PROJECT + ZERO PRICE
      // ======================================

      await t.test(
        "ACTIVE project rejects zero pricing",
        async () => {
          await assert.rejects(
            () =>
              updateCompanyProjectPricing({
                companyId,

                projectId: activeProject._id,

                pricePerSqm: 0,
              }),

            (error) => {
              assert.equal(error.statusCode, 409);

              return true;
            }
          );

          // Verify existing pricing was preserved.

          const savedProject =
            await Project.findById(
              activeProject._id
            );

          assert.equal(
            savedProject.pricePerSqm,
            5000
          );

          const availablePlot = await Plot.findOne({
            projectId: activeProject._id,
            status: "AVAILABLE",
          });

          assert.equal(
            availablePlot.totalPrice,
            2500000
          );
        }
      );

      // ======================================
      // TEST 2: DRAFT PROJECT + ZERO PRICE
      // ======================================

      await t.test(
        "DRAFT project allows zero pricing",
        async () => {
          const result =
            await updateCompanyProjectPricing({
              companyId,

              projectId: draftProject._id,

              pricePerSqm: 0,
            });

          assert.ok(result);

          assert.equal(
            result.project.pricePerSqm,
            0
          );

          // AVAILABLE plot should have zero price.

          const availablePlot = await Plot.findOne({
            projectId: draftProject._id,
            status: "AVAILABLE",
          });

          assert.equal(
            availablePlot.totalPrice,
            0
          );

          // RESERVED plot price must remain unchanged.

          const reservedPlot = await Plot.findOne({
            projectId: draftProject._id,
            status: "RESERVED",
          });

          assert.equal(
            reservedPlot.totalPrice,
            3000000
          );
        }
      );

      // ======================================
      // TEST 3: INACTIVE PROJECT + ZERO PRICE
      // ======================================

      await t.test(
        "INACTIVE project allows zero pricing",
        async () => {
          const result =
            await updateCompanyProjectPricing({
              companyId,

              projectId: inactiveProject._id,

              pricePerSqm: 0,
            });

          assert.ok(result);

          assert.equal(
            result.project.pricePerSqm,
            0
          );
        }
      );

      // ======================================
      // TEST 4: ACTIVE PROJECT + POSITIVE PRICE
      // ======================================

      await t.test(
        "ACTIVE project accepts positive pricing",
        async () => {
          const result =
            await updateCompanyProjectPricing({
              companyId,

              projectId: activeProject._id,

              pricePerSqm: 7500,
            });

          assert.ok(result);

          assert.equal(
            result.project.pricePerSqm,
            7500
          );

          const plots = await Plot.find({
            projectId: activeProject._id,
          });

          const available = plots.find(
            (plot) => plot.status === "AVAILABLE"
          );

          const reserved = plots.find(
            (plot) => plot.status === "RESERVED"
          );

          const sold = plots.find(
            (plot) => plot.status === "SOLD"
          );

          assert.ok(available);
          assert.ok(reserved);
          assert.ok(sold);

          // AVAILABLE: 500 sqm × 7,500

          assert.equal(
            available.totalPrice,
            3750000
          );

          // RESERVED pricing remains unchanged.

          assert.equal(
            reserved.totalPrice,
            3000000
          );

          // SOLD pricing remains unchanged.

          assert.equal(
            sold.totalPrice,
            3500000
          );
        }
      );

      // ======================================
      // TEST 5: COMPANY OWNERSHIP
      // ======================================

      await t.test(
        "Another company cannot update project pricing",
        async () => {
          const result =
            await updateCompanyProjectPricing({
              companyId: otherCompanyId,

              projectId: activeProject._id,

              pricePerSqm: 9000,
            });

          // No matching project should be updated.

          assert.equal(result, null);

          // Original pricing must remain unchanged.

          const project = await Project.findById(
            activeProject._id
          );

          assert.equal(
            project.pricePerSqm,
            7500
          );

          const availablePlot = await Plot.findOne({
            projectId: activeProject._id,
            status: "AVAILABLE",
          });

          assert.equal(
            availablePlot.totalPrice,
            3750000
          );
        }
      );

      // ======================================
      // TEST 6: TRANSACTION ROLLBACK
      // ======================================

      await t.test(
        "Pricing transaction rolls back when plot updates fail",
        async () => {
          const originalUpdateMany = Plot.updateMany;

          try {
            // Simulate a database failure after
            // attempting the project pricing update.

            Plot.updateMany = async () => {
              throw new Error(
                "Simulated pricing update failure"
              );
            };

            await assert.rejects(
              () =>
                updateCompanyProjectPricing({
                  companyId,

                  projectId: activeProject._id,

                  pricePerSqm: 12000,
                }),

              /Simulated pricing update failure/
            );
          } finally {
            // Restore the original Mongoose method.

            Plot.updateMany = originalUpdateMany;
          }

          // Verify the transaction was rolled back.

          const project = await Project.findById(
            activeProject._id
          );

          const availablePlot = await Plot.findOne({
            projectId: activeProject._id,
            status: "AVAILABLE",
          });

          // Previous successful pricing must remain.

          assert.equal(
            project.pricePerSqm,
            7500
          );

          assert.equal(
            availablePlot.totalPrice,
            3750000
          );
        }
      );

    } finally {
      // ======================================
      // CLEAN UP TEMPORARY TEST RECORDS
      // ======================================

      if (mongoose.connection.readyState === 1) {
        try {
          // Delete plots belonging only to
          // projects created by this test.

          await Plot.deleteMany({
            projectId: {
              $in: testProjectIds,
            },
          });

          // Delete temporary test projects.

          await Project.deleteMany({
            _id: {
              $in: testProjectIds,
            },
            companyId,
          });

        } finally {
          await mongoose.disconnect();
        }
      } else {
        await mongoose.disconnect();
      }
    }
  }
);