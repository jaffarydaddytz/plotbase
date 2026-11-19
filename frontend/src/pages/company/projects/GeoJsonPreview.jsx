import { useEffect, useRef } from "react";
import L from "leaflet";

import {
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

// ==========================================
// PLOT COLORS
// ==========================================

const getPlotStyle = (
  status,
  selected = false
) => {
  const colors = {
    AVAILABLE: "#059669",
    RESERVED: "#d97706",
    SOLD: "#dc2626",
  };

  const color =
    colors[
      String(status || "").toUpperCase()
    ] || "#059669";

  return {
    color: selected ? "#18181b" : color,
    weight: selected ? 4 : 2,
    fillColor: color,
    fillOpacity: selected ? 0.6 : 0.3,
  };
};

// ==========================================
// RESIZE LEAFLET MAP
// ==========================================

const ResizeMap = () => {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    const updateSize = () => {
      map.invalidateSize({
        pan: false,
        animate: false,
      });
    };

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateSize)
        : null;

    observer?.observe(container);

    const frame =
      requestAnimationFrame(updateSize);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [map]);

  return null;
};

// ==========================================
// GEOJSON PLOT POLYGONS
// ==========================================

const PlotPolygons = ({
  data,
  selectable,
  selectedPlotId,
  onSelectPlot,
}) => {
  const map = useMap();

  const layersRef = useRef(new Map());

  const onSelectRef = useRef(onSelectPlot);

  onSelectRef.current = onSelectPlot;

  // ========================================
  // CREATE POLYGON LAYERS
  // ========================================

  useEffect(() => {
    if (!Array.isArray(data?.features)) {
      return;
    }

    const layers = new Map();

    const geoJsonLayer = L.geoJSON(data, {
      // POLYGON STYLE

      style: (feature) =>
        getPlotStyle(
          feature?.properties?.status
        ),

      // FEATURE EVENTS

      onEachFeature: (feature, layer) => {
        const properties =
          feature.properties || {};

        const plotId =
          properties.id ?? feature.id;

        const plotNumber =
          properties.plotNumber ??
          properties.plot_number ??
          properties.lotNumber ??
          properties.name ??
          "Unknown";

        // ================================
        // INVESTOR PLOT SELECTION
        // ================================

        if (
          selectable &&
          plotId != null
        ) {
          const id = String(plotId);

          layers.set(id, layer);

          layer.on("click", () => {
            onSelectRef.current?.(id);
          });

          return;
        }

        // ================================
        // UPLOAD PREVIEW POPUP
        // ================================

        const popup =
          document.createElement("div");

        const title =
          document.createElement("strong");

        title.textContent =
          `Plot ${plotNumber}`;

        popup.appendChild(title);

        const addInfo = (label, value) => {
          if (
            value === null ||
            value === undefined ||
            value === ""
          ) {
            return;
          }

          const row =
            document.createElement("p");

          row.textContent =
            `${label}: ${value}`;

          popup.appendChild(row);
        };

        // AREA

        const area =
          properties.areaSqm ??
          properties.legalArea;

        if (area != null) {
          addInfo(
            "Area",
            `${area} sqm`
          );
        }

        // PRICE

        if (
          properties.totalPrice != null
        ) {
          addInfo(
            "Price",
            `TZS ${Number(
              properties.totalPrice
            ).toLocaleString("en-TZ")}`
          );
        }

        // LOCATION

        addInfo(
          "District",
          properties.district
        );

        addInfo(
          "Region",
          properties.region
        );

        addInfo(
          "Locality",
          properties.locality
        );

        // STATUS

        if (
          properties.plotStatus != null
        ) {
          addInfo(
            "Source status code",
            properties.plotStatus
          );
        } else {
          addInfo(
            "Status",
            properties.status
          );
        }

        layer.bindPopup(popup);
      },
    });

    // ====================================
    // ADD LAYER TO MAP
    // ====================================

    geoJsonLayer.addTo(map);

    layersRef.current = layers;

    // ====================================
    // FIT MAP TO PROJECT BOUNDARIES
    // ====================================

    const bounds =
      geoJsonLayer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 18,
      });
    }

    // ====================================
    // CLEANUP
    // ====================================

    return () => {
      layersRef.current = new Map();

      map.removeLayer(
        geoJsonLayer
      );
    };
  }, [data, map, selectable]);

  // ========================================
  // HIGHLIGHT SELECTED POLYGON
  // ========================================

  useEffect(() => {
    if (!selectable) return;

    const selectedId =
      selectedPlotId == null
        ? null
        : String(selectedPlotId);

    for (
      const [id, layer] of
      layersRef.current
    ) {
      const status =
        layer.feature?.properties?.status;

      const selected =
        id === selectedId;

      layer.setStyle(
        getPlotStyle(
          status,
          selected
        )
      );

      if (selected) {
        layer.bringToFront();
      }
    }
  }, [
    data,
    selectable,
    selectedPlotId,
  ]);

  return null;
};

// ==========================================
// GEOJSON PREVIEW COMPONENT
// ==========================================

const GeoJsonPreview = ({
  data,
  selectable = false,
  selectedPlotId = null,
  onSelectPlot,
  fillHeight = false,
}) => {
  if (!data) return null;

  return (
    <section
      className={
        fillHeight
          ? "flex h-full min-h-0 w-full min-w-0 flex-col"
          : "w-full min-w-0 space-y-3"
      }
    >

      {/* ==================================
          PREVIEW HEADER
      ================================== */}

      {!fillHeight && (
        <div>

          <h3 className="text-sm font-semibold text-zinc-950">
            {selectable
              ? "Explore Plots"
              : "Project Map Preview"}
          </h3>

          <p className="mt-1 text-xs text-zinc-500">
            {selectable
              ? "Select a plot on the map to view its details."
              : "Preview the uploaded land plots before saving your project."}
          </p>

        </div>
      )}

      {/* ==================================
          STANDALONE LEGEND
      ================================== */}

      {selectable && !fillHeight && (
        <div className="flex flex-wrap gap-3 text-xs text-zinc-600">

          <span>
            🟢 Available
          </span>

          <span>
            🟠 Reserved
          </span>

          <span>
            🔴 Sold
          </span>

          <span>
            ◼ Selected
          </span>

        </div>
      )}

      {/* ==================================
          MAP CONTAINER
      ================================== */}

      <div
        className={
          fillHeight
            ? "min-h-0 flex-1 overflow-hidden rounded-lg border border-zinc-200"
            : "w-full min-w-0 overflow-hidden rounded-xl border border-zinc-200"
        }
      >

        <MapContainer
          center={[0, 0]}
          zoom={2}
          scrollWheelZoom={false}
          className={
            fillHeight
              ? "h-full w-full"
              : "h-72 w-full sm:h-96 lg:h-[420px]"
          }
        >

          {/* MAP TILES */}

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* AUTOMATIC RESIZING */}

          <ResizeMap />

          {/* GEOJSON POLYGONS */}

          <PlotPolygons
            data={data}
            selectable={selectable}
            selectedPlotId={selectedPlotId}
            onSelectPlot={onSelectPlot}
          />

        </MapContainer>

      </div>

      {/* ==================================
          PREVIEW INFORMATION
      ================================== */}

      {!fillHeight && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">

          <strong className="text-zinc-900">
            {data.features?.length ?? 0}
          </strong>

          {" "}

          plots detected.

          {" "}

          {selectable
            ? "Click a plot to select it."
            : "Click a plot to view its information."}

        </div>
      )}

    </section>
  );
};

export default GeoJsonPreview;