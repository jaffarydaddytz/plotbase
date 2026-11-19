import mongoose from "mongoose";

import Project from "../models/project.models.js";
import Plot from "../models/plot.model.js";
import Company from "../models/company.model.js";

// ==========================================
// CONFIGURATION
// ==========================================

const WIDTH = 480;
const HEIGHT = 270;
const PADDING = 18;

const MAX_PLOTS = 150;
const MAX_POINTS_PER_RING = 80;

const STATUS_COLORS = {
  AVAILABLE: {
    fill: "#bbf7d0",
    stroke: "#15803d",
  },
  RESERVED: {
    fill: "#fef08a",
    stroke: "#a16207",
  },
  SOLD: {
    fill: "#d4d4d8",
    stroke: "#71717a",
  },
};

// ==========================================
// NORMALIZE GEOJSON RINGS
// ==========================================

const normalizeRing = (ring) => {
  if (!Array.isArray(ring)) {
    return [];
  }

  const points = ring.filter(
    (point) =>
      Array.isArray(point) &&
      point.length >= 2 &&
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1]) &&
      point[0] >= -180 &&
      point[0] <= 180 &&
      point[1] >= -90 &&
      point[1] <= 90
  );

  if (points.length < 3) {
    return [];
  }

  // Remove duplicated closing coordinate.
  const first = points[0];
  const last = points[points.length - 1];

  if (
    first[0] === last[0] &&
    first[1] === last[1]
  ) {
    points.pop();
  }

  if (points.length < 3) {
    return [];
  }

  // Reduce excessively detailed polygons.
  // This is a visual approximation for cards,
  // not authoritative surveying geometry.
  const step = Math.max(
    1,
    Math.ceil(points.length / MAX_POINTS_PER_RING)
  );

  return points.filter(
    (_, index) => index % step === 0
  );
};

// ==========================================
// CONVERT SAVED PLOTS TO DRAWABLE SHAPES
// ==========================================

const getPlotShapes = (plot) => {
  let polygons = [];

  if (plot.geometry === "Polygon") {
    polygons = [plot.coordinates];
  } else if (plot.geometry === "MultiPolygon") {
    polygons = plot.coordinates;
  }

  if (!Array.isArray(polygons)) {
    return [];
  }

  return polygons.flatMap((polygon) => {
    if (!Array.isArray(polygon)) {
      return [];
    }

    const rings = polygon
      .map(normalizeRing)
      .filter((ring) => ring.length >= 3);

    if (rings.length === 0) {
      return [];
    }

    return [
      {
        rings,
        status: plot.status,
      },
    ];
  });
};

// ==========================================
// PUBLIC PROJECT THUMBNAIL
// ==========================================

const getPublicProjectThumbnailSvg = async (
  projectId
) => {
  if (!mongoose.isValidObjectId(projectId)) {
    return null;
  }

  // ========================================
  // PUBLIC VISIBILITY VALIDATION
  // ========================================

  // Apply the same publication and company
  // approval requirements as public discovery.

  const visibleProjects = await Project.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(projectId),

        status: "ACTIVE",

        projectType: {
          $in: ["VIWANJA", "MASHAMBA"],
        },

        companyId: {
          $type: "objectId",
        },
      },
    },
    {
      $lookup: {
        from: Company.collection.name,
        localField: "companyId",
        foreignField: "_id",
        as: "company",
      },
    },
    {
      $match: {
        "company.verificationStatus": "APPROVED",
      },
    },
    {
      $project: {
        _id: 1,
      },
    },
  ]);

  if (visibleProjects.length === 0) {
    return null;
  }

  // ========================================
  // RETRIEVE BOUNDED GEOMETRY
  // ========================================

  const plots = await Plot.find({
    projectId,
  })
    .select("geometry coordinates status")
    .sort({ _id: 1 })
    .limit(MAX_PLOTS + 1)
    .lean();

  if (plots.length === 0) {
    return null;
  }

  const partialPreview = plots.length > MAX_PLOTS;

  const shapes = plots
    .slice(0, MAX_PLOTS)
    .flatMap(getPlotShapes);

  if (shapes.length === 0) {
    return null;
  }

  // ========================================
  // COMPUTE GEOGRAPHIC BOUNDS
  // ========================================

  const coordinates = shapes.flatMap((shape) =>
    shape.rings.flat()
  );

  const longitudes = coordinates.map(
    (point) => point[0]
  );

  const latitudes = coordinates.map(
    (point) => point[1]
  );

  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);

  const lonSpan = maxLon - minLon;
  const latSpan = maxLat - minLat;

  if (lonSpan === 0 && latSpan === 0) {
    return null;
  }

  // Approximate longitude scaling at the
  // project's latitude for a natural shape.

  const midLat = (minLat + maxLat) / 2;

  const lonFactor = Math.max(
    0.05,
    Math.abs(Math.cos((midLat * Math.PI) / 180))
  );

  const projectedWidth = Math.max(
    lonSpan * lonFactor,
    1e-12
  );

  const projectedHeight = Math.max(
    latSpan,
    1e-12
  );

  const scale = Math.min(
    (WIDTH - PADDING * 2) / projectedWidth,
    (HEIGHT - PADDING * 2) / projectedHeight
  );

  const offsetX =
    (WIDTH - lonSpan * lonFactor * scale) / 2;

  const offsetY =
    (HEIGHT - latSpan * scale) / 2;

  // ========================================
  // PROJECT COORDINATES TO SVG
  // ========================================

  const projectPoint = ([longitude, latitude]) => {
    const x =
      offsetX +
      (longitude - minLon) * lonFactor * scale;

    const y =
      offsetY +
      (maxLat - latitude) * scale;

    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  };

  // ========================================
  // GENERATE SVG POLYGON PATHS
  // ========================================

  const paths = shapes
    .map((shape) => {
      const colors =
        STATUS_COLORS[shape.status] ||
        STATUS_COLORS.SOLD;

      const pathData = shape.rings
        .map((ring) => {
          const commands = ring.map(
            (point, index) =>
              `${index === 0 ? "M" : "L"} ${projectPoint(point)}`
          );

          return `${commands.join(" ")} Z`;
        })
        .join(" ");

      return `
        <path
          d="${pathData}"
          fill="${colors.fill}"
          stroke="${colors.stroke}"
          stroke-width="0.8"
          stroke-linejoin="round"
          fill-rule="evenodd"
        />
      `;
    })
    .join("");

  // ========================================
  // RETURN STATIC SVG
  // ========================================

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${WIDTH}"
      height="${HEIGHT}"
      viewBox="0 0 ${WIDTH} ${HEIGHT}"
      role="img"
      aria-label="Project plot layout preview"
    >
      <title>Project plot layout preview</title>
<rect
  width="${WIDTH}"
  height="${HEIGHT}"
  fill="#e4e4e7"
/>

      ${paths}

      ${
        partialPreview
          ? `
            <rect
              x="10"
              y="10"
              width="110"
              height="23"
              rx="5"
              fill="#ffffff"
              fill-opacity="0.94"
            />

            <text
              x="18"
              y="25"
              font-size="11"
              font-family="Arial, sans-serif"
              fill="#52525b"
            >
              Partial preview
            </text>
          `
          : ""
      }
    </svg>
  `;
};

export default getPublicProjectThumbnailSvg;