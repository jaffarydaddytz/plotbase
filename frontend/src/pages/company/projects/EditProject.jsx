import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Layers3,
  Loader2,
  MapPinned,
  RefreshCw,
  Save,
  Tags,
  Wallet,
} from "lucide-react";

import API_URL from "../../../config";
import { useAuth } from "../../../context/AuthContext";
import CompanyProjectMap from "./CompanyProjectMap";
import ProjectPricingTab from "./ProjectPricingTab";
import ProjectPublicationTab from "./ProjectPublicationTab";

// ==========================================
// CONSTANTS
// ==========================================

const EMPTY_FORM = {
  title: "",
  projectType: "",
  location: "",
  description: "",
};

const LIMITS = {
  title: 160,
  projectType: 20,
  location: 200,
  description: 5000,
};

const TABS = [
  { id: "general", name: "General", icon: FileText },
  { id: "pricing", name: "Pricing", icon: Wallet },
  { id: "plots", name: "Plots", icon: Layers3 },
  { id: "map", name: "Map", icon: MapPinned },
  { id: "publication", name: "Publication", icon: Tags },
];

const STATUS_CLASSES = {
  DRAFT: "border-zinc-200 bg-zinc-100 text-zinc-700",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  INACTIVE: "border-amber-200 bg-amber-50 text-amber-700",
};

// ==========================================
// HELPERS
// ==========================================

const formatNumber = (value) =>
  new Intl.NumberFormat("en-TZ").format(Number(value) || 0);

const formatMoney = (value) => `TZS ${formatNumber(value)}`;

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

// ==========================================
// METRIC CARD
// ==========================================

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <p className="text-[11px] text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-zinc-950 sm:text-base">
        {value}
      </p>
    </div>
  );
}

// ==========================================
// FORM FIELD
// ==========================================

function FormField({
  label,
  name,
  value,
  onChange,
  multiline = false,
  disabled,
}) {
  const classes =
    "mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-50";

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={name}
          className="text-xs font-medium text-zinc-800"
        >
          {label}

          {name !== "location" && (
            <span className="ml-1 text-red-500">*</span>
          )}
        </label>

        <span className="text-[11px] text-zinc-400">
          {value.length}/{LIMITS[name]}
        </span>
      </div>

      {multiline ? (
        <textarea
          id={name}
          name={name}
          rows={4}
          required
          maxLength={LIMITS[name]}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`${classes} resize-y`}
        />
      ) : (
        <input
          id={name}
          name={name}
          type="text"
          required={name !== "location"}
          maxLength={LIMITS[name]}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={classes}
        />
      )}
    </div>
  );
}

// ==========================================
// EDIT PROJECT
// ==========================================

const EditProject = () => {
  const { companyId, projectId } = useParams();
  const { token } = useAuth();

  // ========================================
  // ROUTES
  // ========================================

  const projectsPath =
    `/company/${companyId}/projects`;

  const detailsPath =
    `${projectsPath}/${projectId}`;

  // ========================================
  // PROJECT STATE
  // ========================================

  const [project, setProject] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [originalForm, setOriginalForm] =
    useState(EMPTY_FORM);

  const [activeTab, setActiveTab] =
    useState("general");

  const [selectedPlotId, setSelectedPlotId] =
    useState(null);

  // ========================================
  // REQUEST STATE
  // ========================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ========================================
  // FETCH PROJECT DETAILS
  // ========================================

  useEffect(() => {
    if (!companyId || !projectId || !token) {
      setProject(null);
      setLoading(false);
      setError("Project access is unavailable.");
      return;
    }

    const controller = new AbortController();

    const fetchProject = async () => {
      setLoading(true);
      setError("");
      setSuccess("");
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

        if (controller.signal.aborted) {
          return;
        }

    const values = {
      title: data.project.title || "",
      projectType: data.project.projectType || "",
      location: data.project.location || "",
      description: data.project.description || "",
    };

        setProject(data.project);
        setForm(values);
        setOriginalForm(values);
        setSelectedPlotId(null);
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
            "Failed to load project information."
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
  // DETECT GENERAL INFORMATION CHANGES
  // ========================================

  const updates = useMemo(() => {
    const changed = {};

    for (const key of Object.keys(EMPTY_FORM)) {
      if (
        form[key].trim() !==
        originalForm[key].trim()
      ) {
        changed[key] = form[key].trim();
      }
    }

    return changed;
  }, [form, originalForm]);

  const hasChanges =
    Object.keys(updates).length > 0;

  // ========================================
  // PROJECT STATISTICS
  // ========================================

  const stats = project?.statistics || {};

  // ========================================
  // HANDLE FORM CHANGE
  // ========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (!Object.hasOwn(LIMITS, name)) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // ========================================
  // SAVE GENERAL INFORMATION
  // ========================================

  const handleSave = async (event) => {
    event.preventDefault();

    if (!project || saving || !hasChanges) {
      return;
    }

    if (
      !form.title.trim() ||
      !form.description.trim()
    ) {
      setError(
        "Project name and description are required."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await axios.patch(
        `${API_URL}/api/companies/${companyId}/projects/${projectId}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (
        data?.success !== true ||
        !data.project
      ) {
        throw new Error("Invalid update response.");
      }

    const saved = {
      title: data.project.title || "",
      projectType: data.project.projectType || "",
      location: data.project.location || "",
      description: data.project.description || "",
    };

      setProject((current) => ({
        ...current,
        ...data.project,
        statistics: current?.statistics || {},
      }));

      setForm(saved);
      setOriginalForm(saved);

      setSuccess(
        "Project information updated successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save project."
      );
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // UPDATE PROJECT STATE AFTER PRICING
  // OR PUBLICATION CHANGES
  // ========================================

  const handleProjectUpdated = (updatedProject) => {
    setProject((current) => ({
      ...current,
      ...updatedProject,

      statistics:
        updatedProject.statistics ??
        current?.statistics ??
        {},
    }));
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="w-full min-w-0 space-y-4">

      {/* BACK NAVIGATION */}

      <Link
        to={detailsPath}
        className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-950"
      >
        <ArrowLeft size={15} />
        Back to Project
      </Link>

      {/* ==================================
          PAGE HEADER
      ================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3">

        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-zinc-950">
            Manage Project
          </h1>

          <p className="mt-1 break-words text-sm text-zinc-500">
            {project?.title ||
              "Manage project information and settings."}
          </p>
        </div>

        {project && (
          <div className="flex items-center gap-2">

            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                STATUS_CLASSES[project.status] ||
                STATUS_CLASSES.DRAFT
              }`}
            >
              {project.status}
            </span>

            <button
              type="button"
              aria-label="Refresh project"
              title={
                hasChanges
                  ? "Save or discard changes first"
                  : "Refresh project"
              }
              disabled={saving || hasChanges}
              onClick={() =>
                setRefreshKey((key) => key + 1)
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-100 disabled:opacity-40"
            >
              <RefreshCw size={15} />
            </button>

          </div>
        )}

      </div>

      {/* ==================================
          LOADING
      ================================== */}

      {loading && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500"
        >
          <Loader2
            size={16}
            className="animate-spin"
          />

          Loading project...
        </div>
      )}

      {/* ==================================
          ERROR LOADING PROJECT
      ================================== */}

      {!loading && !project && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5"
        >
          <p className="text-sm font-semibold text-red-800">
            Unable to load project
          </p>

          <p className="mt-1 text-xs text-red-700">
            {error}
          </p>

          <div className="mt-3 flex gap-3 text-xs font-medium">

            <button
              type="button"
              onClick={() =>
                setRefreshKey((key) => key + 1)
              }
              className="text-red-800 underline"
            >
              Try Again
            </button>

            <Link
              to={projectsPath}
              className="text-zinc-800 underline"
            >
              All Projects
            </Link>

          </div>
        </div>
      )}

      {/* ==================================
          PROJECT CONTENT
      ================================== */}

      {!loading && project && (
        <>

          {/* ==================================
              PROJECT STATISTICS
          ================================== */}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

            <Metric
              label="Total Plots"
              value={formatNumber(stats.totalPlots)}
            />

            <Metric
              label="Available"
              value={formatNumber(stats.availablePlots)}
            />

            <Metric
              label="Price per sqm"
              value={`${formatMoney(project.pricePerSqm)}/sqm`}
            />

            <Metric
              label="Last Updated"
              value={formatDate(project.updatedAt)}
            />

          </div>

          {/* ==================================
              MANAGEMENT TABS
          ================================== */}

          <div className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white">

            {/* TAB NAVIGATION */}

            <nav
              aria-label="Project management sections"
              className="flex gap-1 overflow-x-auto border-b border-zinc-200 px-3 py-2"
            >
              {TABS.map(({ id, name, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={activeTab === id}
                  onClick={() => {
                    setActiveTab(id);
                    setError("");
                    setSuccess("");
                  }}
                  className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-medium transition ${
                    activeTab === id
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <Icon size={15} />

                  {name}

                  {id === "general" &&
                    hasChanges && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-amber-400"
                        aria-label="Unsaved general changes"
                      />
                    )}
                </button>
              ))}
            </nav>

            {/* ==================================
                GENERAL INFORMATION TAB
            ================================== */}

            {activeTab === "general" && (
              <form onSubmit={handleSave}>

                <div className="space-y-4 p-4 sm:p-5">

                  <div>
                    <h2 className="text-sm font-semibold text-zinc-950">
                      General Information
                    </h2>

                    <p className="mt-1 text-xs text-zinc-500">
                      Update project name, location, and description.
                    </p>
                  </div>

                  {/* NAME AND LOCATION */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

                    {/* PROJECT NAME */}

                    <FormField
                      label="Project Name"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      disabled={saving}
                    />

                    {/* PROJECT TYPE */}

                    <div className="min-w-0">

                      <label
                        htmlFor="projectType"
                        className="text-xs font-medium text-zinc-800"
                      >
                        Project Type
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <select
                        id="projectType"
                        name="projectType"
                        value={form.projectType}
                        onChange={handleChange}
                        disabled={saving || project.status === "ACTIVE"}
                        className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                      >
                        <option value="">
                          Select Project Type
                        </option>

                        <option value="VIWANJA">
                          Viwanja
                        </option>

                        <option value="MASHAMBA">
                          Mashamba
                        </option>
                      </select>

                      {project.status === "ACTIVE" && (
                        <p className="mt-1.5 text-xs text-amber-700">
                          Unpublish this project before changing its type.
                        </p>
                      )}

                    </div>

                    {/* PROJECT LOCATION */}

                    <FormField
                      label="Location"
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      disabled={saving}
                    />

                  </div>

                  {/* DESCRIPTION */}

                  <FormField
                    label="Description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    multiline
                    disabled={saving}
                  />

                  {/* NOTICE */}

                  <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                    General edits do not change pricing,
                    geometry, or publication status.
                  </p>

                  {/* ERROR */}

                  {error && (
                    <p
                      role="alert"
                      className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
                    >
                      <AlertCircle size={15} />
                      {error}
                    </p>
                  )}

                  {/* SUCCESS */}

                  {success && (
                    <p
                      role="status"
                      className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700"
                    >
                      <CheckCircle2 size={15} />
                      {success}
                    </p>
                  )}

                </div>

                {/* ==================================
                    FORM ACTIONS
                ================================== */}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 sm:px-5">

                  <p className="text-xs text-zinc-500">
                    {hasChanges
                      ? "Unsaved changes"
                      : "No unsaved changes"}
                  </p>

                  <div className="flex gap-2">

                    {/* DISCARD */}

                    <button
                      type="button"
                      disabled={!hasChanges || saving}
                      onClick={() => {
                        setForm({ ...originalForm });
                        setError("");
                        setSuccess("");
                      }}
                      className="h-9 rounded-lg border border-zinc-200 px-3 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40"
                    >
                      Discard
                    </button>

                    {/* SAVE */}

                    <button
                      type="submit"
                      disabled={
                        !hasChanges ||
                        saving ||
                        !form.title.trim() ||
                        !form.description.trim()
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
                    >
                      {saving ? (
                        <Loader2
                          size={14}
                          className="animate-spin"
                        />
                      ) : (
                        <Save size={14} />
                      )}

                      {saving
                        ? "Saving..."
                        : "Save Changes"}
                    </button>

                  </div>

                </div>
              </form>
            )}

            {/* ==================================
                PRICING TAB
            ================================== */}

            {activeTab === "pricing" && (
              <ProjectPricingTab
                companyId={companyId}
                projectId={projectId}
                project={project}
                hasUnsavedGeneralChanges={hasChanges}
                onUpdated={handleProjectUpdated}
              />
            )}

            {/* ==================================
                PLOTS TAB
            ================================== */}

            {activeTab === "plots" && (
              <div className="space-y-4 p-4 sm:p-5">

                <div>
                  <h2 className="text-sm font-semibold text-zinc-950">
                    Plot Inventory
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    Overview of this project's plots.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

                  <Metric
                    label="Total Plots"
                    value={formatNumber(stats.totalPlots)}
                  />

                  <Metric
                    label="Available"
                    value={formatNumber(stats.availablePlots)}
                  />

                  <Metric
                    label="Reserved"
                    value={formatNumber(stats.reservedPlots)}
                  />

                  <Metric
                    label="Sold"
                    value={formatNumber(stats.soldPlots)}
                  />

                </div>

                <Link
                  to={detailsPath}
                  className="inline-flex h-9 items-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  View Plot Inventory
                </Link>

                <p className="text-xs text-zinc-500">
                  Individual plot editing belongs to
                  Plot Management.
                </p>

              </div>
            )}

            {/* ==================================
                MAP TAB
            ================================== */}

            {activeTab === "map" && (
              <div className="min-w-0 space-y-3 p-4 sm:p-5">

                <div>
                  <h2 className="text-sm font-semibold text-zinc-950">
                    Project Map
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    Select polygons to view plot information.
                  </p>
                </div>

                <CompanyProjectMap
                  selectedPlotId={selectedPlotId}
                  onSelectPlot={setSelectedPlotId}
                  projectPricePerSqm={project.pricePerSqm}
                />

                <p className="text-xs text-zinc-500">
                  Geometry editing is not enabled.
                </p>

              </div>
            )}

            {/* ==================================
                PUBLICATION TAB
            ================================== */}

            {activeTab === "publication" && (
              <ProjectPublicationTab
                companyId={companyId}
                projectId={projectId}
                project={project}
                onUpdated={handleProjectUpdated}
              />
            )}

          </div>
        </>
      )}

    </div>
  );
};

export default EditProject;