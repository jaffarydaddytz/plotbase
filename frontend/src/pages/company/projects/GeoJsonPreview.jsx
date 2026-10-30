import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

import "leaflet/dist/leaflet.css";

// Display GeoJSON polygons and automatically zoom to their boundaries
const PlotPolygons = ({ data }) => {
  const map = useMap();

  useEffect(() => {
    if (!data) return;

    const geoJsonLayer = L.geoJSON(data, {
      // Polygon styling
      style: {
        color: "#059669",
        weight: 2,
        fillColor: "#10b981",
        fillOpacity: 0.3,
      },

      // Display plot information when clicked
      onEachFeature: (feature, layer) => {
        const properties = feature.properties || {};

        // Support different GeoJSON plot number properties
        const plotNumber =
          properties.plotNumber ??
          properties.plot_number ??
          properties.lotNumber ??
          properties.name ??
          "Unknown";

        // Create popup container
        const popupContent = document.createElement("div");

        // Plot heading
        const title = document.createElement("strong");
        title.textContent = `Plot ${plotNumber}`;

        popupContent.appendChild(title);

        // Helper for displaying information safely
        const addInfo = (label, value) => {
          if (
            value === null ||
            value === undefined ||
            value === ""
          ) {
            return;
          }

          const paragraph = document.createElement("p");

          paragraph.textContent = `${label}: ${value}`;

          popupContent.appendChild(paragraph);
        };

        // Plot area
        const area =
          properties.areaSqm ??
          properties.legalArea;

        if (area != null) {
          addInfo("Area", `${area} sqm`);
        }


        // Plot location
        addInfo("District", properties.district);
        addInfo("Region", properties.region);
        addInfo("Locality", properties.locality);

        // Plot status
        if (properties.plotStatus != null) {
          addInfo(
            "Source status code",
            properties.plotStatus
          );
        } else {
          addInfo("Status", properties.status);
        }

        // Attach popup to polygon
        layer.bindPopup(popupContent);
      },
    });

    // Add GeoJSON polygons to the map
    geoJsonLayer.addTo(map);

    // Automatically zoom to uploaded project boundaries
    const bounds = geoJsonLayer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 18,
      });
    }

    // Remove previous GeoJSON when data changes
    return () => {
      map.removeLayer(geoJsonLayer);
    };
  }, [data, map]);

  return null;
};

// Reusable GeoJSON Map Preview
const GeoJsonPreview = ({ data }) => {
  if (!data) return null;

  return (
    <section className="w-full min-w-0 space-y-3">

      {/* Preview Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800">
          Project Map Preview
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Preview the uploaded land plots before saving your project.
        </p>
      </div>

      {/* Map Container */}
      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-gray-200">

        <MapContainer
          center={[0, 0]}
          zoom={2}
          scrollWheelZoom={false}
          className="h-72 w-full sm:h-96 lg:h-[420px]"
        >

          {/* OpenStreetMap Background */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Uploaded GeoJSON Polygons */}
          <PlotPolygons data={data} />

        </MapContainer>

      </div>

      {/* Map Information */}
      <div className="rounded-lg bg-emerald-50 p-3">

        <p className="text-sm text-emerald-800">
          <strong>Detected plots:</strong>{" "}
          {data.features.length}
        </p>

        <p className="mt-1 text-xs text-emerald-700">
          Click a plot to view its information.
          The map automatically adjusts to the uploaded geometry.
        </p>

      </div>

    </section>
  );
};

export default GeoJsonPreview;