import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import axios from "axios";

import {
  ArrowLeft,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock3,
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
  const amount = Number(value);

  return Number.isFinite(amount)
    ? `TZS ${formatNumber(amount)}`
    : "—";
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

const statusColors = {
  AVAILABLE:
    "border-emerald-200 bg-emerald-50 text-emerald-700",

  RESERVED:
    "border-amber-200 bg-amber-50 text-amber-700",

  SOLD:
    "border-red-200 bg-red-50 text-red-700",
};

// ==========================================
// MAP LEGEND
// ==========================================

const LegendItem = ({
  color,
  children,
  outline = false,
}) => (
  <span className="inline-flex shrink-0 items-center gap-1.5">
    <span
      className={`h-2.5 w-2.5 rounded-[3px] ${
        outline
          ? "border-2 border-zinc-950 bg-white"
          : color
      }`}
      aria-hidden="true"
    />

    {children}
  </span>
);

// ==========================================
// PUBLIC PROJECT DETAILS
// ==========================================

const PublicProjectDetails = () => {
  const { projectId } = useParams();

  const navigate = useNavigate();
  const location = useLocation();

  const {
    token,
    loading: authLoading,
  } = useAuth();

  // ========================================
  // PROJECT STATE
  // ========================================

  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState(null);

  const [selectedPlotId, setSelectedPlotId] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ========================================
  // BOOKING STATE
  // ========================================

  const [bookingOpen, setBookingOpen] = useState(false);

  const [bookingLoading, setBookingLoading] =
    useState(false);

  const [bookingError, setBookingError] = useState("");

  const [bookingSuccess, setBookingSuccess] =
    useState(null);

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

  // ==========================================
// CANONICAL PROJECT URL
// ==========================================

useEffect(() => {
  if (!project || !projectId) return;

  // Do not redirect while displaying
  // data for a previous project.

  if (String(project.id) !== String(projectId)) {
    return;
  }

  // Preserve legacy projects that do not
  // have a supported marketplace category.

  if (
    !["VIWANJA", "MASHAMBA"].includes(
      project.projectType
    )
  ) {
    return;
  }

  // Generate a readable slug from
  // the actual project title.

  const slug =
    String(project.title || "project")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project";

  const category =
    project.projectType === "MASHAMBA"
      ? "mashamba"
      : "viwanja";

  const canonicalPath =
    `/${category}/${slug}/${encodeURIComponent(projectId)}`;

  // Redirect old or incorrect URLs
  // without adding browser history entries.

  if (location.pathname !== canonicalPath) {
    navigate(
      `${canonicalPath}${location.search}${location.hash}`,
      { replace: true }
    );
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
  // REFRESH PROJECT AVAILABILITY
  // ========================================

  const refreshProject = async () => {
    const { data } = await axios.get(
      `${API_URL}/api/project/${projectId}`
    );

    if (!data?.project) {
      throw new Error("Unable to refresh project.");
    }

    setProject(data.project);
    setPlots(data.plots || null);
  };

  // ========================================
  // GEOJSON FEATURES
  // ========================================

  const features = useMemo(() => {
    return Array.isArray(plots?.features)
      ? plots.features
      : [];
  }, [plots]);

  // ========================================
  // AVAILABLE PLOTS
  // ========================================

  const availablePlots = useMemo(() => {
    return features.filter(
      (feature) =>
        feature.properties?.status === "AVAILABLE"
    );
  }, [features]);

  // ========================================
  // STARTING PRICE
  // ========================================

  const startingPrice = useMemo(() => {
    const prices = availablePlots
      .map((feature) =>
        Number(feature.properties?.totalPrice)
      )
      .filter(
        (price) =>
          Number.isFinite(price) && price > 0
      );

    return prices.length
      ? Math.min(...prices)
      : null;
  }, [availablePlots]);

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

        return (
          id != null &&
          String(id) === String(selectedPlotId)
        );
      }) || null
    );
  }, [features, selectedPlotId]);

  const selectedPlot =
    selectedFeature?.properties || null;

  const selectedStatus = String(
    selectedPlot?.status || "UNKNOWN"
  ).toUpperCase();

  const isAvailable =
    selectedStatus === "AVAILABLE";

  const hasValidPrice =
    Number(selectedPlot?.totalPrice) > 0;

  const canBook =
    selectedPlot &&
    isAvailable &&
    hasValidPrice;

  // ========================================
  // HANDLE PLOT SELECTION
  // ========================================

  const handleSelectPlot = (plotId) => {
    if (plotId == null || bookingLoading) return;

    setBookingSuccess(null);
    setBookingError("");

    setSelectedPlotId((previousId) =>
      previousId != null &&
      String(previousId) === String(plotId)
        ? null
        : String(plotId)
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
      if (
        event.key === "Escape" &&
        !bookingLoading
      ) {
        setBookingOpen(false);
        setBookingError("");
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [bookingOpen, bookingLoading]);

  // ========================================
  // UPDATE PLOT STATUS LOCALLY
  // ========================================

  const markPlotReserved = (plotId) => {
    setPlots((previous) => {
      if (
        !previous ||
        !Array.isArray(previous.features)
      ) {
        return previous;
      }

      return {
        ...previous,

        features: previous.features.map(
          (feature) => {
            const featureId =
              getFeatureId(feature);

            if (
              String(featureId) !==
              String(plotId)
            ) {
              return feature;
            }

            return {
              ...feature,

              properties: {
                ...feature.properties,
                status: "RESERVED",
              },
            };
          }
        ),
      };
    });
  };

  // ========================================
  // CONFIRM BOOKING
  // ========================================

  const handleConfirmBooking = async () => {
    if (
      bookingLoading ||
      !token ||
      !canBook ||
      selectedPlotId == null
    ) {
      return;
    }

    const plotId = String(selectedPlotId);

    setBookingLoading(true);
    setBookingError("");

    try {
      // Only projectId and plotId are sent.
      // The backend determines all other
      // reservation information.

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
        }
      );

      if (
        !data?.success ||
        !data?.reservation
      ) {
        throw new Error(
          "Reservation could not be completed."
        );
      }

      const reservation = data.reservation;

      // Immediately update the selected
      // plot so the map reflects booking.

      markPlotReserved(
        reservation.plotId || plotId
      );

      setBookingSuccess({
        plotNumber:
          reservation.plotNumber ||
          selectedPlot.plotNumber,

        expiresAt:
          reservation.expiresAt,

        reservationId:
          reservation.id,
      });

      setBookingOpen(false);

      // Refresh authoritative availability
      // from the backend after booking.
      //
      // If refreshing fails, retain the
      // locally updated RESERVED status.

      try {
        await refreshProject();
      } catch (refreshError) {
        console.error(
          "Unable to refresh plot availability:",
          refreshError
        );
      }

    } catch (err) {
      const status = err.response?.status;

      const message =
        err.response?.data?.message ||
        err.message ||
        "Unable to reserve this plot.";

      setBookingError(message);

      // A conflict may mean another investor
      // reserved the plot first.
      //
      // Refresh the map to show the current
      // availability reported by the server.

      if (status === 409 || status === 404) {
        try {
          await refreshProject();
        } catch (refreshError) {
          console.error(
            "Unable to refresh plot availability:",
            refreshError
          );
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
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-zinc-50 pt-[60px]">
      <Navbar />

      <main className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col gap-2 overflow-hidden px-3 py-2 sm:px-4 lg:px-6">

        {/* ==================================
            LOADING
        ================================== */}

        {loading && (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-zinc-500">
            <Loader2
              size={17}
              className="animate-spin"
            />

            Loading project...
          </div>
        )}

        {/* ==================================
            ERROR
        ================================== */}

        {!loading && error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={17} />
            {error}
          </div>
        )}

        {/* ==================================
            PROJECT CONTENT
        ================================== */}

        {!loading && !error && project && (
          <>
            {/* ==============================
                COMPACT PROJECT HEADER
            ============================== */}

            <header className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-2">

              <div className="flex min-w-0 items-center gap-2">

                <Link
                  to={
                    project.projectType === "MASHAMBA"
                      ? "/mashamba"
                      : "/viwanja"
                  }
                  aria-label="Back to projects"
                  title="Back to projects"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                >
                  <ArrowLeft size={16} />
                </Link>

                <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-950 sm:text-base">
                  {project.title}
                </h1>

                <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  Published
                </span>

              </div>

              {/* LOCATION + DESCRIPTION */}

              <div className="mt-1 flex min-w-0 items-center gap-3 pl-9 text-[11px] text-zinc-500">

                <span className="inline-flex max-w-[45%] shrink-0 items-center gap-1 truncate">
                  <MapPin
                    size={12}
                    className="shrink-0"
                  />

                  <span className="truncate">
                    {project.location ||
                      "Location unavailable"}
                  </span>
                </span>

                {project.description && (
                  <p
                    className="min-w-0 flex-1 truncate text-zinc-600"
                    title={project.description}
                  >
                    {project.description}
                  </p>
                )}

              </div>

              {/* INLINE STATISTICS */}

              <div className="mt-1.5 flex items-center gap-4 overflow-x-auto whitespace-nowrap border-t border-zinc-100 pt-1.5 text-[11px] sm:gap-6">

                <span>
                  <strong className="text-xs text-zinc-950">
                    {formatNumber(features.length)}
                  </strong>{" "}
                  <span className="text-zinc-500">
                    Plots
                  </span>
                </span>

                <span>
                  <strong className="text-xs text-zinc-950">
                    {formatNumber(
                      availablePlots.length
                    )}
                  </strong>{" "}
                  <span className="text-zinc-500">
                    Available
                  </span>
                </span>

                <span>
                  <strong className="text-xs text-zinc-950">
                    {formatPrice(
                      project.pricePerSqm
                    )}
                  </strong>{" "}
                  <span className="text-zinc-500">
                    /sqm
                  </span>
                </span>

                <span>
                  <span className="text-zinc-500">
                    From{" "}
                  </span>

                  <strong className="text-xs text-zinc-950">
                    {startingPrice != null
                      ? formatPrice(startingPrice)
                      : "—"}
                  </strong>
                </span>

              </div>

            </header>

            {/* ==================================
                MAIN MAP SECTION
            ================================== */}

            <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white p-2">

              {/* ==============================
                  MAP HEADER + LEGEND
              ============================== */}

              <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">

                <h2 className="text-xs font-semibold text-zinc-950">
                  Explore Plots
                </h2>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-600">

                  <LegendItem color="bg-emerald-600">
                    Available
                  </LegendItem>

                  <LegendItem color="bg-amber-600">
                    Reserved
                  </LegendItem>

                  <LegendItem color="bg-red-600">
                    Sold
                  </LegendItem>

                  <LegendItem outline>
                    Selected
                  </LegendItem>

                </div>

              </div>

              {/* ==============================
                  BOOKING SUCCESS MESSAGE
              ============================== */}

              {bookingSuccess && (
                <div
                  role="status"
                  className="absolute left-3 right-3 top-11 z-[900] rounded-lg border border-emerald-200 bg-white p-3 shadow-lg sm:left-auto sm:w-[340px]"
                >
                  <div className="flex items-start gap-2">

                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-950">
                        Plot reserved successfully
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
                        Plot{" "}
                        {bookingSuccess.plotNumber}{" "}
                        has been reserved.
                      </p>

                      <p className="mt-1 text-[11px] text-zinc-500">
                        Expires:{" "}
                        {formatDate(
                          bookingSuccess.expiresAt
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setBookingSuccess(null)
                      }
                      aria-label="Dismiss booking notification"
                      className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100"
                    >
                      <X size={14} />
                    </button>

                  </div>
                </div>
              )}

              {/* ==============================
                  MAP + SELECTED PLOT PANEL
              ============================== */}

              <div className="relative flex min-h-0 flex-1 gap-2">

                {/* MAP */}

                <div className="min-h-0 min-w-0 flex-1">

                  {features.length > 0 ? (
                    <GeoJsonPreview
                      data={plots}
                      selectable
                      fillHeight
                      selectedPlotId={selectedPlotId}
                      onSelectPlot={handleSelectPlot}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg bg-zinc-50 text-sm text-zinc-500">
                      Map information is unavailable.
                    </div>
                  )}

                </div>

                {/* ==========================
                    SELECTED PLOT PANEL
                ========================== */}

                {selectedPlot && (
                  <aside
                    aria-label={`Details for plot ${
                      selectedPlot.plotNumber ||
                      "unknown"
                    }`}
                    className="absolute inset-x-2 bottom-2 z-[800] max-h-[75%] overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 bg-white p-3 shadow-lg lg:static lg:inset-auto lg:z-auto lg:max-h-none lg:w-[300px] lg:shrink-0 lg:rounded-lg lg:p-4 lg:shadow-none"
                  >

                    {/* PANEL HEADER */}

                    <div className="flex items-start justify-between gap-2">

                      <div className="min-w-0">

                        <p className="text-[11px] text-zinc-500">
                          Selected Plot
                        </p>

                        <h3 className="truncate text-base font-semibold text-zinc-950">
                          Plot{" "}
                          {selectedPlot.plotNumber ||
                            "—"}
                        </h3>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPlotId(null)
                        }
                        aria-label="Close plot details"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                      >
                        <X size={16} />
                      </button>

                    </div>

                    {/* STATUS */}

                    <span
                      className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                        statusColors[
                          selectedStatus
                        ] ||
                        "border-zinc-200 bg-zinc-50 text-zinc-600"
                      }`}
                    >
                      {selectedStatus.charAt(0) +
                        selectedStatus
                          .slice(1)
                          .toLowerCase()}
                    </span>

                    {/* PLOT INFORMATION */}

                    <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 text-xs">

                      <div className="flex justify-between gap-3">

                        <span className="text-zinc-500">
                          Area
                        </span>

                        <strong className="text-zinc-950">
                          {formatNumber(
                            selectedPlot.areaSqm
                          )}{" "}
                          sqm
                        </strong>

                      </div>

                      <div className="flex justify-between gap-3">

                        <span className="text-zinc-500">
                          Price / sqm
                        </span>

                        <strong className="text-zinc-950">
                          {formatPrice(
                            project.pricePerSqm
                          )}
                        </strong>

                      </div>

                    </div>

                    {/* TOTAL PRICE */}

                    <div className="mt-3 rounded-lg bg-zinc-50 p-3">

                      <p className="text-[11px] text-zinc-500">
                        Total Plot Price
                      </p>

                      <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">
                        {formatPrice(
                          selectedPlot.totalPrice
                        )}
                      </p>

                    </div>

                    {/* BOOKING BUTTON */}

                    <button
                      type="button"
                      onClick={handleOpenBooking}
                      disabled={
                        !canBook ||
                        bookingLoading ||
                        authLoading
                      }
                      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                        canBook &&
                        !bookingLoading &&
                        !authLoading
                          ? "bg-zinc-950 text-white hover:bg-zinc-800"
                          : "cursor-not-allowed bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      {canBook
                        ? "Book Plot"
                        : "Unavailable"}
                    </button>

                    {isAvailable && hasValidPrice && (
                      <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-zinc-500">
                        <Clock3 size={12} />
                        24-hour reservation period
                      </p>
                    )}

                  </aside>
                )}

              </div>

            </section>
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
            if (
              event.target === event.currentTarget &&
              !bookingLoading
            ) {
              handleCloseBooking();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-dialog-title"
            className="w-full max-w-[420px] rounded-xl border border-zinc-200 bg-white p-4 shadow-xl sm:p-5"
          >

            {/* DIALOG HEADER */}

            <div className="flex items-start justify-between gap-3">

              <div>
                <h2
                  id="booking-dialog-title"
                  className="text-base font-semibold text-zinc-950"
                >
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
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
              >
                <X size={17} />
              </button>

            </div>

            {/* RESERVATION DETAILS */}

            <div className="mt-4 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs">

              <div className="flex justify-between gap-3">

                <span className="text-zinc-500">
                  Project
                </span>

                <strong className="max-w-[65%] text-right font-medium text-zinc-950">
                  {project?.title || "—"}
                </strong>

              </div>

              <div className="flex justify-between gap-3">

                <span className="text-zinc-500">
                  Plot Number
                </span>

                <strong className="text-zinc-950">
                  {selectedPlot.plotNumber ||
                    "—"}
                </strong>

              </div>

              <div className="flex justify-between gap-3">

                <span className="text-zinc-500">
                  Area
                </span>

                <strong className="text-zinc-950">
                  {formatNumber(
                    selectedPlot.areaSqm
                  )}{" "}
                  sqm
                </strong>

              </div>

              <div className="border-t border-zinc-200 pt-3">

                <div className="flex items-center justify-between gap-3">

                  <span className="text-zinc-600">
                    Total Price
                  </span>

                  <strong className="text-sm font-semibold text-zinc-950">
                    {formatPrice(
                      selectedPlot.totalPrice
                    )}
                  </strong>

                </div>

              </div>

            </div>

            {/* RESERVATION PERIOD */}

            <div className="mt-3 flex items-start gap-2 rounded-lg border border-zinc-200 p-3">

              <Clock3
                size={16}
                className="mt-0.5 shrink-0 text-zinc-600"
              />

              <p className="text-xs leading-relaxed text-zinc-600">
                Your plot will be reserved for up to{" "}
                <strong className="text-zinc-950">
                  24 hours
                </strong>
                . The company may confirm your
                reservation before it expires.
              </p>

            </div>

            {/* AUTHENTICATION MESSAGE */}

            {!token && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">

                <AlertCircle
                  size={16}
                  className="shrink-0"
                />

                <span>
                  Please log in to reserve this plot.
                </span>

              </div>
            )}

            {/* BOOKING ERROR */}

            {bookingError && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
              >
                <AlertCircle
                  size={16}
                  className="shrink-0"
                />

                <span>{bookingError}</span>
              </div>
            )}

            {/* DIALOG ACTIONS */}

            <div className="mt-4 flex items-center justify-end gap-2">

              <button
                type="button"
                onClick={handleCloseBooking}
                disabled={bookingLoading}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>

              {!token ? (
                <Link
                  to="/login"
                  className="rounded-lg bg-zinc-950 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  Go to Login
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={
                    bookingLoading ||
                    !canBook
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bookingLoading && (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  )}

                  {bookingLoading
                    ? "Reserving..."
                    : "Confirm Booking"}
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