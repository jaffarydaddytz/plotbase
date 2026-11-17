import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import L from "leaflet";

import {
  AlertCircle,
  MapPinned,
  RefreshCw,
  X,
} from "lucide-react";

import {
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import API_URL from "../../../config";
import { useAuth } from "../../../context/AuthContext";

// ==========================================
// HELPERS
// ==========================================

const formatNumber = (value) =>
  new Intl.NumberFormat("en-TZ", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatCurrency = (value) =>
  `TZS ${new Intl.NumberFormat("en-TZ", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)}`;

const STATUS_COLORS = {
  AVAILABLE: {
    color: "#15803d",
    fillColor: "#22c55e",
  },
  RESERVED: {
    color: "#b45309",
    fillColor: "#f59e0b",
  },
  SOLD: {
    color: "#52525b",
    fillColor: "#a1a1aa",
  },
};

const STATUS_BADGES = {
  AVAILABLE: "bg-emerald-50 text-emerald-700",
  RESERVED: "bg-amber-50 text-amber-700",
  SOLD: "bg-zinc-100 text-zinc-700",
};

const getPlotStyle = (status) => {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.AVAILABLE;

  return {
    color: colors.color,
    weight: 2,
    fillColor: colors.fillColor,
    fillOpacity: 0.4,
  };
};

const getSelectedStyle = (status) => ({
  ...getPlotStyle(status),
  color: "#18181b",
  weight: 4,
  fillOpacity: 0.7,
});

// ==========================================
// MAP LEGEND
// ==========================================

const MapLegend = () => (
  <div className="flex flex-wrap items-center gap-4">
    {[
      { label: "Available", color: "bg-green-500" },
      { label: "Reserved", color: "bg-amber-500" },
      { label: "Sold", color: "bg-zinc-400" },
    ].map((item) => (
      <div key={item.label} className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />

        <span className="text-xs text-zinc-600">
          {item.label}
        </span>
      </div>
    ))}
  </div>
);

// ==========================================
// GEOJSON PLOT LAYER
// ==========================================

const ProjectPlotPolygons = ({
  geojson,
  selectedPlotId,
  onSelectPlot,
}) => {
  const map = useMap();

  const layersRef = useRef(new Map());
  const onSelectRef = useRef(onSelectPlot);
  const selectedIdRef = useRef(selectedPlotId);

  onSelectRef.current = onSelectPlot;
  selectedIdRef.current = selectedPlotId;

  // Build the polygon layer when GeoJSON changes.
  useEffect(() => {
    if (!geojson?.features?.length) return;

    const layers = new Map();

    const polygonLayer = L.geoJSON(geojson, {
      style: (feature) =>
        getPlotStyle(feature?.properties?.status),

      onEachFeature: (feature, layer) => {
        const plotId = feature?.properties?.id;

        if (plotId == null) return;

        const id = String(plotId);
        const status = feature?.properties?.status;

        layers.set(id, layer);

        layer.on("click", () => {
          onSelectRef.current?.(id);
        });

        layer.on("mouseover", () => {
          const selected =
            String(selectedIdRef.current) === id;

          layer.setStyle({
            ...(selected
              ? getSelectedStyle(status)
              : getPlotStyle(status)),
            fillOpacity: 0.65,
          });
        });

        layer.on("mouseout", () => {
          const selected =
            String(selectedIdRef.current) === id;

          layer.setStyle(
            selected
              ? getSelectedStyle(status)
              : getPlotStyle(status)
          );
        });
      },
    });

    layersRef.current = layers;

    polygonLayer.addTo(map);

    // Fit the entire project on initial load.
    const bounds = polygonLayer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 18,
      });
    }

    return () => {
      layersRef.current = new Map();
      map.removeLayer(polygonLayer);
    };
  }, [geojson, map]);

  // Update the selected polygon without rebuilding the map.
  useEffect(() => {
    const selectedId =
      selectedPlotId == null ? null : String(selectedPlotId);

    const layers = layersRef.current;

    for (const [id, layer] of layers.entries()) {
      const status = layer.feature?.properties?.status;
      const selected = id === selectedId;

      layer.setStyle(
        selected
          ? getSelectedStyle(status)
          : getPlotStyle(status)
      );

      if (!selected) continue;

      layer.bringToFront();

      // Only move the map if the selection is outside
      // the currently visible map area.
      if (typeof layer.getBounds === "function") {
        const bounds = layer.getBounds();

        if (
          bounds.isValid() &&
          !map.getBounds().intersects(bounds)
        ) {
          map.fitBounds(bounds, {
            padding: [30, 30],
            maxZoom: 18,
          });
        }
      }
    }
  }, [geojson, selectedPlotId, map]);

  return null;
};

// ==========================================
// INFORMATION ROW
// ==========================================

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 border-b border-zinc-100 py-3 last:border-b-0">
    <span className="shrink-0 text-xs text-zinc-500">
      {label}
    </span>

    <span className="min-w-0 break-words text-right text-xs font-medium text-zinc-900">
      {value}
    </span>
  </div>
);

// ==========================================
// RIGHT-SIDE PLOT DETAILS
// ==========================================

const PlotDetailsPanel = ({
  feature,
  projectPricePerSqm,
  onClear,
}) => {
  const properties = feature?.properties || {};

  const area = Number(properties.areaSqm);
  const totalPrice = Number(properties.totalPrice);

  const unitPrice =
    projectPricePerSqm != null &&
    Number.isFinite(Number(projectPricePerSqm))
      ? Number(projectPricePerSqm)
      : area > 0 && Number.isFinite(totalPrice)
        ? totalPrice / area
        : null;

  // Coordinates displayed here describe the approximate
  // center of the polygon's map bounds, not a surveyed point.
  const approximateCenter = useMemo(() => {
    if (!feature?.geometry) return null;

    try {
      const layer = L.geoJSON(feature);
      const bounds = layer.getBounds();

      return bounds.isValid() ? bounds.getCenter() : null;
    } catch {
      return null;
    }
  }, [feature]);

  if (!feature) {
    return (
      <aside className="flex min-h-64 flex-col items-center justify-center border-t border-zinc-200 bg-zinc-50/50 px-5 py-10 text-center xl:border-l xl:border-t-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100">
          <MapPinned size={21} className="text-zinc-500" />
        </div>

        <h3 className="mt-3 text-sm font-semibold text-zinc-900">
          Select a Plot
        </h3>

        <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-500">
          Click any plot on the map to view its information
          here.
        </p>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Selected plot details"
      className="min-w-0 border-t border-zinc-200 bg-white xl:border-l xl:border-t-0"
    >
      {/* PANEL HEADER */}

      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Plot Details
          </p>

          <h3 className="mt-1 break-words text-lg font-semibold tracking-tight text-zinc-950">
            {properties.plotNumber || "Unknown plot"}
          </h3>

          <span
            className={`mt-2 inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${
              STATUS_BADGES[properties.status] ||
              "bg-zinc-100 text-zinc-700"
            }`}
          >
            {properties.status || "UNKNOWN"}
          </span>
        </div>

        <button
          type="button"
          onClick={onClear}
          aria-label="Close plot details"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
        >
          <X size={17} />
        </button>
      </div>

      {/* PLOT INFORMATION */}

      <div className="px-4 py-2">
        <h4 className="pt-2 text-xs font-semibold text-zinc-950">
          Plot Information
        </h4>

        <div className="mt-2">
          <DetailRow
            label="Plot number"
            value={properties.plotNumber || "—"}
          />

          <DetailRow
            label="Status"
            value={properties.status || "—"}
          />

          <DetailRow
            label="Area"
            value={`${formatNumber(properties.areaSqm)} sqm`}
          />

          <DetailRow
            label="Price / sqm"
            value={
              unitPrice != null
                ? formatCurrency(unitPrice)
                : "—"
            }
          />

          <DetailRow
            label="Total price"
            value={formatCurrency(properties.totalPrice)}
          />

          <DetailRow
            label="Geometry"
            value={feature.geometry?.type || "—"}
          />
        </div>
      </div>

      {/* LOCATION INFORMATION */}

      <div className="border-t border-zinc-100 px-4 py-3">
        <h4 className="text-xs font-semibold text-zinc-950">
          Location Information
        </h4>

        <div className="mt-2">
          <DetailRow
            label="Latitude (approx.)"
            value={
              approximateCenter
                ? approximateCenter.lat.toFixed(6)
                : "—"
            }
          />

          <DetailRow
            label="Longitude (approx.)"
            value={
              approximateCenter
                ? approximateCenter.lng.toFixed(6)
                : "—"
            }
          />
        </div>

        <p className="mt-2 text-[11px] leading-4 text-zinc-500">
          Coordinates represent the approximate center of
          the plot's map bounds, not a surveyed marker.
        </p>
      </div>

      {/* RECORD INFORMATION */}

      <div className="border-t border-zinc-100 px-4 py-3">
        <h4 className="text-xs font-semibold text-zinc-950">
          Record Information
        </h4>

        <p className="mt-2 text-[11px] text-zinc-500">
          Plot ID
        </p>

        <p className="mt-1 break-all font-mono text-[11px] text-zinc-700">
          {properties.id || "—"}
        </p>
      </div>
    </aside>
  );
};

// ==========================================
// COMPANY PROJECT MAP
// ==========================================

const CompanyProjectMap = ({
  selectedPlotId,
  onSelectPlot,
  projectPricePerSqm = null,
}) => {
  const { companyId, projectId } = useParams();
  const { token } = useAuth();

  const [geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Supports standalone selection now and shared selection
  // from CompanyProjectDetails in the next integration step.
  const [localSelectedId, setLocalSelectedId] = useState(null);

  const activeSelectedId =
    selectedPlotId === undefined
      ? localSelectedId
      : selectedPlotId;

  // ========================================
  // FETCH SAVED PROJECT MAP
  // ========================================

  useEffect(() => {
    if (!companyId || !projectId || !token) {
      setGeojson(null);
      setError("Project map access is unavailable.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchMap = async () => {
      setLoading(true);
      setError("");
      setGeojson(null);

      try {
        const response = await axios.get(
          `${API_URL}/api/companies/${companyId}/projects/${projectId}/map`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const data = response.data;

        if (
          data?.success !== true ||
          data?.geojson?.type !== "FeatureCollection" ||
          !Array.isArray(data.geojson.features)
        ) {
          throw new Error("Invalid project map response.");
        }

        if (!controller.signal.aborted) {
          setGeojson(data.geojson);
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          axios.isCancel(err)
        ) {
          return;
        }

        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load project map."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchMap();

    return () => controller.abort();
  }, [companyId, projectId, token, refreshKey]);

  // ========================================
  // SELECTION HANDLERS
  // ========================================

  const handleSelectPlot = (plotId) => {
    setLocalSelectedId(plotId);
    onSelectPlot?.(plotId);
  };

  const clearSelection = () => {
    setLocalSelectedId(null);
    onSelectPlot?.(null);
  };

  const selectedFeature = useMemo(() => {
    if (
      activeSelectedId == null ||
      !geojson?.features
    ) {
      return null;
    }

    return (
      geojson.features.find(
        (feature) =>
          String(feature?.properties?.id) ===
          String(activeSelectedId)
      ) || null
    );
  }, [geojson, activeSelectedId]);

  const plotCount = geojson?.features?.length || 0;

  // ========================================
  // RENDER
  // ========================================

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {/* HEADER */}

      <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <MapPinned size={18} className="text-zinc-700" />

          <div>
            <h2 className="text-sm font-semibold text-zinc-950">
              Project Map
            </h2>

            <p className="mt-0.5 text-xs text-zinc-500">
              {loading
                ? "Loading plots..."
                : `${formatNumber(plotCount)} plots`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            clearSelection();
            setRefreshKey((previous) => previous + 1);
          }}
          disabled={loading}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
          />
          Refresh Map
        </button>
      </div>

      {/* LOADING */}

      {loading && (
        <div className="flex h-72 flex-col items-center justify-center gap-3 bg-zinc-50">
          <RefreshCw
            size={20}
            className="animate-spin text-zinc-400"
          />

          <p className="text-xs text-zinc-500">
            Loading project geometry...
          </p>
        </div>
      )}

      {/* ERROR */}

      {!loading && error && (
        <div className="flex min-h-52 flex-col items-center justify-center px-4 py-8 text-center">
          <AlertCircle size={22} className="text-red-500" />

          <p className="mt-3 text-sm font-medium text-zinc-950">
            Unable to load project map
          </p>

          <p className="mt-1 max-w-md text-xs text-zinc-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setRefreshKey((previous) => previous + 1)
            }
            className="mt-4 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Try Again
          </button>
        </div>
      )}

      {/* EMPTY STATE */}

      {!loading && !error && plotCount === 0 && (
        <div className="flex min-h-52 flex-col items-center justify-center px-4 py-8 text-center">
          <MapPinned size={25} className="text-zinc-400" />

          <p className="mt-3 text-sm font-medium text-zinc-950">
            No plot geometry available
          </p>
        </div>
      )}

      {/* MAP + RIGHT-SIDE DETAILS PANEL */}

      {!loading && !error && plotCount > 0 && (
        <>
          <div className="grid min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
            {/* LEFT: INTERACTIVE MAP */}

            <div className="min-w-0">
              <MapContainer
                center={[0, 0]}
                zoom={2}
                scrollWheelZoom={false}
                className="h-[320px] w-full sm:h-[380px] xl:h-[460px]"
                style={{ zIndex: 0 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <ProjectPlotPolygons
                  geojson={geojson}
                  selectedPlotId={activeSelectedId}
                  onSelectPlot={handleSelectPlot}
                />
              </MapContainer>
            </div>

            {/* RIGHT: SELECTED PLOT DETAILS */}

            <PlotDetailsPanel
              feature={selectedFeature}
              projectPricePerSqm={projectPricePerSqm}
              onClear={clearSelection}
            />
          </div>

          {/* FOOTER */}

          <div className="flex flex-col gap-3 border-t border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <MapLegend />

            <p className="text-xs text-zinc-500">
              Click a plot to view its details.
            </p>
          </div>
        </>
      )}
    </section>
  );
};

export default CompanyProjectMap;