import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Map,
  MapPin,
  BookOpen,
  Building2,
  Leaf,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import PublicPlatformNavbar from "../../components/common/PublicPlatformNavbar";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";

import { Button } from "../../components/ui/button";

import heroPanorama from "../../assets/homepage/hero-panorama.webp";
import heroLand from "../../assets/homepage/hero-land.webp";

// =====================================================
// PLOTBASE PRODUCTS
// =====================================================

const products = [
  {
    name: "Ramani",
    description: "Create, explore and share digital land maps.",
    action: "Start mapping",
    to: "/ramani",
    icon: Map,
    available: false,
  },
  {
    name: "FikaSite",
    description: "Organize site visits and keep track of locations.",
    action: "Create a visit",
    to: "/fikasite",
    icon: MapPin,
    available: false,
  },
  {
    name: "Maarifa",
    description: "Discover practical real estate knowledge.",
    action: "Explore knowledge",
    to: "/maarifa",
    icon: BookOpen,
    available: true,
  },
];

// =====================================================
// DASHBOARD PRODUCT CARD
// =====================================================

const DashboardProductCard = ({ product }) => {
  const Icon = product.icon;

  const cardClassName = [
    "group flex min-w-0 flex-col rounded-xl",
    "border border-zinc-200 bg-white p-4",
    "transition-colors md:p-5",
    product.name === "Maarifa"
      ? "col-span-2 md:col-span-1"
      : "col-span-1",
  ].join(" ");

  const content = (
    <>
      {/* PRODUCT ICON */}

      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 md:h-12 md:w-12">
        <Icon
          className="h-5 w-5 text-zinc-950 md:h-6 md:w-6"
          strokeWidth={1.8}
        />
      </div>

      {/* PRODUCT NAME */}

      <h3 className="text-sm font-semibold tracking-tight text-zinc-950 md:text-lg">
        {product.name}
      </h3>

      {/* PRODUCT DESCRIPTION */}

      <p className="mt-1 flex-1 text-xs leading-5 text-zinc-500 md:text-sm md:leading-6">
        {product.description}
      </p>

      {/* PRODUCT ACTION */}

      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 md:mt-6">
        {product.available ? (
          <>
            <span className="text-xs font-medium text-zinc-900 md:text-sm">
              {product.action}
            </span>

            <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-1" />
          </>
        ) : (
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-600">
            Coming Soon
          </span>
        )}
      </div>
    </>
  );

  if (!product.available) {
    return (
      <div className={cardClassName}>
        {content}
      </div>
    );
  }

  return (
    <Link
      to={product.to}
      className={`${cardClassName} hover:border-zinc-400 hover:bg-zinc-50`}
    >
      {content}
    </Link>
  );
};

// =====================================================
// AUTHENTICATED PUBLIC DASHBOARD
// =====================================================

const PublicDashboard = ({ user }) => {
  const firstName =
    user?.name?.trim().split(/\s+/)[0] || "there";

  return (
    <div className="min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom,0px))] bg-zinc-50 text-zinc-950 md:min-h-dvh">

      <PublicPlatformNavbar />

      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 md:py-8 lg:px-8">

        {/* WELCOME SECTION */}

        <section className="mb-6 md:mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
            Welcome back, {firstName}
          </h1>

          <p className="mt-1 text-xs text-zinc-500 md:text-sm">
            Explore your Plotbase tools.
          </p>
        </section>

        {/* PRODUCT TOOLS */}

        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-950 md:text-base">
            Your tools
          </h2>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {products.map((product) => (
              <DashboardProductCard
                key={product.name}
                product={product}
              />
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};

// =====================================================
// PUBLIC MARKETING HOMEPAGE
// =====================================================

const PublicHome = () => {
  const navigate = useNavigate();

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const isPublicMember =
    !authLoading &&
    ["investor", "buyer"].includes(user?.role);

  const scrollToTools = () => {
    document.getElementById("tools")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // ===================================================
  // AUTHENTICATION LOADING
  // ===================================================

  if (authLoading) {
    return (
      <div className="min-h-dvh bg-zinc-50">

        <PublicPlatformNavbar />

        <main
          className="mx-auto w-full max-w-6xl animate-pulse px-4 py-6 sm:px-6 lg:px-8"
          aria-busy="true"
          aria-label="Loading Plotbase"
        >
          <div className="mb-2 h-7 w-48 rounded-md bg-zinc-200" />

          <div className="mb-8 h-4 w-64 max-w-full rounded-md bg-zinc-200" />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`h-44 rounded-xl border border-zinc-200 bg-white ${
                  item === 3
                    ? "col-span-2 md:col-span-1"
                    : ""
                }`}
              />
            ))}
          </div>
        </main>

      </div>
    );
  }

  // ===================================================
  // AUTHENTICATED EXPERIENCE
  // ===================================================

  if (isPublicMember) {
    return <PublicDashboard user={user} />;
  }

  // ===================================================
  // GUEST EXPERIENCE
  // ===================================================

  return (
    <div className="min-h-dvh bg-background text-foreground">

      <PublicPlatformNavbar />

      <main>

        {/* ==========================================
            HERO SECTION
        ========================================== */}

        <section className="relative isolate overflow-hidden bg-white px-4 pb-28 pt-10 sm:px-6 sm:pb-28 sm:pt-12 lg:pb-32 lg:pt-14">

          {/* LANDSCAPE BACKGROUND */}

          <div className="pointer-events-none absolute inset-0 -z-10">
            <img
              src={heroPanorama}
              alt=""
              className="h-full w-full object-cover object-bottom"
              fetchPriority="high"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/65 to-transparent" />
          </div>

          {/* HERO CONTENT */}

          <div className="relative mx-auto max-w-4xl text-center">

            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              Digital tools for smarter
              <span className="block">real estate.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-700 sm:text-lg">
              Create land maps, organize site visits and discover
              real estate knowledge. All in one place.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">

              <Button
                size="lg"
                onClick={scrollToTools}
                className="h-11 rounded-lg px-5"
              >
                Explore Tools
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/register")}
                className="h-11 rounded-lg bg-white px-5"
              >
                Create Account
              </Button>

            </div>
          </div>

          {/* ANIMATED VIWANJA MARKER */}

          <div className="hero-land-marker pointer-events-none absolute bottom-5 left-[7%] flex select-none flex-col items-center lg:left-[12%]">

            <div className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur-sm sm:px-4 sm:text-sm">
              <MapPin className="h-4 w-4" />
              Viwanja
            </div>

            <div className="h-8 w-px bg-white sm:h-12" />

            <div className="h-3 w-3 rounded-full bg-white shadow-sm" />

          </div>

          {/* ANIMATED MASHAMBA MARKER */}

          <div className="hero-land-marker hero-land-marker-delayed pointer-events-none absolute bottom-5 right-[7%] flex select-none flex-col items-center lg:right-[12%]">

            <div className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur-sm sm:px-4 sm:text-sm">
              <Leaf className="h-4 w-4" />
              Mashamba
            </div>

            <div className="h-8 w-px bg-white sm:h-12" />

            <div className="h-3 w-3 rounded-full bg-white shadow-sm" />

          </div>

        </section>

        {/* ==========================================
            PUBLIC TOOLS
        ========================================== */}

        <section
          id="tools"
          className="scroll-mt-24 border-y border-border bg-muted/20 px-4 py-14 sm:px-6 sm:py-16"
        >
          <div className="mx-auto max-w-6xl">

            {/* SECTION HEADER */}

            <div className="mb-8 flex flex-col gap-2">

              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Explore Plotbase tools
              </h2>

              <p className="text-sm text-muted-foreground">
                Start using our available tools without creating an account.
              </p>

            </div>

            {/* PRODUCT CARDS */}

            <div className="grid gap-4 md:grid-cols-3">

              {products.map((product) => {
                const Icon = product.icon;

                return (
                  <Card
                    key={product.name}
                    className="group rounded-xl border-border bg-background shadow-none transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                  >

                    <CardHeader className="pb-3">

                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground">
                        <Icon className="h-5 w-5" />
                      </div>

                      <CardTitle className="text-base font-semibold">
                        {product.name}
                      </CardTitle>

                      <CardDescription className="text-sm leading-6">
                        {product.description}
                      </CardDescription>

                    </CardHeader>

                    <CardContent>

                      {product.available ? (
                        <Link
                          to={product.to}
                          className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
                        >
                          {product.action}

                          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                      ) : (
                        <span className="inline-flex rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                          Coming Soon
                        </span>
                      )}

                    </CardContent>

                  </Card>
                );
              })}

            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              No account required to get started with available tools.
            </p>

          </div>
        </section>

        {/* ==========================================
            REAL ESTATE MANAGEMENT SYSTEM
        ========================================== */}

        <section className="px-4 py-16 sm:px-6 sm:py-20">

          <div className="mx-auto max-w-6xl">

            <div className="grid items-center gap-10 overflow-hidden rounded-2xl border border-border bg-muted/20 p-5 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">

              {/* REMS CONTENT */}

              <div>

                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  For real estate businesses
                </div>

                <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  Plotbase Real Estate Management System
                </h2>

                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  A platform built to help real estate businesses
                  manage their{" "}
                  <span className="font-semibold text-[#47734c]">
                    viwanja na mashamba
                  </span>{" "}
                  from project creation to sales and payments.
                </p>

                <div className="mt-7">

                  <Button
                    size="lg"
                    onClick={() => navigate("/contact")}
                    className="h-11 rounded-lg px-5"
                  >
                    Contact Us
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                </div>

              </div>

              {/* REMS LAND IMAGE */}

              <div className="relative min-h-[240px] overflow-hidden rounded-xl border border-border sm:min-h-[320px]">

                <img
                  src={heroLand}
                  alt="Aerial view of surveyed land parcels and agricultural fields"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />

                <div className="absolute inset-0 bg-black/10" />

                <div className="absolute bottom-4 left-4 rounded-lg border border-white/30 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">

                  <p className="text-xs font-medium text-zinc-500">
                    Plotbase REMS
                  </p>

                  <p className="mt-0.5 text-sm font-semibold text-zinc-950">
                    Viwanja na Mashamba
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
};

export default PublicHome;