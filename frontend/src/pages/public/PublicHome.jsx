import { useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Map,
  MapPin,
  BookOpen,
  Building2,
   Leaf,
} from "lucide-react";

import PublicPlatformNavbar from "../../components/common/PublicPlatformNavbar";
import heroPanorama from "../../assets/homepage/hero-panorama.webp";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";

import { Button } from "../../components/ui/button";

import heroLand from "../../assets/homepage/hero-land.webp";

const products = [
  {
    name: "Ramani",
    description: "Create, explore and share digital land maps.",
    action: "Start mapping",
    to: "/ramani",
    icon: Map,
  },
  {
    name: "FikaSite",
    description: "Organize site visits and keep track of locations.",
    action: "Create a visit",
    to: "/fikasite",
    icon: MapPin,
  },
  {
    name: "Maarifa",
    description: "Discover practical real estate knowledge.",
    action: "Explore knowledge",
    to: "/maarifa",
    icon: BookOpen,
  },
];

const PublicHome = () => {
  const navigate = useNavigate();

  const scrollToTools = () => {
    document.getElementById("tools")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">

      <PublicPlatformNavbar />

      <main>

        {/* HERO */}
{/* HERO */}
<section className="relative isolate overflow-hidden bg-white px-4 pb-28 pt-10 sm:px-6 sm:pb-28 sm:pt-12 lg:pb-32 lg:pt-14">

  {/* Landscape background */}
  <div className="pointer-events-none absolute inset-0 -z-10">
    <img
      src={heroPanorama}
      alt=""
      className="h-full w-full object-cover object-bottom"
      fetchPriority="high"
    />

    <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/65 to-transparent" />
  </div>

  {/* Hero content */}
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

  {/* Animated Viwanja marker */}
  <Link
    to="/viwanja"
    className="hero-land-marker absolute bottom-5 left-[7%] flex flex-col items-center lg:left-[12%]"
  >
    <div className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur-sm sm:px-4 sm:text-sm">
      <MapPin className="h-4 w-4" />
      Viwanja
    </div>

    <div className="h-8 w-px bg-white sm:h-12" />
    <div className="h-3 w-3 rounded-full bg-white shadow-sm" />
  </Link>

  {/* Animated Mashamba marker */}
  <Link
    to="/mashamba"
    className="hero-land-marker hero-land-marker-delayed absolute bottom-5 right-[7%] flex flex-col items-center lg:right-[12%]"
  >
    <div className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur-sm sm:px-4 sm:text-sm">
      <Leaf className="h-4 w-4" />
      Mashamba
    </div>

    <div className="h-8 w-px bg-white sm:h-12" />
    <div className="h-3 w-3 rounded-full bg-white shadow-sm" />
  </Link>

</section>


        {/* PUBLIC TOOLS */}
        <section
          id="tools"
          className="scroll-mt-24 border-y border-border bg-muted/20 px-4 py-14 sm:px-6 sm:py-16"
        >

          <div className="mx-auto max-w-6xl">

            <div className="mb-8 flex flex-col gap-2">

              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Explore Plotbase tools
              </h2>

              <p className="text-sm text-muted-foreground">
                Start using our tools without creating an account.
              </p>

            </div>

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

                      <Link
                        to={product.to}
                        className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
                      >
                        {product.action}

                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />

                      </Link>

                    </CardContent>

                  </Card>
                );
              })}

            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              No account required to get started.
            </p>

          </div>

        </section>


        {/* REAL ESTATE MANAGEMENT SYSTEM */}
        <section className="px-4 py-16 sm:px-6 sm:py-20">

          <div className="mx-auto max-w-6xl">

            <div className="grid items-center gap-10 overflow-hidden rounded-2xl border border-border bg-muted/20 p-5 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">

              {/* CONTENT */}
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
                  manage their <span className="font-semibold text-[#47734c]">viwanja na mashamba</span>
                  from project creation to sales and payments.

                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">

                  <Button
                    size="lg"
                    onClick={() => navigate("/contact?type=demo")}
                    className="h-11 rounded-lg px-5"
                  >
                    Request a Demo
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/contact")}
                    className="h-11 rounded-lg px-5"
                  >
                    Contact Us
                  </Button>

                </div>

              </div>


              {/* LAND IMAGE */}
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