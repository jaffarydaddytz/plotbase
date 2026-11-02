import { useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineArrowLeft } from "react-icons/hi";
import GeoJsonPreview from "./GeoJsonPreview";
import PlotInventoryPreview from "./PlotInventoryPreview";

const CreateProject = () => {
  // Project form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    pricePerSqm: "",
  });

  // GeoJSON upload state
  const [geoJsonFile, setGeoJsonFile] = useState(null);
  const [geoJsonError, setGeoJsonError] = useState("");
  const [geoJsonData, setGeoJsonData] = useState(null);

  // Handle project form inputs
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

 


  const handleGeoJsonChange = async (e) => {
  const file = e.target.files?.[0];

  // Clear previous selection
  setGeoJsonFile(null);
  setGeoJsonData(null);
  setGeoJsonError("");

  if (!file) return;

  // Validate file extension
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!["geojson", "json"].includes(extension)) {
    setGeoJsonError("Please select a .geojson or .json file.");
    e.target.value = "";
    return;
  }

  try {
    // Read file contents
    const content = await file.text();

    // Parse uploaded JSON
const response = JSON.parse(content);

// Support standard GeoJSON 
// and wrapped GeoJSON API responses
const parsed =
  response?.type === "FeatureCollection"
    ? response
    : response?.data?.features;

    // Check GeoJSON structure
    if (
      parsed?.type !== "FeatureCollection" ||
      !Array.isArray(parsed.features) ||
      parsed.features.length === 0
    ) {
      throw new Error(
        "GeoJSON must contain a non-empty FeatureCollection."
      );
    }

// Validate longitude and latitude
const isValidPosition = (position) => {
  if (!Array.isArray(position) || position.length < 2) {
    return false;
  }

  const [longitude, latitude] = position;

  return (
    typeof longitude === "number" &&
    typeof latitude === "number" &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
};

// Validate a polygon ring
const isValidRing = (ring) => {
  if (
    !Array.isArray(ring) ||
    ring.length < 4 ||
    !ring.every(isValidPosition)
  ) {
    return false;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];

  // GeoJSON polygon rings must be closed
  return (
    first[0] === last[0] &&
    first[1] === last[1]
  );
};

// Validate Polygon coordinates
const isValidPolygon = (coordinates) => {
  return (
    Array.isArray(coordinates) &&
    coordinates.length > 0 &&
    coordinates.every(isValidRing)
  );
};

// Validate supported GeoJSON features
const validFeatures = parsed.features.every((feature) => {
  if (feature?.type !== "Feature") {
    return false;
  }

  const geometry = feature.geometry;

  if (!geometry) {
    return false;
  }

  if (geometry.type === "Polygon") {
    return isValidPolygon(geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return (
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length > 0 &&
      geometry.coordinates.every(isValidPolygon)
    );
  }

  return false;
});

if (!validFeatures) {
  throw new Error(
    "Invalid GeoJSON geometry. Check polygon coordinates and ring closure."
  );
}

    if (!validFeatures) {
      throw new Error(
        "All features must contain Polygon or MultiPolygon geometry."
      );
    }
    // Validate unique plot numbers within the uploaded project
const plotNumbers = new Set();

for (const feature of parsed.features) {
  const properties = feature.properties || {};

  const rawPlotNumber =
    properties.plotNumber ??
    properties.plot_number ??
    properties.lotNumber;

  // Some GeoJSON files may not contain plot numbers.
  // Missing numbers will be handled by the backend later.
  if (rawPlotNumber == null || String(rawPlotNumber).trim() === "") {
    continue;
  }

  const plotNumber = String(rawPlotNumber).trim().toLowerCase();

  if (plotNumbers.has(plotNumber)) {
    throw new Error(
      `Duplicate plot number detected: ${rawPlotNumber}`
    );
  }

  plotNumbers.add(plotNumber);
}

// Prepare a standard GeoJSON file for eventual backend upload
const normalizedFile = new File(
  [JSON.stringify(parsed)],
  file.name.replace(/\.json$/i, ".geojson"),
  {
    type: "application/geo+json",
  }
);

// Store normalized GeoJSON for future submission
setGeoJsonFile(normalizedFile);

// Store parsed data for map and inventory preview
setGeoJsonData(parsed);

  } catch (error) {
    setGeoJsonError(
      error instanceof SyntaxError
        ? "The selected file does not contain valid JSON."
        : error.message || "Unable to read the GeoJSON file."
    );

    e.target.value = "";
  }
};

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Backend integration will be implemented
    // after company authentication and authorization.
  };

  // Reusable input styling
  const inputClass =
    "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  const labelClass =
    "mb-2 block text-sm font-medium text-gray-700";

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4 sm:space-y-5">

      {/* Page Header */}
      <div className="space-y-2 sm:space-y-3">

        <Link
          to="/company/projects"
          className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-emerald-600"
        >
          <HiOutlineArrowLeft size={16} />
          Back to Projects
        </Link>

        <div>
          <h1 className="text-xl font-bold text-gray-800 sm:text-3xl">
            Create New Project
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Enter your real estate project information.
          </p>
        </div>

      </div>

      {/* Project Creation Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-3 sm:p-6 lg:p-7"
      >

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 gap-x-5 gap-y-5 lg:grid-cols-2 xl:grid-cols-3">

          {/* Section Heading - Hidden on Mobile */}
          <div className="hidden sm:col-span-full sm:block">

            <h2 className="text-lg font-semibold text-gray-800">
              Basic Project Information
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Provide the essential information about your project.
            </p>

          </div>

          {/* Project Name */}
          <div className="min-w-0">

            <label htmlFor="title" className={labelClass}>
              Project Name
            </label>

            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter project name"
              className={inputClass}
            />

          </div>

          {/* Project Location */}
          <div className="min-w-0">

            <label htmlFor="location" className={labelClass}>
              Project Location
            </label>

            <input
              id="location"
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Kigamboni, Dar es Salaam"
              className={inputClass}
            />

          </div>

          {/* Price Per Square Metre */}
          <div className="min-w-0">

            <label htmlFor="pricePerSqm" className={labelClass}>
              Price Per Square Metre (TZS)
            </label>

            <input
              id="pricePerSqm"
              type="number"
              name="pricePerSqm"
              value={formData.pricePerSqm}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="Enter price per sqm"
              className={inputClass}
            />

          </div>

          {/* Project Description */}
          <div className="min-w-0 lg:col-span-2 xl:col-span-3">

            <label htmlFor="description" className={labelClass}>
              Project Description
            </label>

            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe your project, its location, and key features..."
              className={`${inputClass} resize-y`}
            />

          </div>

          {/* GeoJSON Upload */}
          <div className="min-w-0 lg:col-span-2 xl:col-span-3">

            <label htmlFor="geojson" className={labelClass}>
              Project GeoJSON File
            </label>

            <input
              id="geojson"
              type="file"
              accept=".geojson,.json,application/geo+json,application/json"
              onChange={handleGeoJsonChange}
              className="block w-full min-w-0 rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
            />

            <p className="mt-2 text-xs text-gray-500">
              Upload a GeoJSON file containing your project's land plots.
            </p>

            {/* Selected File */}
            {geoJsonFile && (
              <p className="mt-2 break-all text-sm font-medium text-emerald-700">
                Selected file: {geoJsonFile.name}

                {/* GeoJSON Validation Summary */}
            {/* Interactive GeoJSON Map Preview */}
{geoJsonData && (
  <div className="col-span-full min-w-0">
    <GeoJsonPreview data={geoJsonData} />
  </div>
)}



{/* Plot Inventory Preview */}
{geoJsonData && (
  <div className="col-span-full min-w-0">
    <PlotInventoryPreview data={geoJsonData} />
  </div>
)}


{geoJsonData && (
  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
    <p className="text-sm font-semibold text-emerald-700">
      GeoJSON structure validated successfully!
    </p>

    <p className="mt-1 text-sm text-gray-600">
      Detected plots: {geoJsonData.features.length}
    </p>

    <p className="mt-1 text-xs text-gray-500">
      File is ready for map preview. Detailed geometry validation is still pending.
    </p>
  </div>
)}

              </p>
            )}

            {/* Upload Error */}
            {geoJsonError && (
              <p
                role="alert"
                className="mt-2 text-sm text-red-600"
              >
                {geoJsonError}
              </p>
            )}



          </div>

          {/* Form Actions */}
          <div className="col-span-full flex flex-col gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">

            <Link
              to="/company/projects"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled
              title="Available after backend integration"
              className="cursor-not-allowed rounded-lg bg-gray-200 px-6 py-3 text-sm font-medium text-gray-500"
            >
              Save Draft — Coming Soon
            </button>

          </div>

        </div>
        {/* End Responsive Grid */}

      </form>

    </div>
  );
};

export default CreateProject;