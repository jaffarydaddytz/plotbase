import { useEffect, useState } from "react";

import axios from "axios";
import API_URL from "../../config";

import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useOutletContext,
  useParams,
} from "react-router-dom";

import {
  Building2,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  Plus,
  CalendarCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import Logo from "./Logo";

// =====================================================
// CONSTANTS
// =====================================================

const EDITOR_ROLES = [
  "COMPANY_ADMIN",
  "MANAGER",
];

// =====================================================
// NAVIGATION ITEM
// =====================================================

const NavigationItem = ({
  item,
  active,
  onNavigate,
}) => {
  const Icon = item.icon;

  const baseClasses = [
    "group relative flex h-9 w-full",
    "items-center gap-2.5",
    "rounded-lg border px-2.5",
    "text-[13px] transition-colors duration-150",
  ].join(" ");

  const activeClasses = active
    ? "border-zinc-300 bg-zinc-100 font-semibold text-zinc-950"
    : "border-transparent font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950";

  const content = (
    <>
      {/* ACTIVE INDICATOR */}

      {active && (
        <span
          aria-hidden="true"
          className="
            absolute inset-y-1 left-0
            w-[3px] rounded-r-full
            bg-zinc-950
          "
        />
      )}

      {/* ICON */}

      <Icon
        size={17}
        strokeWidth={active ? 2.2 : 1.8}
        className={
          active
            ? "shrink-0 text-zinc-950"
            : "shrink-0 text-zinc-500 group-hover:text-zinc-800"
        }
      />

      {/* LABEL */}

      <span className="min-w-0 flex-1 truncate">
        {item.name}
      </span>

      {/* COMPACT SOON BADGE */}

      {item.planned && (
        <span
          className="
            shrink-0 rounded-md
            border border-zinc-200
            bg-white px-1.5 py-0.5
            text-[10px] font-medium
            text-zinc-500
          "
        >
          Soon
        </span>
      )}
    </>
  );

  // Planned features are displayed but cannot
  // be opened until their pages are implemented.

  if (item.planned) {
    return (
      <div
        aria-disabled="true"
        title={`${item.name} — coming soon`}
        className={[
          baseClasses,
          "cursor-not-allowed border-transparent",
          "font-medium text-zinc-400",
        ].join(" ")}
      >
        {content}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={[
        baseClasses,
        activeClasses,
      ].join(" ")}
    >
      {content}
    </NavLink>
  );
};

// =====================================================
// COMPANY SIDEBAR
// =====================================================

const CompanySidebar = ({
  isOpen,
  onClose,
  workspace,
  companyId,
}) => {
  const { pathname } = useLocation();

const { user, logout, token } = useAuth();

// ===================================================
// COMPANY SWITCHER
// ===================================================

const [switcherOpen, setSwitcherOpen] = useState(false);

const [approvedWorkspaces, setApprovedWorkspaces] =
  useState([]);

const [companyApplications, setCompanyApplications] =
  useState([]);

const [switcherLoading, setSwitcherLoading] =
  useState(false);

const [switcherError, setSwitcherError] =
  useState("");

useEffect(() => {
  if (!switcherOpen || !token) return;

  const controller = new AbortController();

  const loadCompanies = async () => {
    setSwitcherLoading(true);
    setSwitcherError("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [workspacesResponse, applicationsResponse] =
        await Promise.all([
          axios.get(
            `${API_URL}/api/companies/my-workspaces`,
            {
              headers,
              signal: controller.signal,
            }
          ),

          axios.get(
            `${API_URL}/api/companies/my-applications`,
            {
              headers,
              signal: controller.signal,
            }
          ),
        ]);

      if (
        !workspacesResponse.data?.success ||
        !Array.isArray(workspacesResponse.data.workspaces) ||
        !applicationsResponse.data?.success ||
        !Array.isArray(applicationsResponse.data.applications)
      ) {
        throw new Error("Unable to retrieve company information.");
      }

      if (!controller.signal.aborted) {
        setApprovedWorkspaces(
          workspacesResponse.data.workspaces
        );

        setCompanyApplications(
          applicationsResponse.data.applications
        );
      }
    } catch (error) {
      if (
        controller.signal.aborted ||
        axios.isCancel(error)
      ) {
        return;
      }

      setSwitcherError(
        error.response?.data?.message ||
        error.message ||
        "Unable to load companies."
      );
    } finally {
      if (!controller.signal.aborted) {
        setSwitcherLoading(false);
      }
    }
  };

  loadCompanies();

  return () => controller.abort();
}, [switcherOpen, token]);

// Avoid displaying an approved company twice.
const approvedCompanyIds = new Set(
  approvedWorkspaces.map((company) =>
    String(company.companyId)
  )
);

const otherApplications = companyApplications.filter(
  (company) =>
    !approvedCompanyIds.has(
      String(company.id || company._id)
    )
);

const closeCompanySwitcher = () => {
  setSwitcherOpen(false);
  onClose();
};

  // ===================================================
  // COMPANY INFORMATION
  // ===================================================

  const companyName =
    workspace?.name ||
    workspace?.companyName ||
    workspace?.company?.name ||
    "Company Workspace";

  const companyRole =
    workspace?.role
      ? workspace.role.replaceAll("_", " ")
      : "Company Member";

  const userInitial = (user?.name || "U")
    .charAt(0)
    .toUpperCase();

  // ===================================================
  // COMPANY PATHS
  // ===================================================

  const projectsPath =
    `/company/${companyId}/projects`;

  const createProjectPath =
    `${projectsPath}/create`;

  // ===================================================
  // PERMISSIONS
  // ===================================================

  const canManageProjects =
    EDITOR_ROLES.includes(workspace?.role);

    const canViewReservations = [
  "COMPANY_ADMIN",
  "MANAGER",
  "SALES_OFFICER",
  "ACCOUNTANT",
].includes(workspace?.role);

  // ===================================================
  // COMPANY NAVIGATION
  // ===================================================

  const navigationItems = [
    {
      name: "Company Center",
      icon: LayoutDashboard,
      path: "/company/center",
      key: "center",
      end: true,
    },

    {
      name: "Projects",
      icon: FolderKanban,
      path: projectsPath,
      key: "projects",
      end: false,
    },

    {
      name: "Plot Management",
      icon: Layers3,
      key: "plots",
      planned: true,
    },

...(canViewReservations
  ? [
      {
        name: "Reservations",
        icon: CalendarCheck,
        path: `/company/${companyId}/reservations`,
        key: "reservations",
        end: true,
      },
    ]
  : []),

    {
      name: "Customers",
      icon: UserRound,
      key: "customers",
      planned: true,
    },

    {
      name: "Payments",
      icon: CreditCard,
      key: "payments",
      planned: true,
    },

    {
      name: "Staff Management",
      icon: Users,
      key: "staff",
      planned: true,
    },
  ];

  // ===================================================
  // ACTIVE NAVIGATION
  // ===================================================

  const isCreatePage =
    pathname === createProjectPath;

  const isProjectsPage =
    (
      pathname === projectsPath ||
      pathname.startsWith(`${projectsPath}/`)
    ) &&
    !isCreatePage;

  const isItemActive = (item) => {
    if (item.key === "projects") {
      return isProjectsPage;
    }

    if (item.key === "create") {
      return isCreatePage;
    }

    return pathname === item.path;
  };

  // ===================================================
  // LOGOUT
  // ===================================================

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <>
      {/* ===========================================
          MOBILE BACKDROP
      =========================================== */}

      {isOpen && (
        <div
          className="
            fixed inset-0 z-40
            bg-zinc-950/30 backdrop-blur-[2px]
            md:hidden
          "
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ===========================================
          COMPANY SIDEBAR
      =========================================== */}

      <aside
        id="company-workspace-sidebar"
        aria-label="Company navigation"
        className={[
          "fixed inset-y-0 left-0 z-50",
          "flex w-[220px] flex-col",
          "border-r border-zinc-200 bg-white",
          "transition-transform duration-200 ease-in-out",
          "md:translate-x-0",
          isOpen
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
      >
        {/* ==================================
            HEADER — SAME AS ADMIN
        ================================== */}

        <div
          className="
            flex h-14 shrink-0 items-center
            justify-between border-b border-zinc-200
            px-4
          "
        >
          <Logo
            to={projectsPath}
            fontSize="1.15rem"
          />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="
              inline-flex h-8 w-8 items-center
              justify-center rounded-lg
              text-zinc-500 transition-colors
              hover:bg-zinc-100 hover:text-zinc-950
              md:hidden
            "
          >
            <X size={18} />
          </button>
        </div>

        {/* ==================================
            COMPANY WORKSPACE IDENTITY
        ================================== */}

        <div className="shrink-0 border-b border-zinc-100 px-3 py-3">

          <div
            className="
              flex items-center gap-2.5
              rounded-lg border border-zinc-200
              bg-zinc-50 px-2.5 py-2
            "
          >
            {/* COMPANY ICON */}

            <div
              className="
                flex h-8 w-8 shrink-0
                items-center justify-center
                rounded-lg border border-zinc-200
                bg-white text-zinc-800
              "
            >
              <Building2 size={16} />
            </div>

            {/* COMPANY NAME */}

            <div className="min-w-0 flex-1">

              <p
                title={companyName}
                className="
                  truncate text-xs font-semibold
                  text-zinc-950
                "
              >
                {companyName}
              </p>

              <p className="truncate text-[11px] text-zinc-500">
                Company Workspace
              </p>

            </div>
          </div>

        </div>

        {/* ==================================
            COMPACT COMPANY NAVIGATION
        ================================== */}

        <nav
          aria-label="Company workspace sections"
          className="
            min-h-0 flex-1 overflow-y-auto
            px-3 py-3
          "
        >
          <div className="space-y-1">

            {navigationItems.map((item) => (
              <NavigationItem
                key={item.key}
                item={item}
                active={isItemActive(item)}
                onNavigate={onClose}
              />
            ))}

          </div>
        </nav>

        {/* ==================================
            COMPACT COMPANY FOOTER
        ================================== */}

        <div
          className="
            shrink-0 border-t border-zinc-200
            bg-white px-3 py-2
          "
        >
          {/* SWITCH COMPANY */}

{/* COMPANY SWITCHER */}

<div className="relative">

  <button
    type="button"
    onClick={() => setSwitcherOpen((open) => !open)}
    aria-expanded={switcherOpen}
    aria-controls="company-switcher-menu"
    className="
      flex h-9 w-full items-center
      gap-2.5 rounded-lg px-2.5
      text-[13px] font-medium
      text-zinc-600 transition-colors
      hover:bg-zinc-100 hover:text-zinc-950
    "
  >
    <Building2 size={17} strokeWidth={1.8} />

    <span className="flex-1 text-left">
      Switch Company
    </span>

    <span className="text-xs text-zinc-400">
      {switcherOpen ? "▲" : "▼"}
    </span>
  </button>

  {switcherOpen && (
    <div
      id="company-switcher-menu"
      className="
        absolute bottom-full left-0 right-0 z-50
        mb-2 max-h-[55vh] overflow-y-auto
        rounded-xl border border-zinc-200
        bg-white p-2 shadow-lg
      "
    >

      <p className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        My Companies
      </p>

      {switcherLoading ? (
        <p className="px-2 py-3 text-xs text-zinc-500">
          Loading companies...
        </p>
      ) : switcherError ? (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-2 text-xs text-red-700"
        >
          {switcherError}
        </div>
      ) : (
        <>
          {/* APPROVED COMPANIES */}

          {approvedWorkspaces.map((company) => {
            const isCurrent =
              String(company.companyId) ===
              String(companyId);

return (
  <Link
    key={String(company.companyId)}
    to={`/company/${company.companyId}/projects`}
    onClick={() => {
      const userId = user?.id || user?._id;

      if (userId) {
        try {
          localStorage.setItem(
            `plotbase:lastCompany:${String(userId)}`,
            String(company.companyId)
          );
        } catch {
          // Navigation must still work if storage is unavailable.
        }
      }

      closeCompanySwitcher();
    }}
    className="
      block rounded-lg px-2 py-2.5
      transition-colors hover:bg-zinc-50
    "
  >
    <div className="flex items-center justify-between gap-2">
      <span
        className="truncate text-xs font-semibold text-zinc-900"
        title={company.name}
      >
        {company.name}
      </span>

      {isCurrent && (
        <span className="shrink-0 text-[10px] font-medium text-zinc-500">
          Current
        </span>
      )}
    </div>

    <p className="mt-1 truncate text-[11px] text-zinc-500">
      Approved ·{" "}
      {company.role?.replaceAll("_", " ") || "Member"}
    </p>
  </Link>
);
          })}

          {/* OTHER COMPANY APPLICATIONS */}

          {otherApplications.map((company) => {
            const status =
              company.verificationStatus || "DRAFT";

            return (
              <Link
                key={String(company.id || company._id)}
                to="/company/applications"
                onClick={closeCompanySwitcher}
                className="
                  block rounded-lg px-2 py-2.5
                  transition-colors hover:bg-zinc-50
                "
              >
                <p
                  className="truncate text-xs font-semibold text-zinc-900"
                  title={company.name}
                >
                  {company.name}
                </p>

                <p className="mt-1 text-[11px] text-zinc-500">
                  {status === "PENDING"
                    ? "Pending Verification"
                    : status}
                </p>
              </Link>
            );
          })}

          {approvedWorkspaces.length === 0 &&
            otherApplications.length === 0 && (
              <p className="px-2 py-3 text-xs text-zinc-500">
                No companies found.
              </p>
            )}
        </>
      )}

      {/* ADDITIONAL ACTIONS */}

      <div className="mt-2 space-y-1 border-t border-zinc-100 pt-2">

        <Link
          to="/company/applications"
          onClick={closeCompanySwitcher}
          className="
            block rounded-lg px-2 py-2
            text-xs font-medium text-zinc-700
            hover:bg-zinc-50
          "
        >
          View Applications
        </Link>

        <Link
          to="/company/register"
          onClick={closeCompanySwitcher}
          className="
            block rounded-lg px-2 py-2
            text-xs font-medium text-zinc-900
            hover:bg-zinc-50
          "
        >
          + Register Company
        </Link>

      </div>
    </div>
  )}
</div>

          {/* COMPANY USER PROFILE */}

          <div
            className="
              flex items-center gap-2.5
              rounded-lg px-2 py-2
            "
          >
            {/* AVATAR */}

            <div
              className="
                flex h-8 w-8 shrink-0
                items-center justify-center
                rounded-full bg-zinc-900
                text-xs font-semibold text-white
              "
            >
              {userInitial}
            </div>

            {/* NAME AND ROLE */}

            <div className="min-w-0 flex-1">

              <p
                title={user?.name || ""}
                className="
                  truncate text-xs font-semibold
                  text-zinc-950
                "
              >
                {user?.name || "Company User"}
              </p>

              <p
                title={companyRole}
                className="
                  truncate text-[11px]
                  text-zinc-500
                "
              >
                {companyRole}
              </p>

            </div>

          </div>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={handleLogout}
            className="
              flex h-9 w-full items-center
              gap-2.5 rounded-lg px-2.5
              text-[13px] font-medium
              text-zinc-600 transition-colors
              hover:bg-zinc-100 hover:text-zinc-950
            "
          >
            <LogOut
              size={17}
              strokeWidth={1.8}
            />

            <span>Logout</span>
          </button>

        </div>

      </aside>
    </>
  );
};

// =====================================================
// COMPANY PROJECTS LAYOUT
// =====================================================

const CompanyProjectsLayout = () => {
  const { companyId } = useParams();

  const { pathname } = useLocation();

  // Workspace information has already been verified
  // by CompanyWorkspaceGuard.

  const { workspace } = useOutletContext() || {};

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  // ===================================================
  // CLOSE SIDEBAR ON NAVIGATION
  // ===================================================

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // ===================================================
  // CLOSE SIDEBAR USING ESCAPE
  // ===================================================

  useEffect(() => {
    if (!sidebarOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [sidebarOpen]);

  // ===================================================
  // COMPANY NAME
  // ===================================================

  const companyName =
    workspace?.name ||
    workspace?.companyName ||
    workspace?.company?.name ||
    "Company Workspace";

  return (
    <div className="min-h-screen w-full bg-zinc-50">

      {/* ==================================
          COMPANY SIDEBAR
      ================================== */}

      <CompanySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        workspace={workspace}
        companyId={companyId}
      />

      {/* ==================================
          MAIN CONTENT AREA
      ================================== */}

      <div
        className="
          min-h-screen min-w-0
          md:pl-[220px]
        "
      >
        {/* ==================================
            MOBILE HEADER
        ================================== */}

        <header
          className="
            sticky top-0 z-30
            flex h-14 items-center gap-3
            border-b border-zinc-200
            bg-white px-4
            md:hidden
          "
        >
          {/* MENU BUTTON */}

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open company navigation"
            aria-controls="company-workspace-sidebar"
            aria-expanded={sidebarOpen}
            className="
              inline-flex h-9 w-9
              items-center justify-center
              rounded-lg border border-zinc-200
              text-zinc-700 transition-colors
              hover:bg-zinc-100
            "
          >
            <Menu size={19} />
          </button>

          {/* MOBILE HEADER LABEL */}

          <div className="min-w-0 flex-1">

            <p className="truncate text-sm font-semibold text-zinc-950">
              {companyName}
            </p>

            <p className="text-[11px] text-zinc-500">
              Company Workspace
            </p>

          </div>

        </header>

        {/* ==================================
            PAGE CONTENT
        ================================== */}

        <main
          className="
            w-full min-w-0
            px-4 py-5
            sm:px-6
            md:px-7
          "
        >
          <div className="mx-auto w-full max-w-[1600px]">

            {/* Pass the verified workspace to
                all company project pages. */}

            <Outlet context={{ workspace }} />

          </div>
        </main>

      </div>

    </div>
  );
};

// =====================================================
// COMPANY PROJECT EDITOR GUARD
// =====================================================

// This guard reuses the verified company membership
// from CompanyWorkspaceGuard.
//
// Only COMPANY_ADMIN and MANAGER can access
// Create Project and Edit Project.
//
// Backend permissions remain authoritative.

const CompanyProjectEditorGuard = () => {
  const { workspace } = useOutletContext() || {};

  const canManageProjects =
    EDITOR_ROLES.includes(workspace?.role);

  if (!canManageProjects) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-6">

        <h2 className="text-base font-semibold text-zinc-950">
          Access Restricted
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Only Company Administrators and Managers
          can create or edit projects.
        </p>

      </div>
    );
  }

  return <Outlet context={{ workspace }} />;
};

// =====================================================
// EXPORTS
// =====================================================

export {
  CompanyProjectsLayout,
  CompanyProjectEditorGuard,
};

export default CompanyProjectsLayout;