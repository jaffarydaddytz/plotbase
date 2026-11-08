import { useNavigate } from "react-router-dom";

import {
  ArrowRight,
  Building2,
  MapPinned,
  ShieldCheck,
  Users,
} from "lucide-react";

import Navbar from "../../components/common/Navbar";
import { Button } from "../../components/ui/button";

const values = [
  {
    icon: Users,
    title: "For Investors",
    description:
      "Explore land investment opportunities, discover projects, and access information to support informed decisions.",
  },
  {
    icon: Building2,
    title: "For Real Estate Companies",
    description:
      "A digital platform designed to help approved real estate companies present and manage their land projects.",
  },
  {
    icon: ShieldCheck,
    title: "Building Trust",
    description:
      "We are developing company verification and transparent project information to support a more trustworthy marketplace.",
  },
];

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6">

        {/* PAGE HEADER */}
        <header className="mb-8">

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <MapPinned className="h-3.5 w-3.5" />
            About Plotbase Tanzania
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Making Land Investment More Accessible
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Plotbase Tanzania is a digital real estate platform
            designed to connect land investors with real estate
            companies and land investment opportunities across
            Tanzania.
          </p>

          <p className="mt-3 text-sm font-medium">
            Safari yako ya uwekezaji ni muhimu kwetu.
            Tupo Pamoja.
          </p>

        </header>

        {/* WHAT IS PLOTBASE */}
        <section className="mb-10 rounded-xl border bg-card p-6 sm:p-8">

          <h2 className="text-xl font-semibold tracking-tight">
            What is Plotbase?
          </h2>

          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Plotbase is building a centralized digital
            marketplace where investors can explore land
            projects and access relevant project information.
          </p>

          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Our platform is designed around two important
            groups: investors looking for land opportunities
            and verified real estate companies presenting
            their projects.
          </p>

          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Through technology, we aim to make discovering
            land opportunities simpler, more organized,
            and more transparent.
          </p>

        </section>

        {/* OUR MISSION */}
        <section className="mb-10">

          <h2 className="text-xl font-semibold tracking-tight">
            Our Mission
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            To simplify how people discover and explore land
            investment opportunities while helping real estate
            companies connect with potential investors through
            a reliable digital platform.
          </p>

        </section>

        {/* WHO WE SERVE */}
        <section className="mb-10">

          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-tight">
              Who We Serve
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Building a better land investment experience
              for everyone involved.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">

            {values.map((value) => {
              const Icon = value.icon;

              return (
                <article
                  key={value.title}
                  className="rounded-xl border bg-card p-5 shadow-sm"
                >

                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={1.7}
                    />
                  </div>

                  <h3 className="text-base font-semibold">
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

        {/* OUR COMMITMENT */}
        <section className="mb-10 rounded-xl border bg-muted/30 p-6 sm:p-8">

          <h2 className="text-xl font-semibold tracking-tight">
            Our Commitment
          </h2>

          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            At Plotbase, we believe that accessing land
            investment information should be straightforward.
            We are committed to improving the experience
            through technology, transparency, and continuous
            platform development.
          </p>

          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Investors should still independently verify
            property details, ownership documents, and
            applicable legal requirements before making
            financial commitments.
          </p>

        </section>

        {/* CALL TO ACTION */}
        <section className="border-t pt-8 text-center">

          <h2 className="text-xl font-semibold">
            Your Land Investment Journey Starts Here
          </h2>

          <p className="mt-3 text-sm text-muted-foreground">
            Discover opportunities and explore what
            Plotbase has to offer.
          </p>

          <Button
            onClick={() => navigate("/viwanja")}
            className="mt-5 gap-2"
          >
            Explore Viwanja
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="mt-8 text-sm font-medium text-muted-foreground">
            Plotbase Tanzania — Tupo Pamoja.
          </p>

        </section>

      </main>
    </div>
  );
};

export default About;