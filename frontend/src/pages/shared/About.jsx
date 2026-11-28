import { useNavigate } from "react-router-dom";

import {
  ArrowRight,
  Building2,
  Map,
  MapPin,
  BookOpen,
  ShieldCheck,
  Lightbulb,
  Layers,
  Users,
} from "lucide-react";

import PublicPlatformNavbar from "../../components/common/PublicPlatformNavbar";
import { Button } from "../../components/ui/button";

const products = [
  {
    icon: Map,
    title: "Ramani",
    description:
      "Digital tools designed to simplify the creation, management and sharing of land maps.",
  },
  {
    icon: MapPin,
    title: "FikaSite",
    description:
      "A solution designed to simplify site visit organization, coordination and location management.",
  },
  {
    icon: BookOpen,
    title: "ardhiMaarifa",
    description:
      "A knowledge platform dedicated to practical real estate education and industry insights.",
  },
  {
    icon: Building2,
    title: "Plotbase REMS",
    description:
      "A real estate management system designed to support project management, inventory, sales and payments.",
  },
];

const values = [
  {
    icon: Lightbulb,
    title: "Innovation",
    description:
      "We embrace technology and continuously explore better ways to solve real-world challenges.",
  },
  {
    icon: Layers,
    title: "Simplicity",
    description:
      "We believe technology should make everyday work easier, not more complicated.",
  },
  {
    icon: Users,
    title: "Accessibility",
    description:
      "We aim to build practical and accessible solutions for individuals and businesses.",
  },
  {
    icon: ShieldCheck,
    title: "Trust",
    description:
      "We value transparency, reliability, privacy and responsible technology development.",
  },
];

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicPlatformNavbar />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pt-14">

        {/* PAGE HEADER */}
        <header className="mb-10 max-w-3xl">

          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            About Us
          </p>

          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Building technology for a smarter future.
          </h1>

          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
            We develop practical digital solutions that simplify
            everyday operations, improve business processes
            and empower individuals and organizations.
          </p>

        </header>

        {/* WHO WE ARE */}
        <section className="mb-10 rounded-xl border bg-muted/20 p-5 sm:p-7">

          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
            <Building2 className="h-5 w-5" strokeWidth={1.7} />
          </div>

          <h2 className="text-xl font-semibold tracking-tight">
            Who We Are
          </h2>

          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Plotbase Technologies Co. Ltd is a Tanzanian
            technology company focused on developing innovative,
            practical and accessible digital solutions.
          </p>

          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Through Plotbase, our real estate technology platform,
            we aim to contribute to the digital transformation
            of the real estate industry by simplifying everyday
            operations and improving the way people and businesses work.
          </p>

          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Our approach is centered on understanding real-world
            challenges and developing technology that delivers
            meaningful and sustainable value.
          </p>

        </section>

        {/* MISSION AND VISION */}
        <section className="mb-10 grid gap-4 md:grid-cols-2">

          <article className="rounded-xl border bg-card p-5 sm:p-6">

            <h2 className="text-lg font-semibold tracking-tight">
              Our Mission
            </h2>

            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              To simplify everyday challenges through innovative
              and accessible technology that empowers individuals
              and businesses.
            </p>

          </article>

          <article className="rounded-xl border bg-card p-5 sm:p-6">

            <h2 className="text-lg font-semibold tracking-tight">
              Our Vision
            </h2>

            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              To become a leading technology company delivering
              impactful digital solutions that contribute to a
              smarter and more connected future.
            </p>

          </article>

        </section>

        {/* OUR PRODUCTS */}
        <section className="mb-10">

          <div className="mb-5">

            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Our Products
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Practical digital solutions designed around
              real-world challenges.
            </p>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {products.map((product) => {
              const Icon = product.icon;

              return (
                <article
                  key={product.title}
                  className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/20"
                >

                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">

                    <Icon
                      className="h-5 w-5"
                      strokeWidth={1.7}
                    />

                  </div>

                  <h3 className="text-base font-semibold">
                    {product.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {product.description}
                  </p>

                </article>
              );
            })}

          </div>

        </section>

        {/* OUR VALUES */}
        <section className="mb-10">

          <div className="mb-5">

            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Our Values
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              The principles that guide everything we build.
            </p>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {values.map((value) => {
              const Icon = value.icon;

              return (
                <article
                  key={value.title}
                  className="rounded-xl border bg-card p-5"
                >

                  <Icon
                    className="mb-3 h-5 w-5"
                    strokeWidth={1.7}
                  />

                  <h3 className="text-sm font-semibold">
                    {value.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {value.description}
                  </p>

                </article>
              );
            })}

          </div>

        </section>

        {/* CALL TO ACTION */}
        <section className="rounded-xl border bg-muted/20 px-5 py-8 text-center sm:py-10">

          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Let's build the future together.
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Explore our digital solutions, connect with our team
            or discover opportunities to collaborate with Plotbase.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">

            <Button
              onClick={() => navigate("/")}
              className="gap-2"
            >
              Explore Plotbase
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/contact")}
            >
              Contact Us
            </Button>

          </div>

        </section>



      </main>
    </div>
  );
};

export default About;