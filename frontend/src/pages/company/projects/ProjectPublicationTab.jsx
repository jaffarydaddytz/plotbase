import { useEffect, useState } from "react";
import axios from "axios";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Send,
} from "lucide-react";

import API_URL from "../../../config";
import { useAuth } from "../../../context/AuthContext";

// ==========================================
// PROJECT PUBLICATION TAB
// ==========================================

const ProjectPublicationTab = ({
  companyId,
  projectId,
  project,
  onUpdated,
}) => {
  const { token } = useAuth();

  const [pendingAction, setPendingAction] = useState(null);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ========================================
  // PROJECT STATUS
  // ========================================

  const status = project?.status;

  const isActive = status === "ACTIVE";

  const canPublish =
    status === "DRAFT" ||
    status === "INACTIVE";

  const availableAction = isActive
    ? "UNPUBLISH"
    : canPublish
      ? "PUBLISH"
      : null;

  // ========================================
  // RESET CONFIRMATION ON PROJECT CHANGE
  // ========================================

  useEffect(() => {
    setPendingAction(null);
    setError("");
    setSuccess("");
  }, [companyId, projectId]);

  // ========================================
  // STATUS DISPLAY
  // ========================================

  const getStatusClasses = () => {
    switch (status) {
      case "ACTIVE":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";

      case "INACTIVE":
        return "border-amber-200 bg-amber-50 text-amber-700";

      default:
        return "border-zinc-200 bg-zinc-100 text-zinc-700";
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case "ACTIVE":
        return "This project is published and eligible for public discovery.";

      case "INACTIVE":
        return "This project was unpublished and is hidden from public discovery.";

      case "DRAFT":
        return "This project is currently a draft and is not publicly discoverable.";

      default:
        return "Project publication status is unavailable.";
    }
  };

  // ========================================
  // REQUEST CONFIRMATION
  // ========================================

  const handleRequestAction = () => {
    if (!availableAction || saving) {
      return;
    }

    setPendingAction(availableAction);
    setError("");
    setSuccess("");
  };

  // ========================================
  // CANCEL CONFIRMATION
  // ========================================

  const handleCancel = () => {
    if (saving) return;

    setPendingAction(null);
    setError("");
  };

  // ========================================
  // UPDATE PROJECT PUBLICATION
  // ========================================

  const handleConfirm = async () => {
    if (
      saving ||
      !pendingAction ||
      pendingAction !== availableAction
    ) {
      return;
    }

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await axios.patch(
        `${API_URL}/api/companies/${companyId}/projects/${projectId}/publication`,
        {
          action: pendingAction,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (
        data?.success !== true ||
        !data.project
      ) {
        throw new Error(
          "Invalid publication response."
        );
      }

      // Update the parent Edit Project page.
      onUpdated(data.project);

      setPendingAction(null);

      setSuccess(
        pendingAction === "PUBLISH"
          ? "Project published successfully."
          : "Project unpublished successfully."
      );

    } catch (err) {
      const response = err.response?.data;

      setError(
        response?.missingFields?.length
          ? `${response.message}: ${response.missingFields.join(", ")}`
          : response?.message ||
              err.message ||
              "Failed to update project publication."
      );

      // A failed request must not automatically
      // retry the publication operation.
      setPendingAction(null);

    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-4 p-4 sm:p-5">

      {/* ==================================
          SECTION HEADER
      ================================== */}

      <div>
        <h2 className="text-sm font-semibold text-zinc-950">
          Project Publication
        </h2>

        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Manage project visibility in the public marketplace.
        </p>
      </div>

      {/* ==================================
          CURRENT PUBLICATION STATUS
      ================================== */}

      <div className="rounded-xl border border-zinc-200 bg-white p-4">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div className="flex items-center gap-3">

            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {isActive ? (
                <Eye size={19} />
              ) : (
                <EyeOff size={19} />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-950">
                Publication Status
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                Current project visibility
              </p>
            </div>

          </div>

          <span
            className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${getStatusClasses()}`}
          >
            {status || "UNKNOWN"}
          </span>

        </div>

        <p className="mt-4 text-xs leading-5 text-zinc-600">
          {getStatusDescription()}
        </p>

      </div>

      {/* ==================================
          PUBLICATION REQUIREMENTS
      ================================== */}

      {canPublish && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">

          <h3 className="text-xs font-semibold text-zinc-900">
            Requirements Before Publishing
          </h3>

          <ul className="mt-3 space-y-2 text-xs text-zinc-600">

            <li className="flex items-start gap-2">
              <CheckCircle2
                size={14}
                className="mt-0.5 shrink-0 text-zinc-500"
              />
              Project name, description, and location must be provided.
            </li>

            <li className="flex items-start gap-2">
              <CheckCircle2
                size={14}
                className="mt-0.5 shrink-0 text-zinc-500"
              />
              Price per sqm must be greater than zero.
            </li>

            <li className="flex items-start gap-2">
              <CheckCircle2
                size={14}
                className="mt-0.5 shrink-0 text-zinc-500"
              />
              At least one AVAILABLE plot must exist.
            </li>

            <li className="flex items-start gap-2">
              <CheckCircle2
                size={14}
                className="mt-0.5 shrink-0 text-zinc-500"
              />
              AVAILABLE plots must have valid areas and prices.
            </li>

          </ul>

          <p className="mt-3 text-[11px] text-zinc-500">
            The backend validates these requirements when publishing.
          </p>

        </div>
      )}

      {/* ==================================
          PUBLICATION ACTION
      ================================== */}

      {availableAction && !pendingAction && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4">

          <div>
            <p className="text-xs font-semibold text-zinc-900">
              {isActive
                ? "Unpublish this project"
                : "Publish this project"}
            </p>

            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {isActive
                ? "Remove this project from public discovery."
                : "Make this project eligible for public discovery."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRequestAction}
            disabled={saving}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-xs font-medium transition disabled:opacity-50 ${
              isActive
                ? "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                : "bg-zinc-950 text-white hover:bg-zinc-800"
            }`}
          >
            {isActive ? (
              <EyeOff size={15} />
            ) : (
              <Send size={15} />
            )}

            {isActive
              ? "Unpublish Project"
              : "Publish Project"}
          </button>

        </div>
      )}

      {/* ==================================
          CONFIRM PUBLICATION ACTION
      ================================== */}

      {pendingAction && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

          <div className="flex items-center gap-2">

            <AlertTriangle
              size={17}
              className="text-amber-700"
            />

            <h3 className="text-sm font-semibold text-amber-900">
              Confirm{" "}
              {pendingAction === "PUBLISH"
                ? "Publication"
                : "Unpublication"}
            </h3>

          </div>

          <p className="mt-3 text-xs leading-6 text-amber-900">
            {pendingAction === "PUBLISH"
              ? "You are about to publish this project. It will become eligible for public discovery once the backend validates its information and available plots."
              : "You are about to unpublish this project. It will no longer be eligible for public discovery. Existing plot records and prices will remain unchanged."}
          </p>

          <div className="mt-4 flex flex-wrap justify-end gap-2">

            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-amber-200 bg-white px-4 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  Confirm{" "}
                  {pendingAction === "PUBLISH"
                    ? "Publish"
                    : "Unpublish"}
                </>
              )}
            </button>

          </div>

        </div>
      )}

      {/* ==================================
          ERROR MESSAGE
      ================================== */}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
        >
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <p className="text-xs leading-5 text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* ==================================
          SUCCESS MESSAGE
      ================================== */}

      {success && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3"
        >
          <CheckCircle2
            size={16}
            className="mt-0.5 shrink-0 text-emerald-600"
          />

          <p className="text-xs leading-5 text-emerald-700">
            {success}
          </p>
        </div>
      )}

    </div>
  );
};

export default ProjectPublicationTab;