import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import axios from "axios";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  X,
} from "lucide-react";

import Navbar from "../../components/common/Navbar";
import API_URL from "../../config";
import { useAuth } from "../../context/AuthContext";
import GeoJsonPreview from "../company/projects/GeoJsonPreview";

// ==========================================
// HELPERS
// ==========================================

const formatNumber = (value) =>
  new Intl.NumberFormat("en-TZ").format(Number(value) || 0);

const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  return Number.isFinite(amount) ? `TZS ${formatNumber(amount)}` : "—";
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-TZ", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getFeatureId = (feature) =>
  feature?.properties?.id ?? feature?.id ?? null;

const statusStyles = {
  AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-700",

  RESERVED: "border-amber-200 bg-amber-50 text-amber-700",

  SOLD: "border-red-200 bg-red-50 text-red-700",
};

// ==========================================
// MAP LEGEND
// ==========================================

const LegendItem = ({ label, color, selected = false }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
    <span
      className={`h-2.5 w-2.5 rounded-[3px] ${
        selected ? "border-2 border-zinc-950 bg-white" : color
      }`}
      aria-hidden="true"
    />

    {label}
  </span>
);

// ==========================================
// DETAILS ROW
// ==========================================

const DetailRow = ({ label, children }) => (
  <div className="flex items-start justify-between gap-3 border-b border-zinc-100 py-2.5 last:border-b-0">
    <dt className="shrink-0 text-zinc-500">{label}</dt>

    <dd className="min-w-0 text-right font-medium text-zinc-950">{children}</dd>
  </div>
);

// ==========================================
// PUBLIC PROJECT DETAILS
// ==========================================

const PublicProjectDetails = () => {
  const { projectId } = useParams();

  const navigate = useNavigate();
  const location = useLocation();

  const { token, loading: authLoading } = useAuth();

  // ========================================
  // PROJECT STATE
  // ========================================

  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState(null);

  const [selectedPlotId, setSelectedPlotId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ========================================
  // BOOKING STATE
  // ========================================

  const [bookingOpen, setBookingOpen] = useState(false);

  const [bookingLoading, setBookingLoading] = useState(false);

  const [bookingError, setBookingError] = useState("");

  const [bookingSuccess, setBookingSuccess] = useState(null);

  // ========================================
  // FETCH PROJECT
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    const fetchProject = async () => {
      setLoading(true);
      setError("");

      setProject(null);
      setPlots(null);
      setSelectedPlotId(null);

      setBookingOpen(false);
      setBookingError("");
      setBookingSuccess(null);

      try {
        const { data } = await axios.get(
          `${API_URL}/api/project/${projectId}`,
          {
            signal: controller.signal,
          },
        );

        if (!data?.project) {
          throw new Error("Project not found.");
        }

        if (controller.signal.aborted) return;

        setProject(data.project);
        setPlots(data.plots || null);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load project.",
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
  // CANONICAL PROJECT URL
  // ========================================

  useEffect(() => {
    if (!project || !projectId) return;

    if (String(project.id) !== String(projectId)) {
      return;
    }

    if (!["VIWANJA", "MASHAMBA"].includes(project.projectType)) {
      return;
    }

    const slug =
      String(project.title || "project")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "project";

    const category =
      project.projectType === "MASHAMBA" ? "mashamba" : "viwanja";

    const canonicalPath = `/${category}/${slug}/${encodeURIComponent(
      projectId,
    )}`;

    if (location.pathname !== canonicalPath) {
      navigate(`${canonicalPath}${location.search}${location.hash}`, {
        replace: true,
      });
    }
  }, [
    project,
    projectId,
    location.pathname,
    location.search,
    location.hash,
    navigate,
  ]);

  // ========================================
  // GEOJSON FEATURES
  // ========================================

  const features = useMemo(() => {
    return Array.isArray(plots?.features) ? plots.features : [];
  }, [plots]);

  // ========================================
  // AVAILABLE PLOTS
  // ========================================

  const availablePlots = useMemo(() => {
    return features.filter(
      (feature) => feature.properties?.status === "AVAILABLE",
    );
  }, [features]);

  // ========================================
  // RESERVED AND SOLD COUNTS
  // ========================================

  const reservedCount = features.filter(
    (feature) => feature.properties?.status === "RESERVED",
  ).length;

  const soldCount = features.filter(
    (feature) => feature.properties?.status === "SOLD",
  ).length;

  // ========================================
  // STARTING PRICE
  // ========================================

  const startingPrice = useMemo(() => {
    const prices = availablePlots
      .map((feature) => Number(feature.properties?.totalPrice))
      .filter((price) => Number.isFinite(price) && price > 0);

    return prices.length ? Math.min(...prices) : null;
  }, [availablePlots]);

  // ========================================
  // PLOT SIZE RANGE
  // ========================================

  const plotSizeRange = useMemo(() => {
    const sizes = features
      .map((feature) => Number(feature.properties?.areaSqm))
      .filter((area) => Number.isFinite(area) && area > 0);

    if (!sizes.length) {
      return "—";
    }

    const min = Math.min(...sizes);
    const max = Math.max(...sizes);

    if (min === max) {
      return `${formatNumber(min)} sqm`;
    }

    return `${formatNumber(min)} – ${formatNumber(max)} sqm`;
  }, [features]);

  // ========================================
  // SELECTED FEATURE
  // ========================================

  const selectedFeature = useMemo(() => {
    if (selectedPlotId == null) {
      return null;
    }

    return (
      features.find((feature) => {
        const id = getFeatureId(feature);

        return id != null && String(id) === String(selectedPlotId);
      }) || null
    );
  }, [features, selectedPlotId]);

  const selectedPlot = selectedFeature?.properties || null;

  const selectedStatus = String(
    selectedPlot?.status || "UNKNOWN",
  ).toUpperCase();

  const isAvailable = selectedStatus === "AVAILABLE";

  const hasValidPrice = Number(selectedPlot?.totalPrice) > 0;

  const canBook = Boolean(selectedPlot && isAvailable && hasValidPrice);

  const projectCategory =
    project?.projectType === "MASHAMBA" ? "Mashamba" : "Viwanja";

  // ========================================
  // HANDLE PLOT SELECTION
  // ========================================

  const handleSelectPlot = (plotId) => {
    if (plotId == null || bookingLoading) {
      return;
    }

    setBookingError("");
    setBookingSuccess(null);

    setSelectedPlotId((previousId) =>
      previousId != null && String(previousId) === String(plotId)
        ? null
        : String(plotId),
    );
  };

  // ========================================
  // OPEN BOOKING DIALOG
  // ========================================

  const handleOpenBooking = () => {
    if (!canBook || bookingLoading) return;

    setBookingError("");
    setBookingSuccess(null);
    setBookingOpen(true);
  };

  // ========================================
  // CLOSE BOOKING DIALOG
  // ========================================

  const handleCloseBooking = () => {
    if (bookingLoading) return;

    setBookingOpen(false);
    setBookingError("");
  };

  // ========================================
  // CLOSE DIALOG WITH ESCAPE
  // ========================================

  useEffect(() => {
    if (!bookingOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !bookingLoading) {
        setBookingOpen(false);
        setBookingError("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [bookingOpen, bookingLoading]);

  // ========================================
  // REFRESH PROJECT AVAILABILITY
  // ========================================

  const refreshProject = async () => {
    const { data } = await axios.get(`${API_URL}/api/project/${projectId}`);

    if (!data?.project) {
      throw new Error("Unable to refresh project.");
    }

    setProject(data.project);
    setPlots(data.plots || null);
  };

  // ========================================
  // UPDATE PLOT STATUS LOCALLY
  // ========================================

  const markPlotReserved = (plotId) => {
    setPlots((previous) => {
      if (!previous || !Array.isArray(previous.features)) {
        return previous;
      }

      return {
        ...previous,

        features: previous.features.map((feature) => {
          const featureId = getFeatureId(feature);

          if (String(featureId) !== String(plotId)) {
            return feature;
          }

          return {
            ...feature,

            properties: {
              ...feature.properties,
              status: "RESERVED",
            },
          };
        }),
      };
    });
  };

  // ========================================
  // CONFIRM BOOKING
  // ========================================

  const handleConfirmBooking = async () => {
    if (bookingLoading || !token || !canBook || selectedPlotId == null) {
      return;
    }

    const plotId = String(selectedPlotId);

    setBookingLoading(true);
    setBookingError("");

    try {
      const { data } = await axios.post(
        `${API_URL}/api/reservations`,
        {
          projectId,
          plotId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!data?.success || !data?.reservation) {
        throw new Error("Reservation could not be completed.");
      }

      const reservation = data.reservation;

      markPlotReserved(reservation.plotId || plotId);

      setBookingSuccess({
        plotNumber: reservation.plotNumber || selectedPlot.plotNumber,

        expiresAt: reservation.expiresAt,

        reservationId: reservation.id,
      });

      setBookingOpen(false);

      try {
        await refreshProject();
      } catch (refreshError) {
        console.error("Unable to refresh plot availability:", refreshError);
      }
    } catch (err) {
      const status = err.response?.status;

      const message =
        err.response?.data?.message ||
        err.message ||
        "Unable to reserve this plot.";

      setBookingError(message);

      if (status === 409 || status === 404) {
        try {
          await refreshProject();
        } catch (refreshError) {
          console.error("Unable to refresh plot availability:", refreshError);
        }
      }
    } finally {
      setBookingLoading(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-h-screen bg-zinc-50 pt-[60px]">
      <Navbar />

      <main className="mx-auto max-w-[1680px] space-y-3 px-3 pb-5 pt-3 sm:px-4 lg:px-6">
        {/* ==================================
            LOADING
        ================================== */}

        {loading && (
          <div className="flex min-h-[360px] items-center justify-center gap-2 text-sm text-zinc-500">
            <Loader2 size={17} className="animate-spin" />
            Loading project...
          </div>
        )}

        {/* ==================================
            ERROR
        ================================== */}

        {!loading && error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="shrink-0" />

            {error}
          </div>
        )}

        {/* ==================================
            PROJECT CONTENT
        ================================== */}

        {!loading && !error && project && (
          <>
            {/* ==================================
                BOOKING SUCCESS MESSAGE
            ================================== */}

            {bookingSuccess && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />

                <div className="flex-1">
                  <p className="font-semibold">
                    Plot {bookingSuccess.plotNumber} reserved successfully
                  </p>

                  <p className="text-xs">
                    Expires: {formatDate(bookingSuccess.expiresAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setBookingSuccess(null)}
                  aria-label="Dismiss notification"
                  className="rounded p-1 hover:bg-emerald-100">
                  <X size={16} />
                </button>
              </div>
            )}

            {/* ==================================
                THREE COLUMN LAYOUT
            ================================== */}

            <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(225px,0.95fr)_minmax(0,2fr)_minmax(235px,0.95fr)] xl:grid-cols-[minmax(265px,0.95fr)_minmax(0,2.1fr)_minmax(285px,0.95fr)]">
              {/* ==================================
                  LEFT: PROJECT DETAILS
              ================================== */}

              <aside
                aria-label="Project details"
                className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 lg:h-[calc(100vh-100px)] lg:min-h-[535px] lg:overflow-y-auto">
                {/* PROJECT NAME */}

                <h1 className="break-words text-base font-semibold text-zinc-950">
                  {project.title}
                </h1>

                {/* LOCATION */}

                <p className="mt-2 flex items-start gap-1.5 text-xs text-zinc-600">
                  <MapPin size={15} className="mt-px shrink-0" />

                  <span>{project.location || "Location unavailable"}</span>
                </p>

                {/* DESCRIPTION */}

                <p className="mt-3 whitespace-pre-line break-words text-[13px] leading-relaxed text-zinc-700">
                  {project.description || "No project description provided."}
                </p>

                {/* COMPACT PROJECT STATISTICS */}

                <div className="mt-3 flex items-center gap-4 border-y border-zinc-200 py-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-zinc-950">
                      {formatNumber(features.length)}
                    </span>

                    <span className="text-zinc-500">Total plots</span>
                  </div>

                  <div className="h-3 w-px bg-zinc-200" />

                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-zinc-950">
                      {formatNumber(availablePlots.length)}
                    </span>

                    <span className="text-zinc-500">Available</span>
                  </div>
                </div>

                {/* PROJECT INFORMATION */}

                <h2 className="mt-4 text-sm font-semibold text-zinc-950">
                  Project Details
                </h2>

                <dl className="mt-1 text-xs">
                  <DetailRow label="Project type">{projectCategory}</DetailRow>

                  <DetailRow label="Plot size range">{plotSizeRange}</DetailRow>

                  <DetailRow label="Price / sqm">
                    {formatPrice(project.pricePerSqm)}
                  </DetailRow>

                  <DetailRow label="Starting price">
                    {formatPrice(startingPrice)}
                  </DetailRow>

                  <DetailRow label="Reserved plots">
                    {formatNumber(reservedCount)}
                  </DetailRow>

                  <DetailRow label="Sold plots">
                    {formatNumber(soldCount)}
                  </DetailRow>
                </dl>
              </aside>

              {/* ==================================
                  CENTER: INTERACTIVE MAP
              ================================== */}

              <section
                aria-label="Explore plots"
                className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-2 lg:h-[calc(100vh-100px)] lg:min-h-[535px]">
                {/* MAP HEADER */}

                <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 px-1 pt-1">
                  <h2 className="text-sm font-semibold text-zinc-950">
                    Explore Plots
                  </h2>

                  {/* MAP LEGEND */}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-zinc-600">
                    <LegendItem label="Available" color="bg-emerald-600" />

                    <LegendItem label="Reserved" color="bg-zinc-700" />

                    <LegendItem label="Sold" color="bg-red-600" />
                  </div>
                </div>

                {/* GEOJSON MAP */}

                <div className="relative min-h-[430px] min-w-0 flex-1 overflow-hidden rounded-lg bg-zinc-100 sm:min-h-[500px] lg:min-h-0">
                  {features.length > 0 ? (
                    <GeoJsonPreview
                      data={plots}
                      selectable
                      fillHeight
                      selectedPlotId={selectedPlotId}
                      onSelectPlot={handleSelectPlot}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500">
                      Map information is unavailable.
                    </div>
                  )}
                </div>
              </section>

              {/* ==================================
                  RIGHT: SELECTED PLOT
              ================================== */}

              <aside
                aria-label="Selected plot details"
                className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 lg:h-[calc(100vh-100px)] lg:min-h-[535px] lg:overflow-y-auto">
                {/* NO PLOT SELECTED */}

                {!selectedPlot ? (
                  <>
                    <h2 className="text-sm font-semibold text-zinc-950">
                      Selected Plot
                    </h2>

                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="rounded-full border border-zinc-200 bg-zinc-50 p-3 text-zinc-500">
                        <MapPin size={22} />
                      </div>

                      <p className="mt-3 text-sm font-semibold text-zinc-900">
                        No plot selected
                      </p>

                      <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-zinc-500">
                        Select a plot on the map to see its size, price and
                        availability.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* SELECTED PLOT HEADER */}

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">Selected Plot</p>

                        <h2 className="mt-1 break-words text-xl font-semibold tracking-tight text-zinc-950">
                          Plot {selectedPlot.plotNumber || "—"}
                        </h2>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedPlotId(null)}
                        disabled={bookingLoading}
                        aria-label="Close selected plot"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:opacity-50">
                        <X size={18} />
                      </button>
                    </div>

                    {/* PLOT STATUS */}

                    <span
                      className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                        statusStyles[selectedStatus] ||
                        "border-zinc-200 bg-zinc-50 text-zinc-600"
                      }`}>
                      {selectedStatus.charAt(0) +
                        selectedStatus.slice(1).toLowerCase()}
                    </span>

                    {/* PLOT INFORMATION */}

                    <dl className="mt-5 border-t border-zinc-200 text-xs">
                      <DetailRow label="Area">
                        {selectedPlot.areaSqm != null
                          ? `${formatNumber(selectedPlot.areaSqm)} sqm`
                          : "—"}
                      </DetailRow>

                      <DetailRow label="Price / sqm">
                        {formatPrice(project.pricePerSqm)}
                      </DetailRow>
                    </dl>

                    {/* TOTAL PRICE */}

                    <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                      <p className="text-xs text-zinc-600">Total Plot Price</p>

                      <p className="mt-1 break-words text-xl font-bold tracking-tight text-emerald-700">
                        {formatPrice(selectedPlot.totalPrice)}
                      </p>
                    </div>

{/* PLOT ACTIONS */}

<div className="mt-4 grid w-full grid-cols-3 gap-2">
  {/* BUY */}
  <button
    type="button"
    disabled
    title="Purchasing coming soon"
    className="flex h-8 w-full items-center justify-center rounded-md bg-zinc-200 px-2 text-xs font-medium text-zinc-500 cursor-not-allowed"
  >
    Buy
  </button>

  {/* BOOK */}
  <button
    type="button"
    onClick={handleOpenBooking}
    disabled={!canBook || bookingLoading || authLoading}
    className="flex h-8 w-full items-center justify-center rounded-md bg-zinc-950 px-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
  >
    Book
  </button>

  {/* FIKASITE */}
  <button
    type="button"
    disabled
    title="Site visits coming soon"
    className="flex h-8 w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-2 text-xs font-medium text-zinc-500 cursor-not-allowed"
  >
    FikaSite
  </button>
</div>

                    {/* RESERVATION PERIOD */}

                    {canBook && (
                      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-500">
                        <Clock3 size={13} />
                        24-hour reservation period
                      </p>
                    )}
                  </>
                )}
              </aside>
            </div>
          </>
        )}
      </main>

      {/* ======================================
          BOOKING CONFIRMATION DIALOG
      ====================================== */}

      {bookingOpen && selectedPlot && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-3 py-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseBooking();
            }
          }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-dialog-title"
            className="w-full max-w-[420px] rounded-xl border border-zinc-200 bg-white p-4 shadow-xl sm:p-5">
            {/* DIALOG HEADER */}

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="booking-dialog-title"
                  className="text-base font-semibold text-zinc-950">
                  Reserve Plot
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Review the details before continuing.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseBooking}
                disabled={bookingLoading}
                aria-label="Close booking dialog"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50">
                <X size={18} />
              </button>
            </div>

            {/* RESERVATION DETAILS */}

            <dl className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-xs">
              <DetailRow label="Project">{project?.title || "—"}</DetailRow>

              <DetailRow label="Plot Number">
                {selectedPlot.plotNumber || "—"}
              </DetailRow>

              <DetailRow label="Area">
                {formatNumber(selectedPlot.areaSqm)} sqm
              </DetailRow>

              <DetailRow label="Total Price">
                <span className="text-sm font-semibold">
                  {formatPrice(selectedPlot.totalPrice)}
                </span>
              </DetailRow>
            </dl>

            {/* RESERVATION PERIOD */}

            <div className="mt-3 flex items-start gap-2 rounded-lg border border-zinc-200 p-3">
              <Clock3 size={16} className="mt-0.5 shrink-0 text-zinc-600" />

              <p className="text-xs leading-relaxed text-zinc-600">
                Your plot will be reserved for up to{" "}
                <strong className="text-zinc-950">24 hours</strong>. The company
                may confirm your reservation before it expires.
              </p>
            </div>

            {/* AUTHENTICATION MESSAGE */}

            {!token && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Please log in to reserve this plot.
              </p>
            )}

            {/* BOOKING ERROR */}

            {bookingError && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {bookingError}
              </p>
            )}

            {/* DIALOG ACTIONS */}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseBooking}
                disabled={bookingLoading}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
                Cancel
              </button>

              {!token ? (
                <Link
                  to="/login"
                  className="rounded-lg bg-zinc-950 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800">
                  Go to Login
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={bookingLoading || !canBook}
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
                  {bookingLoading && (
                    <Loader2 size={14} className="animate-spin" />
                  )}

                  {bookingLoading ? "Reserving..." : "Confirm Booking"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProjectDetails;
