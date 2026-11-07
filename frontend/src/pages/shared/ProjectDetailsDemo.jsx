import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import { ArrowLeft, MapPin, X } from "lucide-react";

import "leaflet/dist/leaflet.css";

const DEMO_API_URL = import.meta.env.VITE_PROJECT_DETAILS_DEMO_API_URL;

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-TZ");

const formatPrice = (value) =>
  `TZS ${formatNumber(value)}`;

const getPlotId = (feature) =>
  String(
    feature.properties?.id ??
    feature.properties?.plotNumber ??
    ""
  );

const getPlotStyle = (feature, selectedId) => {
  const status = feature.properties?.status;

  const colors = {
    AVAILABLE: "#16a34a",
    RESERVED: "#d97706",
    SOLD: "#64748b",
  };

  const color = colors[status] || "#64748b";
  const selected = getPlotId(feature) === selectedId;

  return {
    color: selected ? "#18181b" : color,
    fillColor: color,
    fillOpacity: selected ? 0.75 : 0.4,
    weight: selected ? 4 : 2,
  };
};

function MapBounds({ geoJson }) {
  const map = useMap();

  useEffect(() => {
    if (!geoJson?.features?.length) return;

    const bounds = L.geoJSON(geoJson).getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 17,
      });
    }
  }, [geoJson, map]);

  return null;
}

function MapResize({ selectedId }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();

    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [map, selectedId]);

  return null;
}

function ProjectMap({
  geoJson,
  selectedId,
  onSelectPlot,
}) {
  const geoJsonRef = useRef(null);

  useEffect(() => {
    geoJsonRef.current?.eachLayer((layer) => {
      if (layer.feature && layer.setStyle) {
        layer.setStyle(
          getPlotStyle(layer.feature, selectedId)
        );
      }
    });
  }, [selectedId]);

  const onEachFeature = (feature, layer) => {
    layer.on("click", () => {
      onSelectPlot(getPlotId(feature));
    });
  };

  return (
    <div className="h-[460px] min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 md:h-[560px]">
      <MapContainer
        center={[-6.9, 39.3]}
        zoom={14}
        scrollWheelZoom
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBounds geoJson={geoJson} />
        <MapResize selectedId={selectedId} />

        <GeoJSON
          ref={geoJsonRef}
          data={geoJson}
          onEachFeature={onEachFeature}
          style={(feature) =>
            getPlotStyle(feature, selectedId)
          }
        />
      </MapContainer>
    </div>
  );
}

function PlotDetailsPanel({ feature, onClose }) {
  const plot = feature.properties || {};

  return (
    <aside className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-500">
            SELECTED PLOT
          </p>

          <h2 className="mt-1 text-xl font-semibold text-zinc-900">
            Plot {plot.plotNumber || "—"}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close plot details"
          className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-100"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-5 border-t border-zinc-100 pt-4">
        <p className="text-sm text-zinc-500">
          Plot Price
        </p>

        <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          {formatPrice(plot.totalPrice)}
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-zinc-500">Plot Number</span>

          <span className="font-medium text-zinc-900">
            {plot.plotNumber || "—"}
          </span>
        </div>

        <div className="flex justify-between gap-3 text-sm">
          <span className="text-zinc-500">Area</span>

          <span className="font-medium text-zinc-900">
            {formatNumber(plot.areaSqm)} m²
          </span>
        </div>

        <div className="flex justify-between gap-3 text-sm">
          <span className="text-zinc-500">Availability</span>

          <span className="font-medium text-zinc-900">
            {plot.status || "Unknown"}
          </span>
        </div>
      </div>

      <div className="mt-7 space-y-3">
        <button
          type="button"
          disabled
          title="Reservations are not available in this preview"
          className="w-full cursor-not-allowed rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white opacity-50"
        >
          Book Plot
        </button>

        <button
          type="button"
          disabled
          title="Purchases are not available in this preview"
          className="w-full cursor-not-allowed rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-900 opacity-50"
        >
          Purchase Plot
        </button>

        <p className="text-center text-xs text-zinc-500">
          Transactions are disabled in this development preview.
        </p>
      </div>
    </aside>
  );
}

export default function ProjectDetailsDemo() {
  const { id } = useParams();

  const [project, setProject] = useState(null);
  const [geoJson, setGeoJson] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProject() {
      setLoading(true);
      setError(null);
      setSelectedId(null);

      try {
        if (!import.meta.env.DEV || !DEMO_API_URL) {
          throw new Error(
            "The development demo API is not configured."
          );
        }

        const response = await axios.get(
          `${DEMO_API_URL.replace(/\/$/, "")}/api/project/${id}`
        );

        const projectData = response.data?.project;
        const plotData = response.data?.plots;

        if (
          !projectData ||
          plotData?.type !== "FeatureCollection" ||
          !Array.isArray(plotData.features)
        ) {
          throw new Error("Invalid project data received.");
        }

        if (!cancelled) {
          setProject(projectData);
          setGeoJson(plotData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Unable to load the project."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProject();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const statistics = useMemo(() => {
    const features = geoJson?.features || [];

    return {
      total: features.length,
      available: features.filter(
        (feature) =>
          feature.properties?.status === "AVAILABLE"
      ).length,
      reserved: features.filter(
        (feature) =>
          feature.properties?.status === "RESERVED"
      ).length,
      sold: features.filter(
        (feature) =>
          feature.properties?.status === "SOLD"
      ).length,
    };
  }, [geoJson]);

  const selectedFeature = useMemo(() => {
    return geoJson?.features?.find(
      (feature) => getPlotId(feature) === selectedId
    );
  }, [geoJson, selectedId]);

  const handleSelectPlot = (plotId) => {
    setSelectedId((current) =>
      current === plotId ? null : plotId
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-sm text-zinc-600">
        Loading project details...
      </div>
    );
  }

  if (error || !project || !geoJson) {
    return (
      <div className="p-8 text-sm text-red-600">
        {error || "Project not found."}
      </div>
    );
  }

  const stats = [
    { label: "Total", value: statistics.total },
    { label: "Available", value: statistics.available },
    { label: "Reserved", value: statistics.reserved },
    { label: "Sold", value: statistics.sold },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[1500px]">
        {/* PROJECT HEADER */}
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft size={16} />
          Back to Marketplace
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {project.title}
            </h1>

            <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
              <MapPin size={15} />
              <span>{project.location || "Location unavailable"}</span>
            </div>
          </div>

          <span className="rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700">
            {project.status}
          </span>
        </div>

        {/* COMPACT STATISTICS */}
        <div className="mt-5 grid grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-3 text-center sm:px-4"
            >
              <p className="text-xs text-zinc-500">
                {stat.label}
              </p>

              <p className="mt-1 text-xl font-semibold text-zinc-900">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* PROJECT SUMMARY */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-zinc-900">
            Project Summary
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-600">
            {project.description || "No description available."}
          </p>
        </section>

        {/* INTERACTIVE PROJECT MAP */}
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">
              Project Plot Map
            </h2>

            <p className="text-xs text-zinc-500">
              Select a plot to view its details
            </p>
          </div>

          <div
            className={
              selectedFeature
                ? "grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
                : "min-w-0"
            }
          >
            <ProjectMap
              geoJson={geoJson}
              selectedId={selectedId}
              onSelectPlot={handleSelectPlot}
            />

            {selectedFeature && (
              <PlotDetailsPanel
                feature={selectedFeature}
                onClose={() => setSelectedId(null)}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}