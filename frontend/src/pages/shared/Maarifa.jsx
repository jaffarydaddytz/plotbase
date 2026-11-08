import { Link } from "react-router-dom";

import {
  ArrowRight,

  Clock3,
  FileCheck2,

  MapPinned,
  ShieldCheck,
  Sprout,
} from "lucide-react";

import Navbar from "../../components/common/Navbar";

const sampleArticles = [
  {
    id: 1,
    category: "Land Ownership",
    title: "Mambo ya Kuzingatia Kabla ya Kununua Kiwanja",
    description:
      "Fahamu mambo muhimu ya kuzingatia kabla ya kufanya uamuzi wa kununua ardhi nchini Tanzania.",
    icon: ShieldCheck,
  },
  {
    id: 2,
    category: "Guides",
    title: "Umuhimu wa Kuhakiki Nyaraka za Ardhi",
    description:
      "Jifunze kwa nini ni muhimu kuhakiki taarifa na nyaraka zinazohusiana na umiliki wa ardhi.",
    icon: FileCheck2,
  },
  {
    id: 3,
    category: "Investment",
    title: "Kuchagua Eneo Sahihi kwa Uwekezaji",
    description:
      "Elewa baadhi ya mambo yanayoweza kukusaidia kutathmini eneo kabla ya kuwekeza.",
    icon: MapPinned,
  },
  {
    id: 4,
    category: "Experiences",
    title: "Safari ya Mwekezaji wa Ardhi",
    description:
      "Maarifa na uzoefu wa vitendo utakaowasaidia wawekezaji kufanya maamuzi yenye taarifa.",
    icon: Sprout,
  },
];

const Maarifa = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6">

{/* COMPACT PAGE HEADER */}
<header className="mb-6">

  <div className="flex flex-wrap items-center gap-3">

    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
      Plotbase Maarifa
    </h1>

    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
      Coming Soon
    </span>

  </div>

  <p className="mt-2 text-sm text-muted-foreground">
    Maarifa na uzoefu kuhusu uwekezaji wa ardhi nchini Tanzania.
    {" "}Tupo Pamoja.
  </p>

</header>

        {/* SAMPLE ARTICLES */}
        <section className="mt-4">

          <div className="mb-4">

            <h2 className="text-xl font-semibold tracking-tight">
              Explore Upcoming Topics
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              A preview of what you'll discover on Plotbase Maarifa.
            </p>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {sampleArticles.map((article) => {
              const Icon = article.icon;

              return (
                <article
                  key={article.id}
                  className="flex flex-col rounded-xl border bg-card p-5 shadow-sm"
                >

                  <div className="mb-5 flex items-center justify-between">

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Icon
                        className="h-5 w-5"
                        strokeWidth={1.6}
                      />
                    </div>

                    <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                      Preview
                    </span>

                  </div>

                  <p className="text-xs font-medium text-muted-foreground">
                    {article.category}
                  </p>

                  <h3 className="mt-2 text-base font-semibold leading-6">
                    {article.title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                    {article.description}
                  </p>

                  <div className="mt-5 border-t pt-4">

                    <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      Coming Soon
                    </span>

                  </div>

                </article>
              );
            })}

          </div>

        </section>

        {/* FOOTER MESSAGE */}
        <div className="mt-12 border-t pt-8 text-center">

          <p className="text-sm text-muted-foreground">
            Your investment journey matters.
            We're building something valuable together.
          </p>

          <Link
            to="/viwanja"
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Explore Viwanja
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="mt-8 text-xs text-muted-foreground">
            Plotbase Tanzania — Tupo Pamoja.
          </p>

        </div>

      </main>
    </div>
  );
};

export default Maarifa;