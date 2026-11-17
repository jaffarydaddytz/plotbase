import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

import {
  ArrowLeft,
  MapPin,
  Layers3,
  Loader2,
  AlertCircle,
  Wallet,
} from "lucide-react";

import Navbar from "../../components/common/Navbar";
import API_URL from "../../config";
import GeoJsonPreview from "../company/projects/GeoJsonPreview";

// ==========================================
// HELPERS
// ==========================================

const formatNumber = (value) =>
  new Intl.NumberFormat("en-TZ").format(Number(value) || 0);

const formatPrice = (value) =>
  `TZS ${formatNumber(value)}`;

// ==========================================
// PUBLIC PROJECT DETAILS
// ==========================================

const PublicProjectDetails = () => {
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ========================================
  // FETCH PUBLIC PROJECT
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    const fetchProject = async () => {
      setLoading(true);
      setError("");

      try {
        const { data } = await axios.get(
          `${API_URL}/api/project/${projectId}`,
          {
            signal: controller.signal,
          }
        );

        if (!data?.project) {
          throw new Error("Project not found.");
        }

        setProject(data.project);
        setPlots(data.plots || null);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load project."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchProject();

    return () => controller.abort();
  }, [projectId]);

  // ========================================
  // PLOT STATISTICS
  // ========================================

  const features = useMemo(() => {
    return Array.isArray(plots?.features)
      ? plots.features
      : [];
  }, [plots]);

  const availablePlots = useMemo(() => {
    return features.filter(
      (feature) =>
        feature.properties?.status === "AVAILABLE"
    );
  }, [features]);

  const totalArea = useMemo(() => {
    return features.reduce(
      (total, feature) =>
        total +
        (Number(feature.properties?.areaSqm) || 0),
      0
    );
  }, [features]);

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">

        {/* BACK */}

        <Link
          to={project?.projectType === "MASHAMBA" ? "/mashamba" : "/viwanja"}
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-950"
        >
          <ArrowLeft size={15} />
          Back to Projects
        </Link>

        {/* LOADING */}

        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white p-12 text-sm text-zinc-500">
            <Loader2
              size={18}
              className="animate-spin"
            />
            Loading project...
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-red-700">
              <AlertCircle size={17} />
              {error}
            </div>
          </div>
        )}

        {/* PROJECT */}

        {!loading && project && (
          <>
            {/* HEADER */}

            <div className="rounded-xl border border-zinc-200 bg-white p-5">

              <div className="flex flex-wrap items-start justify-between gap-3">

                <div>
                  <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
                    {project.title}
                  </h1>

                  <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-500">
                    <MapPin size={15} />
                    {project.location || "Location unavailable"}
                  </p>
                </div>

                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Published
                </span>

              </div>

              <p className="mt-4 text-sm leading-6 text-zinc-600">
                {project.description}
              </p>

            </div>

            {/* STATISTICS */}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <Layers3
                  size={17}
                  className="text-zinc-500"
                />

                <p className="mt-2 text-xs text-zinc-500">
                  Total Plots
                </p>

                <p className="mt-1 text-lg font-semibold text-zinc-950">
                  {formatNumber(features.length)}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <Layers3
                  size={17}
                  className="text-zinc-500"
                />

                <p className="mt-2 text-xs text-zinc-500">
                  Available Plots
                </p>

                <p className="mt-1 text-lg font-semibold text-zinc-950">
                  {formatNumber(availablePlots.length)}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <Wallet
                  size={17}
                  className="text-zinc-500"
                />

                <p className="mt-2 text-xs text-zinc-500">
                  Price Per Sqm
                </p>

                <p className="mt-1 text-lg font-semibold text-zinc-950">
                  {formatPrice(project.pricePerSqm)}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <MapPin
                  size={17}
                  className="text-zinc-500"
                />

                <p className="mt-2 text-xs text-zinc-500">
                  Total Area
                </p>

                <p className="mt-1 text-lg font-semibold text-zinc-950">
                  {formatNumber(totalArea)} sqm
                </p>
              </div>

            </div>

            {/* PROJECT MAP */}

            <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">

              <div className="border-b border-zinc-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-zinc-950">
                  Project Map
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Explore the project's plot locations.
                </p>
              </div>

              {features.length > 0 ? (
                <div className="p-4">
                  <GeoJsonPreview data={plots} />
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-zinc-500">
                  Map information is unavailable.
                </div>
              )}

            </section>

            {/* AVAILABLE PLOTS */}

            <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">

              <div className="border-b border-zinc-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-zinc-950">
                  Available Plots
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  {availablePlots.length} plots available
                </p>
              </div>

              {availablePlots.length === 0 ? (
                <p className="p-6 text-center text-sm text-zinc-500">
                  No available plots at the moment.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">

                    <thead className="bg-zinc-50 text-zinc-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">
                          Plot Number
                        </th>

                        <th className="px-4 py-3 font-medium">
                          Area
                        </th>

                        <th className="px-4 py-3 font-medium">
                          Price
                        </th>

                        <th className="px-4 py-3 font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-zinc-100">

                      {availablePlots.map((feature, index) => {
                        const plot = feature.properties || {};

                        return (
                          <tr key={String(plot.id || index)}>

                            <td className="px-4 py-3 font-medium text-zinc-900">
                              {plot.plotNumber || "—"}
                            </td>

                            <td className="px-4 py-3 text-zinc-600">
                              {formatNumber(plot.areaSqm)} sqm
                            </td>

                            <td className="px-4 py-3 text-zinc-800">
                              {formatPrice(plot.totalPrice)}
                            </td>

                            <td className="px-4 py-3">
                              <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                                Available
                              </span>
                            </td>

                          </tr>
                        );
                      })}

                    </tbody>

                  </table>
                </div>
              )}

            </section>

          </>
        )}

      </main>
    </div>
  );
};

export default PublicProjectDetails;