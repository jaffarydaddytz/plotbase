import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";
import axios from "axios";

import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  X,
} from "lucide-react";

import Navbar from "../../components/common/Navbar";
import API_URL from "../../config";
import { useAuth } from "../../context/AuthContext";

// ==========================================
// CONFIGURATION
// ==========================================

const PAGE_SIZE = 10;

const EMPTY_PAGINATION = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

// ==========================================
// HELPERS
// ==========================================

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-TZ").format(
    Number(value) || 0
  );
};

const formatPrice = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return `TZS ${formatNumber(amount)}`;
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

const formatLocation = (location) => {
  if (typeof location === "string") {
    return location || "Location unavailable";
  }

  if (location && typeof location === "object") {
    const parts = [
      location.ward,
      location.district,
      location.region,
    ].filter(
      (value) =>
        typeof value === "string" &&
        value.trim()
    );

    if (parts.length > 0) {
      return parts.join(", ");
    }
  }

  return "Location unavailable";
};

const statusStyles = {
  PENDING:
    "border-amber-200 bg-amber-50 text-amber-700",

  CONFIRMED:
    "border-emerald-200 bg-emerald-50 text-emerald-700",

  CANCELLED:
    "border-zinc-200 bg-zinc-100 text-zinc-600",

  EXPIRED:
    "border-red-200 bg-red-50 text-red-700",
};

const getStatusLabel = (status) => {
  if (!status) return "Unknown";

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1).toLowerCase()
  );
};

// ==========================================
// STATUS BADGE
// ==========================================

const StatusBadge = ({ status }) => {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${
        statusStyles[status] ||
        "border-zinc-200 bg-zinc-50 text-zinc-600"
      }`}
    >
      {getStatusLabel(status)}
    </span>
  );
};

// ==========================================
// DETAIL ROW
// ==========================================

const DetailRow = ({
  label,
  children,
}) => {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="shrink-0 text-zinc-500">
        {label}
      </span>

      <span className="min-w-0 text-right font-medium text-zinc-900">
        {children}
      </span>
    </div>
  );
};

// ==========================================
// RESERVATION CARD
// ==========================================

const ReservationCard = ({
  reservation,
  onCancel,
}) => {
  const project = reservation.project;
  const plot = reservation.plot;
  const company = reservation.company;

  const isPending =
    reservation.status === "PENDING";

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">

      {/* HEADER */}

      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">

        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-zinc-950">
            {project?.title || "Project unavailable"}
          </h2>

          <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
            <MapPin size={12} className="shrink-0" />

            <span className="truncate">
              {formatLocation(project?.location)}
            </span>
          </div>
        </div>

        <StatusBadge status={reservation.status} />

      </div>

      {/* DETAILS */}

      <div className="flex-1 space-y-2.5 px-4 py-3">

        <DetailRow label="Plot Number">
          {plot?.plotNumber ?? "—"}
        </DetailRow>

        <DetailRow label="Plot Area">
          {plot?.areaSqm != null
            ? `${formatNumber(plot.areaSqm)} sqm`
            : "—"}
        </DetailRow>

        <DetailRow label="Company">
          {company?.name || "—"}
        </DetailRow>

        <DetailRow label="Reserved On">
          {formatDate(reservation.createdAt)}
        </DetailRow>

        {[
          "PENDING",
          "EXPIRED",
        ].includes(reservation.status) && (
          <DetailRow label="Expires On">
            {formatDate(reservation.expiresAt)}
          </DetailRow>
        )}

        {reservation.confirmedAt && (
          <DetailRow label="Confirmed On">
            {formatDate(reservation.confirmedAt)}
          </DetailRow>
        )}

        {reservation.cancelledAt && (
          <DetailRow label="Cancelled On">
            {formatDate(reservation.cancelledAt)}
          </DetailRow>
        )}

      </div>

      {/* PRICE */}

      <div className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">

        <span className="text-xs text-zinc-500">
          Reserved Price
        </span>

        <strong className="text-sm font-semibold text-zinc-950">
          {formatPrice(reservation.totalPrice)}
        </strong>

      </div>

      {/* ACTIONS */}

      <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-4 py-3">

        {project?.id ? (
          <Link
            to={`/project/${project.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-950"
          >
            View Project
            <ArrowRight size={13} />
          </Link>
        ) : (
          <span className="text-xs text-zinc-400">
            Project unavailable
          </span>
        )}

        {isPending && (
          <button
            type="button"
            onClick={() => onCancel(reservation)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Cancel Reservation
          </button>
        )}

      </div>

    </article>
  );
};

// ==========================================
// MY RESERVATIONS PAGE
// ==========================================

const MyReservations = () => {
  const { token } = useAuth();

  // ========================================
  // STATE
  // ========================================

  const [reservations, setReservations] =
    useState([]);

  const [pagination, setPagination] =
    useState(EMPTY_PAGINATION);

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [
    selectedReservation,
    setSelectedReservation,
  ] = useState(null);

  const [cancelling, setCancelling] =
    useState(false);

  const [cancelError, setCancelError] =
    useState("");

  // Prevent outdated requests from
  // overwriting newer reservation data.

  const requestSequence = useRef(0);

  // ========================================
  // FETCH RESERVATIONS
  // ========================================

  const fetchReservations = useCallback(
    async ({ signal } = {}) => {
      if (!token) return;

      const requestId =
        ++requestSequence.current;

      try {
        const { data } = await axios.get(
          `${API_URL}/api/reservations/my`,
          {
            params: {
              page,
              limit: PAGE_SIZE,
            },

            headers: {
              Authorization: `Bearer ${token}`,
            },

            signal,
          }
        );

        // Ignore stale or aborted requests.

        if (
          signal?.aborted ||
          requestId !== requestSequence.current
        ) {
          return;
        }

        if (
          data?.success !== true ||
          !Array.isArray(data.reservations)
        ) {
          throw new Error(
            "Unable to retrieve reservations."
          );
        }

        setReservations(data.reservations);

        setPagination(
          data.pagination || EMPTY_PAGINATION
        );

        setError("");

      } catch (err) {
        if (
          signal?.aborted ||
          axios.isCancel(err) ||
          requestId !== requestSequence.current
        ) {
          return;
        }

        setError(
          err.response?.data?.message ||
          err.message ||
          "Failed to load reservations."
        );

      } finally {
        if (
          !signal?.aborted &&
          requestId === requestSequence.current
        ) {
          setLoading(false);
        }
      }
    },
    [token, page]
  );

  // ========================================
  // INITIAL LOAD AND PAGE CHANGES
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    // Defer the initial request to avoid
    // synchronous state updates in useEffect.

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        void fetchReservations({
          signal: controller.signal,
        });
      }
    });

    return () => {
      controller.abort();

      // Invalidate requests from the
      // previous page or auth session.

      requestSequence.current += 1;
    };
  }, [fetchReservations]);

  // ========================================
  // MANUAL REFRESH
  // ========================================

  const handleRefresh = () => {
    if (loading) return;

    setLoading(true);
    setError("");

    void fetchReservations();
  };

  // ========================================
  // OPEN CANCELLATION
  // ========================================

  const handleOpenCancel = (reservation) => {
    if (
      !reservation ||
      reservation.status !== "PENDING"
    ) {
      return;
    }

    setCancelError("");
    setSelectedReservation(reservation);
  };

  // ========================================
  // CLOSE CANCELLATION
  // ========================================

  const handleCloseCancel = () => {
    if (cancelling) return;

    setSelectedReservation(null);
    setCancelError("");
  };

  // ========================================
  // CONFIRM CANCELLATION
  // ========================================

  const handleConfirmCancel = async () => {
    if (
      !selectedReservation ||
      !token ||
      cancelling
    ) {
      return;
    }

    setCancelling(true);
    setCancelError("");
    setNotice("");

    try {
      const { data } = await axios.patch(
        `${API_URL}/api/reservations/${selectedReservation.id}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data?.success !== true) {
        throw new Error(
          "Reservation could not be cancelled."
        );
      }

      setSelectedReservation(null);

      setNotice(
        "Reservation cancelled successfully. The plot is available again."
      );

      // Reload authoritative backend data.

      await fetchReservations();

    } catch (err) {
      setCancelError(
        err.response?.data?.message ||
          err.message ||
          "Unable to cancel reservation."
      );

    } finally {
      setCancelling(false);
    }
  };

  // ========================================
  // PAGINATION
  // ========================================

  const handlePreviousPage = () => {
    if (
      loading ||
      !pagination.hasPreviousPage
    ) {
      return;
    }

    setLoading(true);
    setError("");

    setPage((previous) => previous - 1);
  };

  const handleNextPage = () => {
    if (
      loading ||
      !pagination.hasNextPage
    ) {
      return;
    }

    setLoading(true);
    setError("");

    setPage((previous) => previous + 1);
  };

  const firstRecord =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) *
          pagination.limit +
        1;

  const lastRecord = Math.min(
    pagination.page * pagination.limit,
    pagination.total
  );

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-h-dvh bg-zinc-50 pt-[60px]">

      <Navbar />

      <main className="mx-auto w-full max-w-[1250px] px-3 py-4 sm:px-5 lg:px-6">

        {/* ==================================
            PAGE HEADER
        ================================== */}

        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">

          <div className="flex items-start gap-2">

            <Link
              to="/projects"
              aria-label="Back to projects"
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
            >
              <ArrowLeft size={16} />
            </Link>

            <div>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-950">
                My Reservations
              </h1>

              <p className="mt-0.5 text-xs text-zinc-500">
                View and manage your plot reservations.
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={
                loading ? "animate-spin" : ""
              }
            />

            Refresh
          </button>

        </div>

        {/* ==================================
            SUMMARY
        ================================== */}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">

          <div>
            <p className="text-[11px] text-zinc-500">
              Total Reservations
            </p>

            <p className="mt-0.5 text-xl font-semibold text-zinc-950">
              {formatNumber(pagination.total)}
            </p>
          </div>

          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
          >
            Explore Projects
            <ArrowRight size={13} />
          </Link>

        </div>

        {/* ==================================
            SUCCESS MESSAGE
        ================================== */}

        {notice && (
          <div
            role="status"
            className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2
                size={15}
                className="shrink-0"
              />

              <span>{notice}</span>
            </div>

            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ==================================
            ERROR MESSAGE
        ================================== */}

        {error && (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle
              size={16}
              className="shrink-0"
            />

            <span>{error}</span>
          </div>
        )}

        {/* ==================================
            LOADING
        ================================== */}

        {loading && (
          <div className="flex min-h-[220px] items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-500">
            <Loader2
              size={17}
              className="animate-spin"
            />

            Loading reservations...
          </div>
        )}

        {/* ==================================
            EMPTY STATE
        ================================== */}

        {!loading &&
          !error &&
          reservations.length === 0 && (
            <div className="flex min-h-[250px] flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-center">

              <Clock3
                size={28}
                className="text-zinc-400"
              />

              <h2 className="mt-3 text-sm font-semibold text-zinc-950">
                No reservations found
              </h2>

              <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">
                Your plot reservations will appear here
                after you book a plot.
              </p>

              <Link
                to="/projects"
                className="mt-4 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Explore Projects
              </Link>

            </div>
          )}

        {/* ==================================
            RESERVATION CARDS
        ================================== */}

        {!loading &&
          !error &&
          reservations.length > 0 && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">

              {reservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onCancel={handleOpenCancel}
                />
              ))}

            </div>
          )}

        {/* ==================================
            PAGINATION
        ================================== */}

        {!loading &&
          !error &&
          pagination.total > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">

              <p className="text-xs text-zinc-500">
                Showing{" "}
                <strong className="text-zinc-900">
                  {firstRecord}–{lastRecord}
                </strong>{" "}
                of{" "}
                <strong className="text-zinc-900">
                  {formatNumber(pagination.total)}
                </strong>
              </p>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  onClick={handlePreviousPage}
                  disabled={
                    !pagination.hasPreviousPage ||
                    loading
                  }
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-xs text-zinc-600">
                  {pagination.page} /{" "}
                  {pagination.totalPages}
                </span>

                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={
                    !pagination.hasNextPage ||
                    loading
                  }
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>

              </div>

            </div>
          )}

      </main>

      {/* ======================================
          CANCELLATION CONFIRMATION DIALOG
      ====================================== */}

      {selectedReservation && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-3 py-4">

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-reservation-title"
            className="w-full max-w-[410px] rounded-xl border border-zinc-200 bg-white p-5 shadow-xl"
          >

            {/* HEADER */}

            <div className="flex items-start justify-between gap-3">

              <div>
                <h2
                  id="cancel-reservation-title"
                  className="text-base font-semibold text-zinc-950"
                >
                  Cancel Reservation?
                </h2>

                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  This will release the plot and make it
                  available for other investors.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseCancel}
                disabled={cancelling}
                aria-label="Close cancellation dialog"
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
              >
                <X size={17} />
              </button>

            </div>

            {/* RESERVATION DETAILS */}

            <div className="mt-4 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">

              <DetailRow label="Project">
                {selectedReservation.project?.title ||
                  "—"}
              </DetailRow>

              <DetailRow label="Plot">
                {selectedReservation.plot?.plotNumber ??
                  "—"}
              </DetailRow>

              <DetailRow label="Price">
                {formatPrice(
                  selectedReservation.totalPrice
                )}
              </DetailRow>

            </div>

            {/* CANCELLATION ERROR */}

            {cancelError && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
              >
                <AlertCircle
                  size={15}
                  className="shrink-0"
                />

                <span>{cancelError}</span>
              </div>
            )}

            {/* ACTIONS */}

            <div className="mt-4 flex justify-end gap-2">

              <button
                type="button"
                onClick={handleCloseCancel}
                disabled={cancelling}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Keep Reservation
              </button>

              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {cancelling && (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                )}

                {cancelling
                  ? "Cancelling..."
                  : "Confirm Cancellation"}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MyReservations;