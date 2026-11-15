import fs from "fs/promises";

const readGeoJsonFile = async (filePath) => {
    const fileContent = await fs.readFile(filePath, "utf-8");

    let geoJson;

    // Parse GeoJSON.
    try {
        geoJson = JSON.parse(fileContent);
    } catch {
        const error = new Error(
            "Invalid GeoJSON: file contains malformed JSON"
        );

        error.statusCode = 400;
        throw error;
    }

    // Validate top-level GeoJSON structure.
    if (
        !geoJson ||
        typeof geoJson !== "object" ||
        Array.isArray(geoJson) ||
        geoJson.type !== "FeatureCollection"
    ) {
        const error = new Error(
            "GeoJSON must be a FeatureCollection"
        );

        error.statusCode = 400;
        throw error;
    }

    // Validate features array.
    if (!Array.isArray(geoJson.features)) {
        const error = new Error(
            "GeoJSON features must be an array"
        );

        error.statusCode = 400;
        throw error;
    }

    // Reject empty project imports.
    if (geoJson.features.length === 0) {
        const error = new Error(
            "GeoJSON must contain at least one plot feature"
        );

        error.statusCode = 400;
        throw error;
    }

    // Helper for GeoJSON validation errors.
    const invalidFeature = (message) => {
        const error = new Error(message);
        error.statusCode = 400;
        throw error;
    };

    // Process plot features.
    const plots = geoJson.features.map((feature, index) => {

        // Validate feature structure.
        if (
            !feature ||
            typeof feature !== "object" ||
            Array.isArray(feature) ||
            feature.type !== "Feature"
        ) {
            invalidFeature(
                `Feature at index ${index} is invalid`
            );
        }

        // Validate geometry existence.
        if (
            !feature.geometry ||
            typeof feature.geometry !== "object" ||
            Array.isArray(feature.geometry)
        ) {
            invalidFeature(
                `Feature at index ${index} has no valid geometry`
            );
        }

        // Validate geometry type.
        if (
            typeof feature.geometry.type !== "string" ||
            !feature.geometry.type
        ) {
            invalidFeature(
                `Feature at index ${index} has no geometry type`
            );
        }

        // Validate coordinates.
        if (!Array.isArray(feature.geometry.coordinates)) {
            invalidFeature(
                `Feature at index ${index} has invalid coordinates`
            );
        }

        const geometryType = feature.geometry.type;
        const coordinates = feature.geometry.coordinates;

        // Only Polygon and MultiPolygon are supported.
        if (
            geometryType !== "Polygon" &&
            geometryType !== "MultiPolygon"
        ) {
            invalidFeature(
                `Unsupported geometry type at feature ${index}: ${geometryType}`
            );
        }

        // Validate a coordinate position.
        const isValidPosition = (position) =>
            Array.isArray(position) &&
            position.length >= 2 &&
            position.every(
                (value) =>
                    typeof value === "number" &&
                    Number.isFinite(value)
            );

        // Validate a closed polygon ring.
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

            return (
                first[0] === last[0] &&
                first[1] === last[1]
            );
        };

        // Validate Polygon structure.
        const isValidPolygon = (polygon) =>
            Array.isArray(polygon) &&
            polygon.length > 0 &&
            polygon.every(isValidRing);

        // Validate geometry according to its type.
        const geometryIsValid =
            geometryType === "Polygon"
                ? isValidPolygon(coordinates)
                : Array.isArray(coordinates) &&
                  coordinates.length > 0 &&
                  coordinates.every(isValidPolygon);

        if (!geometryIsValid) {
            invalidFeature(
                `Invalid ${geometryType} coordinates at feature ${index}`
            );
        }

        // Extract legal area.
        const legalArea = feature.properties?.legalArea;

        if (
            legalArea === undefined ||
            legalArea === null ||
            String(legalArea).trim() === ""
        ) {
            invalidFeature(
                `Feature at index ${index} has no legal area`
            );
        }

        // Convert legal area to square metres.
        const areaSqm = Number(
            String(legalArea).replace(/,/g, "").trim()
        );

        // Validate plot area.
        if (
            !Number.isFinite(areaSqm) ||
            areaSqm <= 0
        ) {
            invalidFeature(
                `Invalid legal area at feature ${index}`
            );
        }

        // Return normalized plot data.
        return {
            areaSqm,
            geometry: feature.geometry.type,
            coordinates: feature.geometry.coordinates
        };
    });

    return plots;
};

export default readGeoJsonFile;