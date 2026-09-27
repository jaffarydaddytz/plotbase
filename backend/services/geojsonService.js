import fs from "fs/promises";

const readGeoJsonFile = async (filePath) => {
    const fileContent = await fs.readFile(filePath, "utf-8");

    const geoJson = JSON.parse(fileContent);

    if (geoJson.type !== "FeatureCollection") {
        throw new Error("GeoJSON must be a FeatureCollection");
    }

    if (!Array.isArray(geoJson.features)) {
        throw new Error("GeoJSON features must be an array");
    }

    const plots = geoJson.features.map((feature, index) => {
        if (feature.type !== "Feature") {
            throw new Error(`Feature at index ${index} is invalid`);
        }

        if (!feature.geometry) {
            throw new Error(`Feature at index ${index} has no geometry`);
        }

        if (!feature.geometry.type) {
            throw new Error(`Feature at index ${index} has no geometry type`);
        }

        if (!feature.geometry.coordinates) {
            throw new Error(`Feature at index ${index} has no coordinates`);
        }

        const legalArea = feature.properties?.legalArea;

        if (!legalArea) {
            throw new Error(`Feature at index ${index} has no legal area`);
        }

        const areaSqm = Number(
            String(legalArea).replace(/,/g, "")
        );

        if (Number.isNaN(areaSqm)) {
            throw new Error(`Invalid legal area at feature ${index}`);
        }

        return {
            areaSqm,
            geometry: feature.geometry.type,
            coordinates: feature.geometry.coordinates
        };
    });

    return plots;
};

export default readGeoJsonFile;