import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Layers3,
  MapPin,
  Pencil,
  RefreshCw,
  Ruler,
  Search,
  Wallet,
} from "lucide-react";

import API_URL from "../../../config";
import { useAuth } from "../../../context/AuthContext";
import CompanyProjectMap from "./CompanyProjectMap";

const PAGE_SIZE = 20;

const formatNumber = (value) =>
  new Intl.NumberFormat("en-TZ").format(Number(value) || 0);

const formatCurrency = (value) => `TZS ${formatNumber(value)}`;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const PROJECT_STATUS_STYLES = {
  DRAFT: "border-zinc-200 bg-zinc-100 text-zinc-700",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  INACTIVE: "border-amber-200 bg-amber-50 text-amber-700",
};

const PLOT_STATUS_STYLES = {
  AVAILABLE: "bg-emerald-50 text-emerald-700",
  RESERVED: "bg-amber-50 text-amber-700",
  SOLD: "bg-zinc-100 text-zinc-700",
};

// ==========================================
// STATISTICS CARD
// ==========================================

const StatCard = ({ label, value, icon: Icon }) => (
  <div className="rounded-xl border border-zinc-200 bg-white p-4">
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium text-zinc-500">
        {label}
      </p>

      <Icon size={16} className="text-zinc-400" />
    </div>

    <p className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">
      {formatNumber(value)}
    </p>
  </div>
);

// ==========================================
// INFORMATION ROW
// ==========================================

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-3 last:border-b-0">
    <span className="text-xs text-zinc-500">
      {label}
    </span>

    <span className="text-right text-sm font-medium text-zinc-900">
      {value}
    </span>
  </div>
);

// ==========================================
// PLOT STATUS BADGE
// ==========================================

const PlotStatusBadge = ({ status }) => (
  <span
    className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${
      PLOT_STATUS_STYLES[status] ||
      "bg-zinc-100 text-zinc-600"
    }`}
  >
    {status || "UNKNOWN"}
  </span>
);

// ==========================================
// COMPANY PROJECT DETAILS
// ==========================================

const CompanyProjectDetails = () => {
  const { companyId, projectId } = useParams();
  const { token } = useAuth();

  // ========================================
  // COMPANY ROLE PERMISSIONS
  // ========================================

  const { workspace } = useOutletContext() || {};

  const canEditProject = [
    "COMPANY_ADMIN",
    "MANAGER",
  ].includes(workspace?.role);

  // Editing is allowed for DRAFT, ACTIVE,
  // and INACTIVE projects.

  const backPath = `/company/${companyId}/projects`;

  const editProjectPath =
    `${backPath}/${projectId}/edit`;

  // ========================================
  // PROJECT STATE
  // ========================================

  const [project, setProject] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  // ========================================
  // PLOT INVENTORY STATE
  // ========================================

  const [plots, setPlots] = useState([]);

  const [plotsLoading, setPlotsLoading] = useState(true);

  const [plotsError, setPlotsError] = useState("");

  const [searchInput, setSearchInput] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");

  const [page, setPage] = useState(1);

  const [plotsRefreshKey, setPlotsRefreshKey] = useState(0);

  // ========================================
  // MAP SELECTION
  // ========================================

  const [selectedPlotId, setSelectedPlotId] = useState(null);

  // ========================================
  // PAGINATION
  // ========================================

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  // Clear selected plot when switching projects.

  useEffect(() => {
    setSelectedPlotId(null);
  }, [companyId, projectId]);

  // ========================================
  // FETCH PROJECT DETAILS
  // ========================================

  useEffect(() => {
    if (!companyId || !projectId || !token) {
      setProject(null);
      setError("Project access is unavailable.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchProject = async () => {
      setLoading(true);
      setError("");
      setProject(null);

      try {
        const { data } = await axios.get(
          `${API_URL}/api/companies/${companyId}/projects/${projectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (
          data?.success !== true ||
          !data.project
        ) {
          throw new Error("Invalid project response.");
        }

        if (!controller.signal.aborted) {
          setProject(data.project);
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
          "Failed to load project details."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchProject();

    return () => controller.abort();
  }, [companyId, projectId, token, refreshKey]);

  // ========================================
  // DEBOUNCE SEARCH
  // ========================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // ========================================
  // FETCH PROJECT PLOTS
  // ========================================

  useEffect(() => {
    if (!companyId || !projectId || !token) {
      setPlots([]);
      setPlotsLoading(false);

      setPlotsError(
        "Plot inventory access is unavailable."
      );

      return;
    }

    const controller = new AbortController();

    const fetchPlots = async () => {
      setPlotsLoading(true);
      setPlotsError("");
      setPlots([]);

      try {
        const { data } = await axios.get(
          `${API_URL}/api/companies/${companyId}/projects/${projectId}/plots`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },

            params: {
              page,
              limit: PAGE_SIZE,
              status: statusFilter,
              ...(search ? { search } : {}),
            },

            signal: controller.signal,
          }
        );

        if (
          data?.success !== true ||
          !Array.isArray(data.plots) ||
          !data.pagination
        ) {
          throw new Error(
            "Invalid plot inventory response."
          );
        }

        if (!controller.signal.aborted) {
          setPlots(data.plots);
          setPagination(data.pagination);
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          axios.isCancel(err)
        ) {
          return;
        }

        setPlotsError(
          err.response?.data?.message ||
          err.message ||
          "Failed to load plot inventory."
        );
      } finally {
        if (!controller.signal.aborted) {
          setPlotsLoading(false);
        }
      }
    };

    fetchPlots();

    return () => controller.abort();

  }, [
    companyId,
    projectId,
    token,
    page,
    statusFilter,
    search,
    plotsRefreshKey,
  ]);

  // ========================================
  // ACTION HANDLERS
  // ========================================

  const refreshProject = () => {
    setRefreshKey((value) => value + 1);
  };

  const refreshPlots = () => {
    setPlotsRefreshKey((value) => value + 1);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("ALL");
    setPage(1);
  };

  // ========================================
  // PROJECT STATISTICS
  // ========================================

  const stats = project?.statistics || {};

  const startRecord =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) *
          pagination.limit +
        1;

  const endRecord = Math.min(
    pagination.page * pagination.limit,
    pagination.total
  );

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-5">

      {/* ==================================
          BACK NAVIGATION
      ================================== */}

      <Link
        to={backPath}
        className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 transition hover:text-zinc-950"
      >
        <ArrowLeft size={15} />
        Back to Projects
      </Link>

      {/* ==================================
          PROJECT LOADING
      ================================== */}

      {loading && (
        <div role="status" className="space-y-4">

          <div className="h-28 animate-pulse rounded-xl bg-zinc-100" />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-xl bg-zinc-100"
              />
            ))}
          </div>

        </div>
      )}

      {/* ==================================
          PROJECT ERROR
      ================================== */}

      {!loading && error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5"
        >
          <div className="flex items-start gap-3">

            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <div className="flex-1">

              <h2 className="text-sm font-semibold text-red-800">
                Unable to load project
              </h2>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={refreshProject}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                <RefreshCw size={14} />
                Try Again
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ==================================
          PROJECT CONTENT
      ================================== */}

      {!loading && !error && project && (
        <>

          {/* ==================================
              PROJECT HEADER
          ================================== */}

          <section className="rounded-xl border border-zinc-200 bg-white p-5">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

              {/* PROJECT INFORMATION */}

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-3">

                  <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
                    {project.title}
                  </h1>

                  <span
                    className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                      PROJECT_STATUS_STYLES[project.status] ||
                      PROJECT_STATUS_STYLES.DRAFT
                    }`}
                  >
                    {project.status}
                  </span>

                </div>

                {/* LOCATION */}

                <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">

                  <MapPin size={14} />

                  <span>
                    {project.location ||
                      "Location not provided"}
                  </span>

                </div>

                {/* DESCRIPTION */}

                <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
                  {project.description ||
                    "No description provided."}
                </p>

              </div>

              {/* ==================================
                  PROJECT ACTIONS
              ================================== */}

              <div className="flex shrink-0 flex-wrap items-center gap-2">

                {/* EDIT PROJECT */}

                {canEditProject && (
                  <Link
                    to={editProjectPath}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-xs font-medium text-white transition hover:bg-zinc-800"
                  >
                    <Pencil size={14} />
                    Edit Project
                  </Link>
                )}

                {/* REFRESH PROJECT */}

                <button
                  type="button"
                  onClick={refreshProject}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>

              </div>

            </div>
          </section>

          {/* ==================================
              INVENTORY OVERVIEW
          ================================== */}

          <section>

            <h2 className="mb-3 text-sm font-semibold text-zinc-950">
              Inventory Overview
            </h2>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

              <StatCard
                label="Total Plots"
                value={stats.totalPlots}
                icon={Layers3}
              />

              <StatCard
                label="Available"
                value={stats.availablePlots}
                icon={Layers3}
              />

              <StatCard
                label="Reserved"
                value={stats.reservedPlots}
                icon={Layers3}
              />

              <StatCard
                label="Sold"
                value={stats.soldPlots}
                icon={Layers3}
              />

            </div>
          </section>

          {/* ==================================
              PRICING AND PROJECT INFO
          ================================== */}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

            {/* PRICING */}

            <section className="rounded-xl border border-zinc-200 bg-white p-5">

              <div className="flex items-center gap-2">

                <Wallet
                  size={17}
                  className="text-zinc-700"
                />

                <h2 className="text-sm font-semibold text-zinc-950">
                  Pricing & Land
                </h2>

              </div>

              <div className="mt-3">

                <InfoRow
                  label="Price per sqm"
                  value={formatCurrency(project.pricePerSqm)}
                />

                <InfoRow
                  label="Total land area"
                  value={`${formatNumber(stats.totalAreaSqm)} sqm`}
                />

                <InfoRow
                  label="Inventory value"
                  value={formatCurrency(stats.totalInventoryValue)}
                />

              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">

                <Ruler
                  size={14}
                  className="shrink-0"
                />

                Calculated from saved plot records.

              </div>

            </section>

            {/* PROJECT INFORMATION */}

            <section className="rounded-xl border border-zinc-200 bg-white p-5">

              <div className="flex items-center gap-2">

                <CalendarDays
                  size={17}
                  className="text-zinc-700"
                />

                <h2 className="text-sm font-semibold text-zinc-950">
                  Project Information
                </h2>

              </div>

              <div className="mt-3">

                <InfoRow
                  label="Project status"
                  value={project.status}
                />

                <InfoRow
                  label="Created on"
                  value={formatDate(project.createdAt)}
                />

                <InfoRow
                  label="Last updated"
                  value={formatDate(project.updatedAt)}
                />

              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">

                <Clock3
                  size={14}
                  className="shrink-0"
                />

                Company project information.

              </div>

            </section>

          </div>

          {/* ==================================
              PLOT INVENTORY
          ================================== */}

          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">

            {/* HEADER AND FILTERS */}

            <div className="border-b border-zinc-100 p-4">

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                <div>

                  <h2 className="text-sm font-semibold text-zinc-950">
                    Plot Inventory
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    Browse and select project plots.
                  </p>

                </div>

                <div className="flex flex-wrap items-center gap-2">

                  {/* STATUS FILTER */}

                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value);
                      setPage(1);
                    }}
                    aria-label="Filter plots by status"
                    className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-800 outline-none focus:border-zinc-900"
                  >
                    <option value="ALL">
                      All Statuses
                    </option>

                    <option value="AVAILABLE">
                      Available
                    </option>

                    <option value="RESERVED">
                      Reserved
                    </option>

                    <option value="SOLD">
                      Sold
                    </option>

                  </select>

                  {/* REFRESH PLOTS */}

                  <button
                    type="button"
                    onClick={refreshPlots}
                    disabled={plotsLoading}
                    aria-label="Refresh plot inventory"
                    title="Refresh plots"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={15}
                      className={
                        plotsLoading
                          ? "animate-spin"
                          : ""
                      }
                    />
                  </button>

                  {/* SEARCH */}

                  <label className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">

                    <Search
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />

                    <input
                      type="search"
                      value={searchInput}
                      onChange={(event) => {
                        setSearchInput(event.target.value);
                        setPage(1);
                      }}
                      maxLength={80}
                      placeholder="Search plot number..."
                      aria-label="Search plots"
                      className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900"
                    />

                  </label>

                </div>
              </div>
            </div>

            {/* ==================================
                PLOT TABLE
            ================================== */}

            <div className="overflow-x-auto">

              <table className="w-full min-w-[560px] text-left">

                <thead className="bg-zinc-50">
                  <tr className="border-b border-zinc-100">

                    {[
                      "Plot Number",
                      "Area",
                      "Price",
                      "Status",
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-xs font-medium text-zinc-500"
                      >
                        {label}
                      </th>
                    ))}

                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100">

                  {/* LOADING */}

                  {plotsLoading && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-12 text-center text-sm text-zinc-500"
                      >
                        <RefreshCw
                          size={18}
                          className="mx-auto mb-2 animate-spin text-zinc-400"
                        />

                        Loading plots...
                      </td>
                    </tr>
                  )}

                  {/* ERROR */}

                  {!plotsLoading && plotsError && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center"
                      >
                        <AlertCircle
                          size={20}
                          className="mx-auto text-red-500"
                        />

                        <p className="mt-2 text-sm text-red-700">
                          {plotsError}
                        </p>

                        <button
                          type="button"
                          onClick={refreshPlots}
                          className="mt-3 text-xs font-medium text-zinc-950 underline underline-offset-4"
                        >
                          Try Again
                        </button>
                      </td>
                    </tr>
                  )}

                  {/* EMPTY STATE */}

                  {!plotsLoading &&
                    !plotsError &&
                    plots.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-12 text-center"
                        >
                          <Search
                            size={22}
                            className="mx-auto text-zinc-400"
                          />

                          <p className="mt-3 text-sm font-medium text-zinc-900">
                            No plots found
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {searchInput ||
                            statusFilter !== "ALL"
                              ? "Try changing your search or filters."
                              : "No plots have been added to this project."}
                          </p>

                          {(searchInput ||
                            statusFilter !== "ALL") && (
                            <button
                              type="button"
                              onClick={clearFilters}
                              className="mt-3 text-xs font-medium text-zinc-950 underline underline-offset-4"
                            >
                              Clear filters
                            </button>
                          )}
                        </td>
                      </tr>
                    )}

                  {/* ==================================
                      PLOT RECORDS
                  ================================== */}

                  {!plotsLoading &&
                    !plotsError &&
                    plots.map((plot) => {
                      const isSelected =
                        String(selectedPlotId) ===
                        String(plot.id);

                      return (
                        <tr
                          key={plot.id}
                          className={`transition-colors ${
                            isSelected
                              ? "bg-zinc-50"
                              : "hover:bg-zinc-50"
                          }`}
                        >

                          {/* PLOT NUMBER */}

                          <td className="px-4 py-3">

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPlotId(plot.id)
                              }
                              aria-label={`Select plot ${plot.plotNumber}`}
                              aria-pressed={isSelected}
                              className={`text-left text-sm font-medium transition-colors hover:underline hover:underline-offset-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                                isSelected
                                  ? "font-semibold text-zinc-950 underline underline-offset-4"
                                  : "text-zinc-700"
                              }`}
                            >
                              {plot.plotNumber}
                            </button>

                          </td>

                          {/* AREA */}

                          <td className="px-4 py-3 text-sm text-zinc-700">
                            {formatNumber(plot.areaSqm)} sqm
                          </td>

                          {/* PRICE */}

                          <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                            {formatCurrency(plot.totalPrice)}
                          </td>

                          {/* STATUS */}

                          <td className="px-4 py-3">
                            <PlotStatusBadge
                              status={plot.status}
                            />
                          </td>

                        </tr>
                      );
                    })}

                </tbody>
              </table>
            </div>

            {/* ==================================
                PAGINATION
            ================================== */}

            {!plotsLoading && !plotsError && (
              <div className="flex flex-col gap-3 border-t border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-xs text-zinc-500">
                  {pagination.total > 0
                    ? `Showing ${formatNumber(startRecord)}–${formatNumber(endRecord)} of ${formatNumber(pagination.total)} plots`
                    : "0 plots"}
                </p>

                <div className="flex items-center gap-3">

                  <span className="text-xs text-zinc-500">
                    Page {pagination.page} of{" "}
                    {Math.max(
                      1,
                      pagination.totalPages
                    )}
                  </span>

                  <div className="flex items-center gap-1">

                    {/* PREVIOUS PAGE */}

                    <button
                      type="button"
                      onClick={() =>
                        setPage((value) =>
                          Math.max(1, value - 1)
                        )
                      }
                      disabled={
                        plotsLoading ||
                        page <= 1
                      }
                      aria-label="Previous page"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {/* NEXT PAGE */}

                    <button
                      type="button"
                      onClick={() =>
                        setPage((value) =>
                          Math.min(
                            pagination.totalPages,
                            value + 1
                          )
                        )
                      }
                      disabled={
                        plotsLoading ||
                        pagination.totalPages === 0 ||
                        page >= pagination.totalPages
                      }
                      aria-label="Next page"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>

                  </div>
                </div>
              </div>
            )}

          </section>

          {/* ==================================
              INTERACTIVE PROJECT MAP
          ================================== */}

          <CompanyProjectMap
            selectedPlotId={selectedPlotId}
            onSelectPlot={setSelectedPlotId}
            projectPricePerSqm={project.pricePerSqm}
          />

        </>
      )}

    </div>
  );
};

export default CompanyProjectDetails;