import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Outlet,
  useParams,
} from "react-router-dom";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

const CompanyWorkspaceGuard = ({ allowedRoles }) => {
  const { companyId } = useParams();
  const { token } = useAuth();

  const [access, setAccess] = useState({
    companyId: null,
    loading: true,
    workspace: null,
    error: "",
  });

  useEffect(() => {
    if (!token || !companyId) return;

    const controller = new AbortController();

    const verifyWorkspace = async () => {
      setAccess({
        companyId,
        loading: true,
        workspace: null,
        error: "",
      });

      try {
        const response = await axios.get(
          `${API_URL}/api/companies/my-workspaces`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (
          !response.data?.success ||
          !Array.isArray(response.data.workspaces)
        ) {
          throw new Error(
            "Unable to verify company access."
          );
        }

        const workspace = response.data.workspaces.find(
          (item) =>
            String(item.companyId) === String(companyId)
        );

        if (!controller.signal.aborted) {
          setAccess({
            companyId,
            loading: false,
            workspace: workspace || null,
            error: "",
          });
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          axios.isCancel(error)
        ) {
          return;
        }

        setAccess({
          companyId,
          loading: false,
          workspace: null,
          error:
            error.response?.data?.message ||
            error.message ||
            "Unable to verify company access.",
        });
      }
    };

    verifyWorkspace();

    return () => controller.abort();
  }, [companyId, token]);

  // Authentication is enforced by the parent route.
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!companyId) {
    return <Navigate to="/company/center" replace />;
  }

  // Wait for verification of the current company.
  if (access.loading || access.companyId !== companyId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">
          Verifying company access...
        </p>
      </div>
    );
  }

  // Handle network or API errors.
  if (access.error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="text-sm font-semibold text-red-800">
            Unable to verify company access
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {access.error}
          </p>

          <Link
            to="/company/center"
            className="mt-4 inline-block text-sm font-medium text-zinc-900 underline"
          >
            Return to Company Center
          </Link>
        </div>
      </div>
    );
  }

  // Deny access to companies outside the user's workspaces.
  if (!access.workspace) {
    return <Navigate to="/company/center" replace />;
  }

  // Restrict actions to permitted company roles.
  if (
    allowedRoles?.length &&
    !allowedRoles.includes(access.workspace.role)
  ) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-950">
            Access Restricted
          </h2>

          <p className="mt-2 text-sm text-zinc-600">
            Your company role does not permit this action.
          </p>

          <Link
            to={`/company/${companyId}/projects`}
            className="mt-4 inline-block text-sm font-medium text-zinc-900 underline"
          >
            Back to Company Projects
          </Link>
        </div>
      </div>
    );
  }

  // Provide verified workspace information to child pages.
  return (
    <Outlet context={{ workspace: access.workspace }} />
  );
};

export default CompanyWorkspaceGuard;
