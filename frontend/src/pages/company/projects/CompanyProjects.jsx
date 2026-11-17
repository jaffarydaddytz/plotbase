import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

import {
  ArrowRight,
  Building2,
  FolderOpen,
  MapPin,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import API_URL from "../../../config";
import { useAuth } from "../../../context/AuthContext";

// ==========================================
// HELPERS
// ==========================================

const formatNumber = (value) =>
  new Intl.NumberFormat("en-TZ").format(Number(value) || 0);

const formatCurrency = (value) =>
  `TZS ${formatNumber(value)}`;

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

const STATUS_STYLES = {
  DRAFT: "bg-zinc-100 text-zinc-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  INACTIVE: "bg-amber-50 text-amber-700",
};

// ==========================================
// SUMMARY CARD
// ==========================================

const SummaryCard = ({ label, value }) => (
  <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
    <p className="text-xs font-medium text-zinc-500">
      {label}
    </p>

    <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
      {formatNumber(value)}
    </p>
  </div>
);

// ==========================================
// PROJECT CARD
// ==========================================

const ProjectCard = ({ project, companyId }) => {
  const status = project.status || "DRAFT";

  const projectDetailsPath =
  `/company/${companyId}/projects/${project.id}`;

return (
  <Link
    to={projectDetailsPath}
    aria-label={`View ${project.title} project details`}
    className="flex min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
  >
      {/* PROJECT HEADER */}

      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
          <Building2
            size={17}
            className="text-zinc-700"
          />
        </div>

        <span
          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
            STATUS_STYLES[status] ||
            "bg-zinc-100 text-zinc-600"
          }`}
        >
          {status}
        </span>
      </div>

      {/* PROJECT INFORMATION */}

      <div className="mt-3 min-w-0">
        <h3
          className="truncate text-sm font-semibold text-zinc-950"
          title={project.title}
        >
          {project.title}
        </h3>

        <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
          <MapPin size={13} className="shrink-0" />

          <span className="truncate">
            {project.location || "Location not provided"}
          </span>
        </div>
      </div>

      {/* PLOT INFORMATION */}

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-3">
        <div>
          <p className="text-[11px] text-zinc-500">
            Total plots
          </p>

          <p className="mt-0.5 text-sm font-semibold text-zinc-950">
            {formatNumber(project.plotCount)}
          </p>
        </div>

        <div>
          <p className="text-[11px] text-zinc-500">
            Available
          </p>

          <p className="mt-0.5 text-sm font-semibold text-zinc-950">
            {formatNumber(project.availablePlots)}
          </p>
        </div>
      </div>

      {/* PRICING */}

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-500">
            Price / sqm
          </span>

          <span className="text-xs font-semibold text-zinc-900">
            {formatCurrency(project.pricePerSqm)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-500">
            Inventory value
          </span>

          <span className="text-xs font-semibold text-zinc-900">
            {formatCurrency(project.totalInventoryValue)}
          </span>
        </div>
      </div>

      {/* FOOTER */}

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
          <span className="text-[11px] text-zinc-500">
            Created {formatDate(project.createdAt)}
          </span>

          <span className="text-[11px] font-medium text-zinc-500">
            {status === "DRAFT"
              ? "Unpublished"
              : status === "ACTIVE"
                ? "Active project"
                : "Inactive project"}
          </span>
        </div>
      </div>
      </Link>

  );
};

// ==========================================
// COMPANY PROJECTS PAGE
// ==========================================

const CompanyProjects = () => {
  const { companyId } = useParams();
  const { token } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [refreshKey, setRefreshKey] = useState(0);

  const createProjectPath = companyId
    ? `/company/${companyId}/projects/create`
    : "/company/projects/create";

  // ========================================
  // FETCH COMPANY PROJECTS
  // ========================================

  useEffect(() => {
    if (!companyId) {
      setProjects([]);
      setLoading(false);
      setError("");
      return;
    }

    if (!token) {
      setProjects([]);
      setLoading(false);
      setError("Please sign in to view company projects.");
      return;
    }

    const controller = new AbortController();

    const fetchProjects = async () => {
      setLoading(true);
      setError("");
      setProjects([]);

      try {
        const response = await axios.get(
          `${API_URL}/api/companies/${companyId}/projects`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (
          response.data?.success !== true ||
          !Array.isArray(response.data.projects)
        ) {
          throw new Error("Invalid company projects response.");
        }

        if (!controller.signal.aborted) {
          setProjects(response.data.projects);
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
            "Failed to load company projects."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchProjects();

    return () => controller.abort();
  }, [companyId, token, refreshKey]);

  // ========================================
  // PROJECT SUMMARY
  // ========================================

  const summary = useMemo(() => {
    return {
      total: projects.length,

      drafts: projects.filter(
        (project) => project.status === "DRAFT"
      ).length,

      active: projects.filter(
        (project) => project.status === "ACTIVE"
      ).length,

      availablePlots: projects.reduce(
        (total, project) =>
          total + (Number(project.availablePlots) || 0),
        0
      ),
    };
  }, [projects]);

  // ========================================
  // SEARCH AND FILTER
  // ========================================

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !query ||
        (project.title || "")
          .toLowerCase()
          .includes(query) ||
        (project.location || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-5">
      {/* PAGE HEADER */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
            Company Projects
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Manage your projects and land inventory.
          </p>
        </div>

        <Link
          to={createProjectPath}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          <Plus size={16} />
          Create Project
        </Link>
      </div>

      {/* LEGACY ROUTE FALLBACK */}

      {!companyId ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-5 py-10 text-center">
          <Building2
            size={28}
            className="mx-auto text-zinc-400"
          />

          <h2 className="mt-3 text-sm font-semibold text-zinc-950">
            Select a company workspace
          </h2>

          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
            Open an approved company workspace to view
            its projects and drafts.
          </p>

          <Link
            to="/company/center"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-950 hover:underline"
          >
            Go to Company Center
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          {/* SUMMARY */}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              label="Total Projects"
              value={summary.total}
            />

            <SummaryCard
              label="Drafts"
              value={summary.drafts}
            />

            <SummaryCard
              label="Active Projects"
              value={summary.active}
            />

            <SummaryCard
              label="Available Plots"
              value={summary.availablePlots}
            />
          </div>

          {/* PROJECTS CONTENT */}

          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            {/* TOOLBAR */}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">
                  My Projects
                </h2>

                <p className="mt-0.5 text-xs text-zinc-500">
                  {loading
                    ? "Loading projects..."
                    : `${filteredProjects.length} project${
                        filteredProjects.length === 1
                          ? ""
                          : "s"
                      }`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* STATUS FILTER */}

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  aria-label="Filter projects by status"
                  className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-800 outline-none focus:border-zinc-900"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>

                {/* REFRESH */}

                <button
                  type="button"
                  onClick={() =>
                    setRefreshKey((previous) => previous + 1)
                  }
                  disabled={loading}
                  aria-label="Refresh projects"
                  title="Refresh projects"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  <RefreshCw
                    size={15}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>

                {/* SEARCH LAST, ON THE RIGHT */}

                <label className="relative flex-1 sm:w-56 sm:flex-none">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search projects..."
                    aria-label="Search projects"
                    className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900"
                  />
                </label>
              </div>
            </div>

            {/* ERROR */}

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* LOADING */}

            {loading && (
              <div
                role="status"
                aria-label="Loading company projects"
                className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50"
                  />
                ))}
              </div>
            )}

            {/* PROJECT GRID */}

            {!loading && !error && filteredProjects.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
{filteredProjects.map((project) => (
  <ProjectCard
    key={project.id}
    project={project}
    companyId={companyId}
  />
))}
              </div>
            )}

            {/* EMPTY STATE */}

            {!loading && !error && filteredProjects.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                  {projects.length === 0 ? (
                    <FolderOpen
                      size={23}
                      className="text-zinc-500"
                    />
                  ) : (
                    <Search
                      size={21}
                      className="text-zinc-500"
                    />
                  )}
                </div>

                <h3 className="mt-3 text-sm font-semibold text-zinc-950">
                  {projects.length === 0
                    ? "No projects yet"
                    : "No matching projects"}
                </h3>

                <p className="mt-1 max-w-sm text-xs text-zinc-500">
                  {projects.length === 0
                    ? "Create your first project to start managing your land inventory."
                    : "Try another search term or change the status filter."}
                </p>

                {projects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("ALL");
                    }}
                    className="mt-3 text-xs font-medium text-zinc-950 underline underline-offset-4"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default CompanyProjects;