import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import readGeoJsonFile from "../services/geojsonService.js";

// Create an isolated temporary GeoJSON file.
const processGeoJson = async (features) => {
  const directory = await fs.mkdtemp(
    path.join(tmpdir(), "plotbase-geojson-test-")
  );

  const filePath = path.join(directory, "plots.geojson");

  try {
    await fs.writeFile(
      filePath,
      JSON.stringify({
        type: "FeatureCollection",
        features,
      }),
      "utf8"
    );

    return await readGeoJsonFile(filePath);
  } finally {
    await fs.rm(directory, {
      recursive: true,
      force: true,
    });
  }
};

// Reusable valid plot feature.
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
// TEST 1: PRESERVE IMPORTED PLOT NUMBERS
// ==========================================

test("Preserves imported GeoJSON plot numbers", async () => {
  const plots = await processGeoJson([
    createFeature({
      plotNumber: "A-105",
      legalArea: 500,
    }),
    createFeature({
      plotNumber: 102,
      legalArea: 600,
    }),
    createFeature({
      plot_number: "B-201",
      legalArea: 750,
    }),
  ]);

  assert.equal(plots.length, 3);

  assert.equal(plots[0].plotNumber, "A-105");
  assert.equal(plots[1].plotNumber, "102");
  assert.equal(plots[2].plotNumber, "B-201");

  assert.equal(plots[0].areaSqm, 500);
  assert.equal(plots[1].areaSqm, 600);
  assert.equal(plots[2].areaSqm, 750);

  assert.equal(plots[0].geometry, "Polygon");
});

// ==========================================
// TEST 2: HANDLE MISSING PLOT NUMBERS
// ==========================================

test("Allows missing plot numbers for fallback generation", async () => {
  const plots = await processGeoJson([
    createFeature({
      legalArea: 500,
    }),
    createFeature({
      plotNumber: "A-101",
      legalArea: 600,
    }),
  ]);

  assert.equal(plots.length, 2);

  assert.equal(plots[0].plotNumber, null);
  assert.equal(plots[1].plotNumber, "A-101");
});

// ==========================================
// TEST 3: REJECT DUPLICATE PLOT NUMBERS
// ==========================================

test("Rejects duplicate plot numbers regardless of case", async () => {
  await assert.rejects(
    () =>
      processGeoJson([
        createFeature({
          plotNumber: "A-101",
          legalArea: 500,
        }),
        createFeature({
          plotNumber: "a-101",
          legalArea: 600,
        }),
      ]),
    (error) => {
      assert.equal(error.statusCode, 400);

      assert.match(
        error.message,
        /Duplicate plot number detected/i
      );

      return true;
    }
  );
});