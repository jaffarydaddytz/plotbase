import test from "node:test";
import assert from "node:assert/strict";

import Project from "../models/project.models.js";
import Plot from "../models/plot.model.js";

import { getProjectById } from "../services/projectService.js";

const projectId = "507f1f77bcf86cd799439011";
const plotId = "507f1f77bcf86cd799439012";

const coordinates = [[
  [39.0, -6.0],
  [39.01, -6.0],
  [39.01, -6.01],
  [39.0, -6.0]
]];

// TEST 1: Published projects must be accessible.
test("ACTIVE project returns details and GeoJSON plots", async (t) => {

  t.mock.method(Project, "findOne", (query) => {

    assert.deepEqual(query, {
      _id: projectId,
      status: "ACTIVE"
    });

    return {
      lean: async () => ({
        _id: projectId,
        title: "Plotbase Test Project",
        description: "Regression test project",
        location: "Dar es Salaam",
        pricePerSqm: 5000,
        status: "ACTIVE"
      })
    };
  });

  t.mock.method(Plot, "find", (query) => {

    assert.deepEqual(query, {
      projectId
    });

    return {
      lean: async () => ([{
        _id: plotId,
        projectId,
        plotNumber: "PLOT-1",
        areaSqm: 500,
        totalPrice: 2500000,
        status: "AVAILABLE",
        geometry: "Polygon",
        coordinates
      }])
    };
  });

  const result = await getProjectById(projectId);

  assert.equal(result.project.id, projectId);
  assert.equal(result.project.status, "ACTIVE");
  assert.equal(result.project.title, "Plotbase Test Project");

  assert.equal(result.plots.type, "FeatureCollection");
  assert.equal(result.plots.features.length, 1);

  const feature = result.plots.features[0];

  assert.equal(feature.type, "Feature");
  assert.equal(feature.properties.plotNumber, "PLOT-1");
  assert.equal(feature.properties.areaSqm, 500);
  assert.equal(feature.properties.totalPrice, 2500000);
  assert.equal(feature.properties.status, "AVAILABLE");

  assert.equal(feature.geometry.type, "Polygon");
  assert.deepEqual(feature.geometry.coordinates, coordinates);

  console.log("PASS: ACTIVE project accessible");
  console.log("PASS: Project details correct");
  console.log("PASS: Plot GeoJSON correct");
});

// TEST 2: Unpublished projects must not be returned.
test("Public retrieval rejects projects that are not ACTIVE", async (t) => {

  t.mock.method(Project, "findOne", (query) => {

    assert.equal(query._id, projectId);
    assert.equal(query.status, "ACTIVE");

    // Simulate no matching ACTIVE project.
    return {
      lean: async () => null
    };
  });

  t.mock.method(Plot, "find", () => {
    throw new Error(
      "Plots must not be queried for unpublished projects"
    );
  });

  await assert.rejects(
    () => getProjectById(projectId),
    {
      message: "Project not found"
    }
  );

  console.log("PASS: Unpublished project rejected");
  console.log("PASS: No plot data exposed");
});
