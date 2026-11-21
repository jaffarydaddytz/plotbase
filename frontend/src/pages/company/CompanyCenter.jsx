import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

const CompanyCenter = () => {
  const { token } = useAuth();

  const [destination, setDestination] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    const resolveCompanyDestination = async () => {
      setLoading(true);
      setError("");
      setDestination(null);

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        // ==========================================
        // STEP 1: FIND APPROVED COMPANY WORKSPACES
        // ==========================================

        const workspaceResponse = await axios.get(
          `${API_URL}/api/companies/my-workspaces`,
          {
            headers,
            signal: controller.signal,
          }
        );

        if (
          !workspaceResponse.data?.success ||
          !Array.isArray(workspaceResponse.data.workspaces)
        ) {
          throw new Error(
            "Unable to retrieve company workspaces."
          );
        }

        const workspaces =
          workspaceResponse.data.workspaces;

        // Approved company found.
        // Open its existing Projects dashboard.

        if (workspaces.length > 0) {
          const companyId = workspaces[0].companyId;

          if (!companyId) {
            throw new Error("Invalid company workspace.");
          }

          if (!controller.signal.aborted) {
            setDestination(
              `/company/${companyId}/projects`
            );
          }

          return;
        }

        // ==========================================
        // STEP 2: CHECK COMPANY APPLICATIONS
        // ==========================================

        const applicationsResponse = await axios.get(
          `${API_URL}/api/companies/my-applications`,
          {
            headers,
            signal: controller.signal,
          }
        );

        if (
          !applicationsResponse.data?.success ||
          !Array.isArray(
            applicationsResponse.data.applications
          )
        ) {
          throw new Error(
            "Unable to retrieve company applications."
          );
        }

        const applications =
          applicationsResponse.data.applications;

        if (controller.signal.aborted) return;

        // Existing applications:
        // Open application tracking.
        if (applications.length > 0) {
          setDestination("/company/applications");
          return;
        }

        // No company or applications:
        // Open registration.
        setDestination("/company/register");
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
            "Unable to load company information."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    resolveCompanyDestination();

    return () => controller.abort();
  }, [token, retryCount]);

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ==========================================
  // REDIRECT
  // ==========================================

  if (destination) {
    return <Navigate to={destination} replace />;
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50">
        <div
          role="status"
          className="text-center"
        >
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />

          <p className="mt-3 text-sm text-zinc-500">
            Opening company workspace...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-zinc-950">
          Company Workspace
        </h1>

        <p
          role="alert"
          className="mt-2 text-sm text-red-600"
        >
          {error ||
            "Unable to open your company workspace."}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              setRetryCount((count) => count + 1)
            }
            className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Try Again
          </button>

          <Link
            to="/"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CompanyCenter;