import { NavLink } from "react-router-dom";
import {
  House,
  Map,
  MapPin,
  BookOpen,
  UserRound,
  LayoutDashboard,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const MobileBottomNav = () => {
  const { user, loading } = useAuth();

  const isAuthenticated = Boolean(user);

  const navigationItems = [
    {
      label: "Home",
      to: "/",
      icon: House,
      end: true,
    },
    {
      label: "Ramani",
      to: "/ramani",
      icon: Map,
    },
    {
      label: "FikaSite",
      to: "/fikasite",
      icon: MapPin,
    },
    {
      label: "ardhiMaarifa",
      to: "/ardhimaarifa",
      icon: BookOpen,
    },
    {
      label: isAuthenticated ? "My Plotbase" : "Account",
      to: isAuthenticated ? "/app" : "/login",
      icon: isAuthenticated ? LayoutDashboard : UserRound,
    },
  ];

  if (loading) return null;

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-[1000]",
        "border-t border-border bg-background",
        "pb-[env(safe-area-inset-bottom)]",
        "lg:hidden"
      )}
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "relative flex min-w-0 flex-col",
                  "items-center justify-center gap-1",
                  "transition-colors duration-150",
                  "focus-visible:outline-none",
                  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.4 : 1.7}
                    aria-hidden="true"
                  />

                  <span
                    className={cn(
                      "whitespace-nowrap text-[10px]",
                      isActive
                        ? "font-semibold"
                        : "font-medium"
                    )}
                  >
                    {item.label}
                  </span>

                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 h-0.5 w-5 rounded-full bg-foreground"
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;