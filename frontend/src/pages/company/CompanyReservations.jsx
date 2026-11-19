import { useEffect, useState } from "react";
import {
  useOutletContext,
  useParams,
} from "react-router-dom";

import axios from "axios";

import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

import API_URL from "../../config";
import { useAuth } from "../../context/AuthContext";

// ==========================================
// CONFIGURATION
// ==========================================

const PAGE_SIZE = 10;

const VIEW_ROLES = [
  "COMPANY_ADMIN",
  "MANAGER",
  "SALES_OFFICER",
  "ACCOUNTANT",
];

const CONFIRM_ROLES = [
  "COMPANY_ADMIN",
  "MANAGER",
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
];

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

const numberFormatter = new Intl.NumberFormat("en-TZ");

const formatNumber = (value) =>
  numberFormatter.format(Number(value) || 0);

const formatPrice = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

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

const isExpired = (expiresAt) => {
  if (!expiresAt) return false;

  const deadline = new Date(expiresAt).getTime();

  return (
    Number.isFinite(deadline) &&
    deadline <= Date.now()
  );
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

// ==========================================
// STATUS BADGE
// ==========================================

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${
      statusStyles[status] ||
      "border-zinc-200 bg-zinc-50 text-zinc-600"
    }`}
  >
    {status
      ? status.charAt(0) +
        status.slice(1).toLowerCase()
      : "Unknown"}
  </span>
);

// ==========================================
// DETAIL ROW
// ==========================================

const DetailRow = ({ label, children }) => (
  <div className="flex items-start justify-between gap-3 text-xs">
    <span className="shrink-0 text-zinc-500">
      {label}
    </span>

    <span className="min-w-0 break-words text-right font-medium text-zinc-900">
      {children}
    </span>
  </div>
);

// ==========================================
// COMPANY RESERVATIONS
// ==========================================

const CompanyReservations = () => {
  const { companyId } = useParams();

  const { token } = useAuth();

  const { workspace } = useOutletContext() || {};

  // ========================================
  // COMPANY PERMISSIONS
  // ========================================

  const canViewReservations =
    VIEW_ROLES.includes(workspace?.role);

  const canConfirmReservations =
    CONFIRM_ROLES.includes(workspace?.role);

  // ========================================
  // STATE
  // ========================================

  const [reservations, setReservations] =
    useState([]);

  const [pagination, setPagination] =
    useState(EMPTY_PAGINATION);

  const [page, setPage] = useState(1);

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [projectSelection, setProjectSelection] =
    useState({
      companyId: null,
      projectId: "ALL",
    });

  const projectFilter =
    projectSelection.companyId === companyId
      ? projectSelection.projectId
      : "ALL";

  const [projectsResult, setProjectsResult] =
    useState({
      companyId: null,
      loading: true,
      projects: [],
      error: "",
    });

  const projectsLoading =
    projectsResult.companyId !== companyId ||
    projectsResult.loading;

  const projects =
    projectsResult.companyId === companyId
      ? projectsResult.projects
      : [];

  const projectsError =
    projectsResult.companyId === companyId
      ? projectsResult.error
      : "";

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  const queryKey = JSON.stringify([
    companyId,
    page,
    statusFilter,
    projectFilter,
    refreshKey,
  ]);

  const [loadedQueryKey, setLoadedQueryKey] =
    useState(null);

  const [
    selectedReservation,
    setSelectedReservation,
  ] = useState(null);

  const [confirming, setConfirming] =
    useState(false);

  const [confirmError, setConfirmError] =
    useState("");

  // ========================================
  // FETCH COMPANY PROJECTS
  // ========================================

  useEffect(() => {
    if (
      !token ||
      !companyId ||
      !canViewReservations
    ) {
      return;
    }

    const controller = new AbortController();

    const loadProjects = async () => {
      setProjectsResult({
        companyId,
        loading: true,
        projects: [],
        error: "",
      });

      try {
        const { data } = await axios.get(
          `${API_URL}/api/companies/${companyId}/projects`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },

            signal: controller.signal,
          }
        );

        if (
          !data?.success ||
          !Array.isArray(data.projects)
        ) {
          throw new Error(
            "Invalid company projects response."
          );
        }

        if (!controller.signal.aborted) {
          setProjectsResult({
            companyId,
            loading: false,
            projects: data.projects,
            error: "",
          });
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          axios.isCancel(err)
        ) {
          return;
        }

        setProjectsResult({
          companyId,
          loading: false,
          projects: [],
          error:
            err.response?.data?.message ||
            err.message ||
            "Failed to load projects.",
        });
      }
    };

    // Defer the initial state updates
    // outside synchronous effect execution.

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        void loadProjects();
      }
    });

    return () => controller.abort();
  }, [token, companyId, canViewReservations]);

  // ========================================
  // FETCH COMPANY RESERVATIONS
  // ========================================

  useEffect(() => {
    if (
      !token ||
      !companyId ||
      !canViewReservations
    ) {
      return;
    }

    const controller = new AbortController();

    const loadReservations = async () => {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: PAGE_SIZE,
      };

      // STATUS FILTER

      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      // PROJECT FILTER

      if (projectFilter !== "ALL") {
        params.projectId = projectFilter;
      }

      try {
        const { data } = await axios.get(
          `${API_URL}/api/companies/${companyId}/reservations`,
          {
            params,

            headers: {
              Authorization: `Bearer ${token}`,
            },

            signal: controller.signal,
          }
        );

        if (
          !data?.success ||
          !Array.isArray(data.reservations)
        ) {
          throw new Error(
            "Invalid company reservations response."
          );
        }

        if (!controller.signal.aborted) {
          setReservations(data.reservations);

          setPagination(
            data.pagination || EMPTY_PAGINATION
          );

          setLoadedQueryKey(queryKey);
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          axios.isCancel(err)
        ) {
          return;
        }

        setReservations([]);

        setPagination(EMPTY_PAGINATION);

        setLoadedQueryKey(queryKey);

        setError(
          err.response?.data?.message ||
          err.message ||
          "Failed to load company reservations."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        void loadReservations();
      }
    });

    return () => controller.abort();
  }, [
    token,
    companyId,
    canViewReservations,
    page,
    statusFilter,
    projectFilter,
    refreshKey,
    queryKey,
  ]);

  // ========================================
  // DERIVED LOADING STATE
  // ========================================

  const isLoading =
    loading || loadedQueryKey !== queryKey;

  // ========================================
  // MANUAL REFRESH
  // ========================================

  const handleRefresh = () => {
    if (isLoading) return;

    setLoading(true);
    setError("");

    setRefreshKey((value) => value + 1);
  };

  // ========================================
  // STATUS FILTER
  // ========================================

  const handleStatusChange = (event) => {
    setLoading(true);
    setError("");
    setNotice("");

    setPage(1);

    setStatusFilter(event.target.value);
  };

  // ========================================
  // PROJECT FILTER
  // ========================================

  const handleProjectChange = (event) => {
    setLoading(true);
    setError("");
    setNotice("");

    setPage(1);

    setProjectSelection({
      companyId,
      projectId: event.target.value,
    });
  };

  // ========================================
  // PAGINATION
  // ========================================

  const handleChangePage = (nextPage) => {
    if (
      isLoading ||
      nextPage < 1 ||
      nextPage > pagination.totalPages
    ) {
      return;
    }

    setLoading(true);
    setError("");

    setPage(nextPage);
  };

  // ========================================
  // OPEN CONFIRMATION DIALOG
  // ========================================

  const handleOpenConfirmation = (reservation) => {
    if (
      !canConfirmReservations ||
      reservation?.status !== "PENDING" ||
      isExpired(reservation.expiresAt)
    ) {
      return;
    }

    setConfirmError("");

    setSelectedReservation(reservation);
  };

  // ========================================
  // CLOSE CONFIRMATION DIALOG
  // ========================================

  const handleCloseConfirmation = () => {
    if (confirming) return;

    setSelectedReservation(null);
    setConfirmError("");
  };

  // ========================================
  // CONFIRM RESERVATION
  // ========================================

  const handleConfirmReservation = async () => {
    if (
      !selectedReservation ||
      !token ||
      !canConfirmReservations ||
      confirming
    ) {
      return;
    }

    setConfirming(true);
    setConfirmError("");
    setNotice("");

    try {
      const { data } = await axios.patch(
        `${API_URL}/api/companies/${companyId}/reservations/${selectedReservation.id}/confirm`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!data?.success) {
        throw new Error(
          "Reservation confirmation failed."
        );
      }

      setSelectedReservation(null);

      setNotice(
        "Reservation confirmed successfully."
      );

      // Reload authoritative reservation data.

      setLoading(true);

      setRefreshKey((value) => value + 1);
    } catch (err) {
      setConfirmError(
        err.response?.data?.message ||
        err.message ||
        "Unable to confirm reservation."
      );
    } finally {
      setConfirming(false);
    }
  };

  // ========================================
  // PAGINATION DISPLAY VALUES
  // ========================================

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
  // ACCESS RESTRICTION
  // ========================================

  if (!canViewReservations) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-6">
        <h1 className="text-base font-semibold text-zinc-950">
          Access Restricted
        </h1>

        <p className="mt-2 text-sm text-zinc-600">
          Your company role does not permit access
          to reservation management.
        </p>
      </div>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-4">

      {/* ==================================
          PAGE HEADER
      ================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3">

        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-950">
            Reservations
          </h1>

          <p className="mt-1 text-xs text-zinc-500">
            Review and manage plot reservations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={
              isLoading ? "animate-spin" : ""
            }
          />

          Refresh
        </button>

      </div>

      {/* ==================================
          FILTERS
      ================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3">

        <div className="flex items-center gap-2">

          <CalendarCheck
            size={17}
            className="text-zinc-600"
          />

          <span className="text-xs font-medium text-zinc-900">
            {isLoading
              ? "Loading"
              : formatNumber(
                  pagination.total
                )}{" "}
            matching reservations
          </span>

        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">

          {/* PROJECT FILTER */}

          <select
            value={projectFilter}
            onChange={handleProjectChange}
            disabled={projectsLoading}
            aria-label="Filter reservations by project"
            className="h-9 min-w-[170px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-950 disabled:opacity-50 sm:flex-none"
          >
            <option value="ALL">
              {projectsLoading
                ? "Loading projects..."
                : "All Projects"}
            </option>

            {projects.map((project) => (
              <option
                key={project.id}
                value={project.id}
              >
                {project.title}
              </option>
            ))}
          </select>

          {/* STATUS FILTER */}

          <select
            value={statusFilter}
            onChange={handleStatusChange}
            aria-label="Filter reservations by status"
            className="h-9 min-w-[170px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-950 sm:flex-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>

        </div>

      </div>

      {/* ==================================
          PROJECT FILTER ERROR
      ================================== */}

      {projectsError && (
        <p
          role="alert"
          className="text-xs text-red-600"
        >
          Project filter unavailable:{" "}
          {projectsError}
        </p>
      )}

      {/* ==================================
          SUCCESS MESSAGE
      ================================== */}

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2
              size={15}
              className="shrink-0"
            />

            {notice}
          </span>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ==================================
          ERROR MESSAGE
      ================================== */}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          <AlertCircle
            size={16}
            className="shrink-0"
          />

          <span>{error}</span>
        </div>
      )}

      {/* ==================================
          LOADING STATE
      ================================== */}

      {isLoading && (
        <div className="flex min-h-[220px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-500">
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

      {!isLoading &&
        !error &&
        reservations.length === 0 && (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-center">

            <Clock3
              size={28}
              className="text-zinc-400"
            />

            <h2 className="mt-3 text-sm font-semibold text-zinc-950">
              No reservations found
            </h2>

            <p className="mt-1 max-w-sm text-xs text-zinc-500">
              No reservations match the selected
              project and status.
            </p>

          </div>
        )}

      {/* ==================================
          RESERVATION CARDS
      ================================== */}

      {!isLoading &&
        !error &&
        reservations.length > 0 && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">

            {reservations.map((reservation) => {
              const pending =
                reservation.status === "PENDING";

              const overdue =
                pending &&
                isExpired(reservation.expiresAt);

              const canConfirm =
                canConfirmReservations &&
                pending &&
                !overdue;

              return (
                <article
                  key={reservation.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white"
                >

                  {/* CARD HEADER */}

                  <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">

                    <div className="min-w-0">

                      <h2 className="truncate text-sm font-semibold text-zinc-950">
                        {reservation.project?.title ||
                          "Project unavailable"}
                      </h2>

                      <p className="mt-1 text-[11px] text-zinc-500">
                        Plot{" "}
                        {reservation.plot?.plotNumber ??
                          "—"}
                      </p>

                    </div>

                    <StatusBadge
                      status={reservation.status}
                    />

                  </div>

                  {/* CARD DETAILS */}

                  <div className="flex-1 space-y-2.5 px-4 py-3">

                    <DetailRow label="Investor">
                      {reservation.investor?.name ||
                        "—"}
                    </DetailRow>

                    <DetailRow label="Email">
                      <span className="break-all">
                        {reservation.investor?.email ||
                          "—"}
                      </span>
                    </DetailRow>

                    <DetailRow label="Area">
                      {reservation.plot?.areaSqm != null
                        ? `${formatNumber(
                            reservation.plot.areaSqm
                          )} sqm`
                        : "—"}
                    </DetailRow>

                    <DetailRow label="Reserved">
                      {formatDate(
                        reservation.createdAt
                      )}
                    </DetailRow>

                    {(pending ||
                      reservation.status ===
                        "EXPIRED") && (
                      <DetailRow label="Expires">
                        {formatDate(
                          reservation.expiresAt
                        )}
                      </DetailRow>
                    )}

                    {reservation.confirmedAt && (
                      <DetailRow label="Confirmed">
                        {formatDate(
                          reservation.confirmedAt
                        )}
                      </DetailRow>
                    )}

                    {reservation.cancelledAt && (
                      <DetailRow label="Cancelled">
                        {formatDate(
                          reservation.cancelledAt
                        )}
                      </DetailRow>
                    )}

                    {overdue && (
                      <p className="rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                        Deadline passed. Awaiting
                        expiry processing.
                      </p>
                    )}

                  </div>

                  {/* RESERVED PRICE */}

                  <div className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">

                    <span className="text-xs text-zinc-500">
                      Reserved Price
                    </span>

                    <strong className="text-sm font-semibold text-zinc-950">
                      {formatPrice(
                        reservation.totalPrice
                      )}
                    </strong>

                  </div>

                  {/* ACTIONS */}

                  <div className="flex items-center justify-end border-t border-zinc-100 px-4 py-3">

                    {canConfirm ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenConfirmation(
                            reservation
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                      >
                        <CheckCircle2 size={14} />

                        Confirm Reservation
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-400">
                        {pending && overdue
                          ? "Confirmation unavailable"
                          : "No action available"}
                      </span>
                    )}

                  </div>

                </article>
              );
            })}

          </div>
        )}

      {/* ==================================
          PAGINATION
      ================================== */}

      {!isLoading &&
        !error &&
        pagination.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">

            <p className="text-xs text-zinc-500">
              Showing {firstRecord}–{lastRecord} of{" "}
              {formatNumber(pagination.total)}
            </p>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() =>
                  handleChangePage(page - 1)
                }
                disabled={
                  !pagination.hasPreviousPage ||
                  isLoading
                }
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-xs text-zinc-600">
                {pagination.page} /{" "}
                {pagination.totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  handleChangePage(page + 1)
                }
                disabled={
                  !pagination.hasNextPage ||
                  isLoading
                }
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              >
                Next
              </button>

            </div>

          </div>
        )}

      {/* ==================================
          CONFIRMATION DIALOG
      ================================== */}

      {selectedReservation && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-3 py-4">

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-reservation-title"
            className="w-full max-w-[420px] rounded-xl border border-zinc-200 bg-white p-5 shadow-xl"
          >

            {/* DIALOG HEADER */}

            <div className="flex items-start justify-between gap-3">

              <div>
                <h2
                  id="confirm-reservation-title"
                  className="text-base font-semibold text-zinc-950"
                >
                  Confirm Reservation?
                </h2>

                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Confirm this investor's reservation.
                  The plot will remain reserved.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseConfirmation}
                disabled={confirming}
                aria-label="Close confirmation dialog"
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
              >
                <X size={17} />
              </button>

            </div>

            {/* RESERVATION DETAILS */}

            <div className="mt-4 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">

              <DetailRow label="Investor">
                {selectedReservation.investor?.name ||
                  "—"}
              </DetailRow>

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

            {/* CONFIRMATION ERROR */}

            {confirmError && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
              >
                <AlertCircle
                  size={15}
                  className="shrink-0"
                />

                <span>{confirmError}</span>
              </div>
            )}

            {/* DIALOG ACTIONS */}

            <div className="mt-4 flex justify-end gap-2">

              <button
                type="button"
                onClick={handleCloseConfirmation}
                disabled={confirming}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReservation}
                disabled={confirming}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {confirming && (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                )}

                {confirming
                  ? "Confirming..."
                  : "Confirm Reservation"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default CompanyReservations;