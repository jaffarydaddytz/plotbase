import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import {
  Building2,
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";

import Logo from "./Logo";
import { useAuth } from "../../context/AuthContext";

// =====================================================
// NAVIGATION LINK
// =====================================================

const NavigationLink = ({
  to,
  children,
  pathname,
  onClick,
  mobile = false,
}) => {
  const isActive =
    pathname === to ||
    (to !== "/" && pathname.startsWith(`${to}/`));

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={[
        "transition-colors duration-150",

        mobile
          ? "flex min-h-10 w-full items-center rounded-lg px-3 py-2.5 text-sm"
          : "inline-flex h-9 items-center justify-center rounded-md px-3 text-[13px]",

        isActive
          ? mobile
            ? "bg-zinc-100 font-semibold text-zinc-950"
            : "font-bold text-zinc-950 underline decoration-2 underline-offset-[8px]"
          : "font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
      ].join(" ")}
    >
      {children}
    </Link>
  );
};
// =====================================================
// ACCOUNT MENU LINK
// =====================================================

const AccountMenuLink = ({
  to,
  icon: Icon,
  children,
  onClick,
}) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
  >
    <Icon size={16} strokeWidth={1.8} />
    <span>{children}</span>
  </Link>
);

// =====================================================
// NAVBAR
// =====================================================

const Navbar = () => {
  const { user, loading: authLoading, logout } = useAuth();

  const { pathname } = useLocation();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const accountRef = useRef(null);

  // ===================================================
  // AUTHENTICATION
  // ===================================================

  const isAuthenticated = Boolean(user);

  const isInvestor = user?.role === "investor";
  const isBuyer = user?.role === "buyer";
  const isSeller = user?.role === "seller";
  const isAdmin = user?.role === "admin";

  const canViewProfile = isInvestor || isBuyer;
  const canAccessCompanyCenter = isInvestor || isBuyer;

  // ===================================================
  // CLOSE MENUS
  // ===================================================

  const closeMenus = () => {
    setIsMobileOpen(false);
    setIsAccountOpen(false);
  };

  useEffect(() => {
    setIsMobileOpen(false);
    setIsAccountOpen(false);
  }, [pathname]);

  // ===================================================
  // CLOSE ACCOUNT MENU ON OUTSIDE CLICK
  // ===================================================

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target)
      ) {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );
    };
  }, []);

  // ===================================================
  // ESCAPE KEY SUPPORT
  // ===================================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeMenus();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // ===================================================
  // LOGOUT
  // ===================================================

  const handleLogout = () => {
    closeMenus();
    logout();
  };

  // ===================================================
  // USER INFORMATION
  // ===================================================

  const displayName = user?.name || "User";

  const userInitials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const accountRole = isAdmin
    ? "Platform Administrator"
    : isSeller
    ? "Seller"
    : "Investor";

  const Avatar = ({ size = "sm" }) => {
    const sizeClass =
      size === "lg" ? "h-10 w-10" : "h-8 w-8";

    if (user?.profilePic) {
      return (
        <img
          src={user.profilePic}
          alt=""
          className={`${sizeClass} rounded-full border border-zinc-200 object-cover`}
        />
      );
    }

    return (
      <span
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-zinc-950 text-[11px] font-semibold text-white`}
        aria-hidden="true"
      >
        {userInitials || "U"}
      </span>
    );
  };

  // ===================================================
  // NAVIGATION CONFIGURATION
  // ===================================================

  const getNavigationItems = () => {
    // VISITOR

    if (!isAuthenticated) {
      const isLoginPage = pathname === "/login";
      const isRegisterPage = pathname === "/register";

const items = [
  {
    label: "Viwanja",
    to: "/viwanja",
  },
  {
    label: "Mashamba",
    to: "/mashamba",
  },
  {
    label: "Maarifa",
    to: "/maarifa",
  },
];

      if (!isLoginPage) {
        items.push({
          label: isRegisterPage ? "Sign In" : "Login",
          to: "/login",
        });
      }

      if (!isRegisterPage) {
        items.push({
          label: isLoginPage ? "Create Account" : "Register",
          to: "/register",
        });
      }

      return items;
    }

    // INVESTOR

// INVESTOR

if (isInvestor) {
  return [
    {
      label: "Viwanja",
      to: "/viwanja",
    },
    {
      label: "Mashamba",
      to: "/mashamba",
    },
    {
      label: "Maarifa",
      to: "/maarifa",
    },
  ];
}

    // LEGACY BUYER

    if (isBuyer) {
      return [
        {
          label: "Projects",
          to: "/projects",
        },
        {
          label: "Wishlist",
          to: "/wishlist",
        },
        {
          label: "Messages",
          to: "/messages",
        },
        {
          label: "Contact",
          to: "/contact",
        },
      ];
    }

    // LEGACY SELLER

    if (isSeller) {
      return [
        {
          label: "Projects",
          to: "/projects",
        },
        {
          label: "Dashboard",
          to: "/seller/dashboard",
        },
      ];
    }

    // PLATFORM ADMIN

    if (isAdmin) {
      return [
        {
          label: "Projects",
          to: "/projects",
        },
        {
          label: "Admin Dashboard",
          to: "/admin-dashboard",
        },
        {
          label: "Company Verification",
          to: "/admin/company-verification",
        },
        {
          label: "Users",
          to: "/admin/users",
        },
      ];
    }

    return [
      {
        label: "Projects",
        to: "/projects",
      },
    ];
  };

  const navigationItems = getNavigationItems();

  // ===================================================
  // ACCOUNT MENU CONTENT
  // ===================================================

  const accountMenuContent = (
    <>
      {/* ACCOUNT HEADER */}

      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
        <Avatar size="lg" />

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-950">
            {displayName}
          </p>

          <p className="truncate text-xs text-zinc-500">
            {accountRole}
          </p>
        </div>
      </div>

      {/* PERSONAL ACCOUNT */}

      {canViewProfile && (
        <div className="p-2">
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            My Account
          </p>

          <AccountMenuLink
            to="/profile"
            icon={UserRound}
            onClick={closeMenus}
          >
            My Profile
          </AccountMenuLink>

          <AccountMenuLink
            to="/wishlist"
            icon={Heart}
            onClick={closeMenus}
          >
            My Wishlist
          </AccountMenuLink>
        </div>
      )}

      {/* BUSINESS */}

      {canAccessCompanyCenter && (
        <div className="border-t border-zinc-100 p-2">
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Business
          </p>

          <AccountMenuLink
            to="/company/center"
            icon={Building2}
            onClick={closeMenus}
          >
            Company Center
          </AccountMenuLink>
        </div>
      )}

      {/* LOGOUT */}

      <div className="border-t border-zinc-100 p-2">
        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
        >
          <LogOut size={16} strokeWidth={1.8} />
          Logout
        </button>
      </div>
    </>
  );

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <>
      {/* ============================================= */}
      {/* MAIN NAVBAR */}
      {/* ============================================= */}

      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 top-0 z-[1000] h-[60px] border-b border-zinc-200 bg-white/95 backdrop-blur-md"
      >
        <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

          {/* BRAND */}

          <div className="flex shrink-0 items-center">
            <Logo />
          </div>

          {/* DESKTOP NAVIGATION */}

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
            {!authLoading &&
              navigationItems.map((item) => (
             <NavigationLink
  key={item.to ?? item.label}
  to={item.to}
  
  pathname={pathname}
                >
                  {item.label}
                </NavigationLink>
              ))}
          </div>

          {/* RIGHT SECTION */}

          <div className="flex shrink-0 items-center gap-3">

            {/* SMART ACCOUNT MENU */}

            {!authLoading && isAuthenticated && (
              <div
                ref={accountRef}
                className="relative hidden lg:block"
              >
                <button
                  type="button"
                  onClick={() =>
                    setIsAccountOpen((previous) => !previous)
                  }
                  aria-label="Open account menu"
                  aria-expanded={isAccountOpen}
                  aria-controls="plotbase-account-menu"
                  className={[
                    "flex h-10 items-center gap-2 rounded-lg",
                    "border px-2 transition-colors",
                    isAccountOpen
                      ? "border-zinc-300 bg-zinc-100"
                      : "border-transparent hover:border-zinc-200 hover:bg-zinc-50",
                  ].join(" ")}
                >
                  <Avatar />

                  <ChevronDown
                    size={15}
                    className={`text-zinc-500 transition-transform ${
                      isAccountOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* DROPDOWN */}

                {isAccountOpen && (
                  <div
                    id="plotbase-account-menu"
                    className="absolute right-0 top-[calc(100%+10px)] z-[1050] w-[280px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg shadow-zinc-950/10"
                  >
                    {accountMenuContent}
                  </div>
                )}
              </div>
            )}

            {/* MOBILE MENU BUTTON */}

            <button
              type="button"
              onClick={() =>
                setIsMobileOpen((previous) => !previous)
              }
              aria-label={
                isMobileOpen
                  ? "Close navigation"
                  : "Open navigation"
              }
              aria-expanded={isMobileOpen}
              aria-controls="plotbase-mobile-navigation"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800 transition hover:bg-zinc-50 lg:hidden"
            >
              {isMobileOpen ? (
                <X size={20} />
              ) : (
                <Menu size={20} />
              )}
            </button>

          </div>
        </div>
      </nav>

      {/* ============================================= */}
      {/* MOBILE BACKDROP */}
      {/* ============================================= */}

      {isMobileOpen && (
        <div
          aria-hidden="true"
          onClick={closeMenus}
          className="fixed inset-0 z-[1100] bg-zinc-950/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* ============================================= */}
      {/* MOBILE DRAWER */}
      {/* ============================================= */}

      <aside
        id="plotbase-mobile-navigation"
        aria-label="Mobile navigation"
        aria-hidden={!isMobileOpen}
        inert={!isMobileOpen}
        className={[
          "fixed inset-y-0 left-0 z-[1200]",
          "flex w-[min(320px,85vw)] flex-col",
          "border-r border-zinc-200 bg-white shadow-xl",
          "transition-transform duration-200 lg:hidden",
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
      >
        {/* DRAWER HEADER */}

        <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-zinc-200 px-5">
          <Logo onClick={closeMenus} />

          <button
            type="button"
            onClick={closeMenus}
            aria-label="Close navigation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100"
          >
            <X size={19} />
          </button>
        </div>

        {/* NAVIGATION LINKS */}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Navigation
          </p>

          <div className="space-y-1">
            {!authLoading &&
              navigationItems.map((item) => (
                <NavigationLink
                  key={item.to}
                  to={item.to}
                  pathname={pathname}
                  onClick={closeMenus}
                  mobile
                >
                  {item.label}
                </NavigationLink>
              ))}
          </div>

          {/* ACCOUNT LINKS */}

          {!authLoading && isAuthenticated && (
            <div className="mt-6 border-t border-zinc-200 pt-4">
              {accountMenuContent}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Navbar;