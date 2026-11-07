import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardCheck,
  MapPinned,
  Store,
  CreditCard,
  Settings,
  LogOut,
  X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import Logo from "./Logo";

// =====================================================
// PLOTBASE ADMIN NAVIGATION
// =====================================================

const NAV_ITEMS = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin-dashboard",
  },
  {
    name: "Users",
    icon: Users,
    path: "/admin/users",
  },
  {
    name: "Company Verification",
    icon: ClipboardCheck,
    path: "/admin/company-verification",
  },
  {
    name: "Companies",
    icon: Building2,
    path: "/admin/companies",
    planned: true,
  },
  {
    name: "Projects",
    icon: MapPinned,
    path: "/admin/projects",
    planned: true,
  },
  {
    name: "Marketplace",
    icon: Store,
    path: "/admin/marketplace",
  },
  {
    name: "Payments",
    icon: CreditCard,
    path: "/admin/payments",
    planned: true,
  },
  {
    name: "Settings",
    icon: Settings,
    path: "/admin/settings",
    planned: true,
  },
];

// =====================================================
// ADMIN SIDEBAR
// =====================================================

const AdminSidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const userInitial = (user?.name || "A")
    .charAt(0)
    .toUpperCase();

  // ===================================================
  // LOGOUT
  // ===================================================

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <>
      {/* MOBILE BACKDROP */}

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

      {/* SIDEBAR */}

      <aside
        id="admin-sidebar"
        aria-label="Admin navigation"
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
        {/* =========================================== */}
        {/* HEADER */}
        {/* =========================================== */}

        <div
          className="
            flex h-14 shrink-0 items-center
            justify-between border-b border-zinc-200
            px-4
          "
        >
          <Logo
            to="/admin-dashboard"
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

        {/* =========================================== */}
        {/* COMPACT NAVIGATION */}
        {/* =========================================== */}

        <nav
          className="
            min-h-0 flex-1 overflow-y-auto
            px-3 py-3
          "
        >
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      "group relative flex h-9 w-full",
                      "items-center gap-2.5",
                      "rounded-lg border px-2.5",
                      "text-[13px] transition-colors duration-150",

                      isActive
                        ? "border-zinc-300 bg-zinc-100 font-semibold text-zinc-950"
                        : "border-transparent font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* ACTIVE INDICATOR */}

                      {isActive && (
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
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className={
                          isActive
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
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* =========================================== */}
        {/* COMPACT ADMIN FOOTER */}
        {/* =========================================== */}

        <div
          className="
            shrink-0 border-t border-zinc-200
            bg-white px-3 py-2
          "
        >
          {/* ADMIN PROFILE */}

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
                className="
                  truncate text-xs font-semibold
                  text-zinc-950
                "
              >
                {user?.name || "Administrator"}
              </p>

              <p
                className="
                  truncate text-[11px]
                  text-zinc-500
                "
              >
                Platform Administrator
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
              hover:bg-zinc-100
              hover:text-zinc-950
            "
          >
            <LogOut size={17} strokeWidth={1.8} />

            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;