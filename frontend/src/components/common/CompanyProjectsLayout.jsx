import { useEffect, useState } from "react";

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

  const { user, logout } = useAuth();

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

    ...(canManageProjects
      ? [
          {
            name: "Create Project",
            icon: Plus,
            path: createProjectPath,
            key: "create",
            end: true,
          },
        ]
      : []),

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

          <Link
            to="/company/center"
            onClick={onClose}
            className="
              flex h-9 w-full items-center
              gap-2.5 rounded-lg px-2.5
              text-[13px] font-medium
              text-zinc-600 transition-colors
              hover:bg-zinc-100 hover:text-zinc-950
            "
          >
            <Building2
              size={17}
              strokeWidth={1.8}
            />

            <span>Switch Company</span>
          </Link>

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