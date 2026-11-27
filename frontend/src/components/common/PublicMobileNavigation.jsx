import { NavLink } from "react-router-dom";

import {
  Home,
  Map,
  MapPin,
  BookOpen,
  UserRound,
} from "lucide-react";

const navigationItems = [
  {
    label: "Home",
    to: "/",
    icon: Home,
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
    label: "Maarifa",
    to: "/maarifa",
    icon: BookOpen,
  },
  {
    label: "Profile",
    to: "/profile",
    icon: UserRound,
  },
];

const PublicMobileNavigation = () => {
  return (
    <nav
      aria-label="Mobile application navigation"
      className="
        fixed inset-x-0 bottom-0 z-50
        border-t border-zinc-200
        bg-white
        pb-[env(safe-area-inset-bottom)]
        md:hidden
      "
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">

        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "flex flex-col items-center justify-center",
                  "gap-1 transition-colors",
                  isActive
                    ? "text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-700",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`
                      flex h-8 w-12 items-center
                      justify-center rounded-xl
                      ${
                        isActive
                          ? "bg-zinc-100"
                          : "bg-transparent"
                      }
                    `}
                  >
                    <Icon
                      size={21}
                      strokeWidth={isActive ? 2.3 : 1.7}
                    />
                  </span>

                  <span
                    className={`text-[10px] ${
                      isActive
                        ? "font-semibold"
                        : "font-medium"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}

      </div>
    </nav>
  );
};

export default PublicMobileNavigation;