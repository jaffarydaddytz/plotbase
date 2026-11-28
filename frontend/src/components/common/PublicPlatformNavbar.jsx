import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  ChevronDown,
  UserRound,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { Button } from "../ui/button";
import Logo from "./Logo";
import { useAuth } from "../../context/AuthContext";

const productLinks = [
  { label: "Ramani", to: "/ramani" },
  { label: "FikaSite", to: "/fikasite" },
  { label: "ardhiMaarifa", to: "/ardhimaarifa" },
];

const PublicPlatformNavbar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const {
    user,
    loading: authLoading,
    logout,
  } = useAuth();

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const accountRef = useRef(null);

  const isAuthenticated = Boolean(user);

  const displayName = user?.name || "User";

  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  // Close menus when navigating
  useEffect(() => {
    setIsAccountOpen(false);
    setIsMobileOpen(false);
  }, [pathname]);

  // Close account menu on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target)
      ) {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );
    };
  }, []);

  // Escape key support
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsAccountOpen(false);
        setIsMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  const handleLogout = () => {
    setIsAccountOpen(false);
    setIsMobileOpen(false);

    logout("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

        {/* BRAND */}

        <div className="shrink-0">
          <Logo fontSize="1.35rem" to="/" />
        </div>

        {/* DESKTOP NAVIGATION */}

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 md:flex"
        >
          {productLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "rounded-lg px-4 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-muted font-semibold text-foreground"
                    : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* ACTIONS */}

        <div className="flex shrink-0 items-center gap-2">

          {/* GUEST ACTIONS */}

          {!authLoading && !isAuthenticated && (
            <>
              <Link
                to="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
              >
                Login
              </Link>

              <Button
                type="button"
                onClick={() => navigate("/register")}
                className="h-10 rounded-lg px-4"
              >
                Get Started
              </Button>
            </>
          )}

          {/* AUTHENTICATED ACCOUNT MENU */}

          {!authLoading && isAuthenticated && (
            <div
              ref={accountRef}
              className="relative"
            >

              <button
                type="button"
                onClick={() =>
                  setIsAccountOpen((previous) => !previous)
                }
                aria-label="Toggle account menu"
                aria-expanded={isAccountOpen}
                aria-controls="public-account-menu"
                className="flex h-10 items-center gap-2 rounded-lg border border-transparent px-2 transition-colors hover:border-zinc-200 hover:bg-zinc-50"
              >

                {user?.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt=""
                    className="h-8 w-8 rounded-full border object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">
                    {initials || "U"}
                  </span>
                )}

                <ChevronDown
                  className={`h-4 w-4 text-zinc-500 transition-transform ${
                    isAccountOpen ? "rotate-180" : ""
                  }`}
                />

              </button>

              {isAccountOpen && (
                <div
                  id="public-account-menu"
                  className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
                >

                  {/* ACCOUNT INFORMATION */}

                  <div className="border-b border-zinc-100 px-4 py-3">

                    <p className="truncate text-sm font-semibold text-zinc-950">
                      {displayName}
                    </p>

                    <p className="truncate text-xs text-zinc-500">
                      {user?.email}
                    </p>

                  </div>

                  {/* MY PROFILE */}

                  <div className="p-2">

                    <Link
                      to="/profile"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                    >
                      <UserRound className="h-4 w-4" />
                      My Profile
                    </Link>

                  </div>

                  {/* LOGOUT */}

                  <div className="border-t border-zinc-100 p-2">

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>

                  </div>

                </div>
              )}

            </div>
          )}

          {/* AUTHENTICATION LOADING */}

          {authLoading && (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          )}

          {/* MOBILE MENU BUTTON */}

     {/* MOBILE MENU BUTTON — GUESTS ONLY */}

{!authLoading && !isAuthenticated && (
  <button
    type="button"
    onClick={() => {
      setIsAccountOpen(false);
      setIsMobileOpen((previous) => !previous);
    }}
    aria-label="Toggle navigation"
    aria-expanded={isMobileOpen}
    aria-controls="public-mobile-navigation"
    className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-100 md:hidden"
  >
    {isMobileOpen ? (
      <X className="h-5 w-5" />
    ) : (
      <Menu className="h-5 w-5" />
    )}
  </button>
)}

        </div>
      </div>

      {/* MOBILE NAVIGATION */}

    {!authLoading && !isAuthenticated && isMobileOpen && (
        <nav
          id="public-mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-zinc-200 bg-background px-4 py-3 md:hidden"
        >

          <div className="space-y-1">

            {productLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  [
                    "block rounded-lg px-3 py-2.5 text-sm font-medium",
                    isActive
                      ? "bg-zinc-100 text-zinc-950"
                      : "text-zinc-600 hover:bg-zinc-100",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}

            {!authLoading && !isAuthenticated && (
              <Link
                to="/login"
                onClick={() => setIsMobileOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 sm:hidden"
              >
                Login
              </Link>
            )}

          </div>

        </nav>
      )}

    </header>
  );
};

export default PublicPlatformNavbar;