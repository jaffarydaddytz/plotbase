import { Link, NavLink, useNavigate } from "react-router-dom";

import { Button } from "../ui/button";
import Logo from "./Logo";
import { useAuth } from "../../context/AuthContext";

const productLinks = [
  { label: "Ramani", to: "/ramani" },
  { label: "FikaSite", to: "/fikasite" },
  { label: "Maarifa", to: "/maarifa" },
];

const PublicPlatformNavbar = () => {
  const navigate = useNavigate();

  const { user, loading: authLoading } = useAuth();

  const isAuthenticated = Boolean(user);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

        {/* BRAND */}
        <div className="shrink-0">
          <Logo fontSize="1.35rem" />
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

          {!authLoading && isAuthenticated && (
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/profile")}
              className="h-10 rounded-lg px-4"
            >
              My Account
            </Button>
          )}

          {authLoading && (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          )}

        </div>
      </div>
    </header>
  );
};

export default PublicPlatformNavbar;