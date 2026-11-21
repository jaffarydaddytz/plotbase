import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import axios from "axios";

import {
  ArrowRight,
  Building2,
  FolderOpen,
  Plus,
} from "lucide-react";

import API_URL from "../../../config";
import { useAuth } from "../../../context/AuthContext";

import CompanyProjectsTable from "./CompanyProjectsTable";

// ==========================================
// HELPERS
// ==========================================

const formatNumber = (value) =>
  new Intl.NumberFormat("en-TZ").format(
    Number(value) || 0
  );

// ==========================================
// SUMMARY CARD
// ==========================================

const SummaryCard = ({ label, value }) => (
  <div className="min-w-0 rounded-xl border border-zinc-200 bg-white px-4 py-3">

    <p className="text-xs font-medium text-zinc-500">
      {label}
    </p>

    <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
      {formatNumber(value)}
    </p>

  </div>
);

// ==========================================
// COMPANY PROJECTS PAGE
// ==========================================

const CompanyProjects = () => {
  const { companyId } = useParams();

  const navigate = useNavigate();

  const { token } = useAuth();

  // ========================================
  // PROJECT STATE
  // ========================================

  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  // ========================================
  // CREATE PROJECT PATH
  // ========================================

  const createProjectPath = companyId
    ? `/company/${companyId}/projects/create`
    : "/company/projects/create";

  // ========================================
  // FETCH COMPANY PROJECTS
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    const fetchProjects = async () => {

      // COMPANY VALIDATION

      if (!companyId) {
        setProjects([]);
        setLoading(false);
        setError("");
        return;
      }

      // AUTHENTICATION VALIDATION

      if (!token) {
        setProjects([]);
        setLoading(false);
        setError(
          "Please sign in to view company projects."
        );
        return;
      }

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

        // VALIDATE API RESPONSE

        if (
          response.data?.success !== true ||
          !Array.isArray(response.data.projects)
        ) {
          throw new Error(
            "Invalid company projects response."
          );
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
      // TOTAL PROJECTS

      total: projects.length,

      // DRAFT PROJECTS

      drafts: projects.filter(
        (project) =>
          project.status === "DRAFT"
      ).length,

      // ACTIVE PROJECTS

      active: projects.filter(
        (project) =>
          project.status === "ACTIVE"
      ).length,

      // AVAILABLE PLOTS

      availablePlots: projects.reduce(
        (total, project) =>
          total +
          (Number(project.availablePlots) || 0),
        0
      ),
    };
  }, [projects]);

  // ========================================
  // REFRESH PROJECTS
  // ========================================

  const handleRefresh = () => {
    setRefreshKey(
      (previous) => previous + 1
    );
  };

  // ========================================
  // VIEW PROJECT DETAILS
  // ========================================

  const handleView = (project) => {
    const id = project?.id ?? project?._id;

    if (!companyId || id == null) {
      return;
    }

    navigate(
      `/company/${companyId}/projects/${id}`
    );
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-w-0 space-y-4">

      {/* ==================================
          PAGE HEADER
      ================================== */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        {/* TITLE */}

        <div className="min-w-0">

          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
            Company Projects
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Manage your projects and land inventory.
          </p>

        </div>

        {/* CREATE PROJECT */}

        <Link
          to={createProjectPath}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800 sm:self-auto"
        >
          <Plus size={16} />

          Create Project
        </Link>

      </div>

      {/* ==================================
          LEGACY ROUTE FALLBACK
      ================================== */}

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
            Open an approved company workspace
            to view its projects and drafts.
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

          {/* ==================================
              PROJECT SUMMARY
          ================================== */}

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

          {/* ==================================
              ERROR MESSAGE
          ================================== */}

          {error && (

            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>

          )}

          {/* ==================================
              COMPANY PROJECTS TABLE
          ================================== */}

          {!error && (

            !loading && projects.length === 0 ? (

              /* ==============================
                  EMPTY STATE
              ============================== */

              <div className="rounded-xl border border-zinc-200 bg-white px-5 py-12 text-center">

                <FolderOpen
                  size={28}
                  className="mx-auto text-zinc-400"
                />

                <h2 className="mt-3 text-sm font-semibold text-zinc-950">
                  No projects yet
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Create your first project to start
                  managing your land inventory.
                </p>

                <Link
                  to={createProjectPath}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  <Plus size={14} />

                  Create Project
                </Link>

              </div>

            ) : (

              /* ==============================
                  PROJECTS TABLE
              ============================== */

              <CompanyProjectsTable
                projects={projects}
                loading={loading}
                onRefresh={handleRefresh}
                onView={handleView}
              />

            )

          )}

        </>

      )}

    </div>
  );
};

export default CompanyProjects;