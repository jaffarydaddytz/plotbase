import { useMemo, useState } from "react";

import {
  ChevronDown,
  Eye,
  Layers3,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
} from "lucide-react";

// ==========================================
// HELPERS
// ==========================================

const formatMoney = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `TZS ${new Intl.NumberFormat("en-TZ", {
    maximumFractionDigits: 2,
  }).format(number)}`;
};

const formatNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-TZ").format(number)
    : "—";
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// ==========================================
// PROJECT DATA HELPERS
// ==========================================

const getProjectId = (project) =>
  project?.id ?? project?._id;

const getProjectName = (project) =>
  project?.title ??
  project?.name ??
  "Untitled project";

const getLocation = (project) => {
  const location = project?.location;

  if (typeof location === "string") {
    return location;
  }

  return (
    location?.name ??
    location?.displayName ??
    project?.district ??
    "Location unavailable"
  );
};

const getStatus = (project) => {
  const status =
    project?.status ??
    project?.projectStatus ??
    project?.publicationStatus;

  if (status) {
    return String(status).toUpperCase();
  }

  if (project?.isActive === true) {
    return "ACTIVE";
  }

  if (project?.isActive === false) {
    return "INACTIVE";
  }

  return "UNKNOWN";
};

const getCreatedAt = (project) =>
  project?.createdAt ??
  project?.created_at ??
  project?.dateCreated;

const getTotalPlots = (project) =>
  project?.totalPlots ??
  project?.plotCount ??
  project?.plotsCount ??
  project?.stats?.totalPlots;

const getAvailablePlots = (project) =>
  project?.availablePlots ??
  project?.availablePlotsCount ??
  project?.stats?.availablePlots;

const getPricePerSqm = (project) =>
  project?.pricePerSqm ??
  project?.pricing?.pricePerSqm;

const getInventoryValue = (project) =>
  project?.inventoryValue ??
  project?.totalInventoryValue ??
  project?.stats?.inventoryValue;

// ==========================================
// STATUS COLORS
// ==========================================

const statusStyles = {
  ACTIVE:
    "bg-emerald-50 text-emerald-700 border-emerald-200",

  PUBLISHED:
    "bg-emerald-50 text-emerald-700 border-emerald-200",

  INACTIVE:
    "bg-zinc-200 text-zinc-700 border-zinc-300",

  DRAFT:
    "bg-zinc-100 text-zinc-600 border-zinc-200",

  PENDING:
    "bg-amber-50 text-amber-700 border-amber-200",

  REJECTED:
    "bg-red-50 text-red-700 border-red-200",
};

// ==========================================
// STATUS BADGE
// ==========================================

const StatusBadge = ({ status }) => {
  const normalized = String(
    status || "UNKNOWN"
  ).toUpperCase();

  const label =
    normalized.charAt(0) +
    normalized.slice(1).toLowerCase();

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-medium ${
        statusStyles[normalized] ||
        "border-zinc-200 bg-zinc-100 text-zinc-600"
      }`}
    >
      {label}
    </span>
  );
};

// ==========================================
// PROJECT ACTIONS
// ==========================================

const ProjectActions = ({
  project,
  onView,
  onEdit,
  onManagePlots,
}) => {
  const hasActions = [
    onView,
    onEdit,
    onManagePlots,
  ].some((action) => typeof action === "function");

  if (!hasActions) {
    return <span className="text-zinc-400">—</span>;
  }

  return (
    <details className="inline-block text-left">
      <summary
        aria-label={`Actions for ${getProjectName(project)}`}
        className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 [&::-webkit-details-marker]:hidden"
      >
        <MoreHorizontal size={18} />
      </summary>

      <div className="mt-1 min-w-[145px] rounded-lg border border-zinc-200 bg-white p-1 text-left shadow-sm">
        {typeof onView === "function" && (
          <button
            type="button"
            onClick={() => onView(project)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100"
          >
            <Eye size={14} />
            View Details
          </button>
        )}

        {typeof onEdit === "function" && (
          <button
            type="button"
            onClick={() => onEdit(project)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100"
          >
            <Pencil size={14} />
            Edit Project
          </button>
        )}

        {typeof onManagePlots === "function" && (
          <button
            type="button"
            onClick={() => onManagePlots(project)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100"
          >
            <Layers3 size={14} />
            Manage Plots
          </button>
        )}
      </div>
    </details>
  );
};

// ==========================================
// COMPANY PROJECTS TABLE
// ==========================================

const CompanyProjectsTable = ({
  projects = [],
  loading = false,
  onRefresh,
  onView,
  onEdit,
  onManagePlots,
}) => {
  // ========================================
  // FILTER STATE
  // ========================================

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [sortOrder, setSortOrder] =
    useState("NEWEST");

  // ========================================
  // AVAILABLE STATUSES
  // ========================================

  const statuses = useMemo(() => {
    const source = Array.isArray(projects)
      ? projects
      : [];

    return [
      ...new Set(source.map(getStatus)),
    ]
      .filter(Boolean)
      .sort();
  }, [projects]);

  // ========================================
  // FILTER AND SORT PROJECTS
  // ========================================

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    const source = Array.isArray(projects)
      ? projects
      : [];

    return source
      .filter((project) => {
        const matchesStatus =
          statusFilter === "ALL" ||
          getStatus(project) === statusFilter;

        const matchesSearch =
          !query ||
          `${getProjectName(project)} ${getLocation(
            project
          )}`
            .toLowerCase()
            .includes(query);

        return matchesStatus && matchesSearch;
      })
      .slice()
      .sort((a, b) => {
        const aTime =
          new Date(getCreatedAt(a) ?? 0).getTime() ||
          0;

        const bTime =
          new Date(getCreatedAt(b) ?? 0).getTime() ||
          0;

        return sortOrder === "NEWEST"
          ? bTime - aTime
          : aTime - bTime;
      });
  }, [projects, search, statusFilter, sortOrder]);

  const totalProjects = Array.isArray(projects)
    ? projects.length
    : 0;

  // ========================================
  // RENDER
  // ========================================

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white">

      {/* ==================================
          TABLE HEADER
      ================================== */}

      <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 xl:flex-row xl:items-center xl:justify-between">

        {/* TITLE */}

        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-950">
            My Projects
          </h2>

          <p className="mt-0.5 text-xs text-zinc-500">
            {totalProjects} projects

            {(search || statusFilter !== "ALL") &&
              ` · ${filteredProjects.length} matching`}
          </p>
        </div>

        {/* FILTER CONTROLS */}

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">

          {/* STATUS FILTER */}

          <label className="relative min-w-0 flex-1 sm:flex-none">
            <span className="sr-only">
              Filter projects by status
            </span>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="h-9 w-full appearance-none rounded-lg border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs text-zinc-800 outline-none focus:border-zinc-500 sm:w-[140px]"
            >
              <option value="ALL">
                All Statuses
              </option>

              {statuses.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status.charAt(0) +
                    status.slice(1).toLowerCase()}
                </option>
              ))}
            </select>

            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-2.5 text-zinc-500"
            />
          </label>

          {/* SORTING */}

          <label className="relative min-w-0 flex-1 sm:flex-none">
            <span className="sr-only">
              Sort projects
            </span>

            <select
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(event.target.value)
              }
              className="h-9 w-full appearance-none rounded-lg border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs text-zinc-800 outline-none focus:border-zinc-500 sm:w-[135px]"
            >
              <option value="NEWEST">
                Newest First
              </option>

              <option value="OLDEST">
                Oldest First
              </option>
            </select>

            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-2.5 text-zinc-500"
            />
          </label>

          {/* REFRESH */}

          {typeof onRefresh === "function" && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Refresh projects"
              title="Refresh projects"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={
                  loading ? "animate-spin" : ""
                }
              />
            </button>
          )}

          {/* SEARCH LAST RIGHT */}

          <label className="relative min-w-[170px] flex-[2] sm:flex-none">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-2.5 text-zinc-400"
            />

            <span className="sr-only">
              Search projects
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search projects..."
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 sm:w-[215px]"
            />
          </label>

        </div>
      </div>

      {/* ==================================
          PROJECTS TABLE
      ================================== */}

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[1010px] border-collapse text-left text-xs">

          {/* TABLE HEADER */}

          <thead className="bg-zinc-50 text-zinc-500">
            <tr className="border-b border-zinc-200">

              <th className="w-[27%] px-4 py-3 font-medium">
                Project
              </th>

              <th className="px-3 py-3 font-medium">
                Status
              </th>

              <th className="px-3 py-3 text-right font-medium">
                Plots
              </th>

              <th className="px-3 py-3 text-right font-medium">
                Available
              </th>

              <th className="px-3 py-3 text-right font-medium">
                Price / sqm
              </th>

              <th className="px-3 py-3 text-right font-medium">
                Inventory Value
              </th>

              <th className="px-3 py-3 font-medium">
                Created
              </th>

              <th className="w-12 px-3 py-3 text-center font-medium">
                Actions
              </th>

            </tr>
          </thead>

          {/* TABLE BODY */}

          <tbody className="divide-y divide-zinc-100">

            {/* LOADING */}

            {loading && filteredProjects.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-zinc-500"
                >
                  Loading projects...
                </td>
              </tr>
            ) : filteredProjects.length === 0 ? (

              /* EMPTY STATE */

              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-zinc-500"
                >
                  No projects match your filters.
                </td>
              </tr>

            ) : (

              /* PROJECT ROWS */

              filteredProjects.map((project, index) => {
                const status = getStatus(project);

                const id = getProjectId(project);

                return (
                  <tr
                    key={
                      id ??
                      `${getProjectName(project)}-${index}`
                    }
                    className="transition-colors hover:bg-zinc-50/80"
                  >

                    {/* PROJECT NAME + LOCATION */}

                    <td className="px-4 py-3">
                      <div className="max-w-[300px] min-w-0">

                        <p
                          className="truncate font-semibold text-zinc-950"
                          title={getProjectName(project)}
                        >
                          {getProjectName(project)}
                        </p>

                        <p
                          className="mt-1 truncate text-[11px] text-zinc-500"
                          title={getLocation(project)}
                        >
                          {getLocation(project)}
                        </p>

                      </div>
                    </td>

                    {/* STATUS */}

                    <td className="px-3 py-3">
                      <StatusBadge status={status} />
                    </td>

                    {/* TOTAL PLOTS */}

                    <td className="px-3 py-3 text-right tabular-nums text-zinc-800">
                      {formatNumber(
                        getTotalPlots(project)
                      )}
                    </td>

                    {/* AVAILABLE PLOTS */}

                    <td className="px-3 py-3 text-right tabular-nums font-medium text-zinc-950">
                      {formatNumber(
                        getAvailablePlots(project)
                      )}
                    </td>

                    {/* PRICE PER SQM */}

                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-zinc-800">
                      {formatMoney(
                        getPricePerSqm(project)
                      )}
                    </td>

                    {/* INVENTORY VALUE */}

                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums font-medium text-zinc-950">
                      {formatMoney(
                        getInventoryValue(project)
                      )}
                    </td>

                    {/* DATE CREATED */}

                    <td className="whitespace-nowrap px-3 py-3 text-zinc-600">
                      {formatDate(
                        getCreatedAt(project)
                      )}
                    </td>

                    {/* ACTIONS */}

                    <td className="px-3 py-3 text-center">
                      <ProjectActions
                        project={project}
                        onView={onView}
                        onEdit={onEdit}
                        onManagePlots={onManagePlots}
                      />
                    </td>

                  </tr>
                );
              })
            )}

          </tbody>

        </table>
      </div>

      {/* ==================================
          TABLE FOOTER
      ================================== */}

      {filteredProjects.length > 0 && (
        <div className="border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-500">
          Showing {filteredProjects.length} of{" "}
          {totalProjects} projects
        </div>
      )}

    </section>
  );
};

export default CompanyProjectsTable;