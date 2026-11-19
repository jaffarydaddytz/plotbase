import { useState } from "react";
import { Link } from "react-router-dom";

import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  FileCheck2,
  FileText,
  Flame,
  Grid2X2,
  MapPin,
  MapPinned,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Users,
} from "lucide-react";

import Navbar from "../../components/common/Navbar";
import communityImage from "../../assets/image.jpeg";

// =====================================================
// CATEGORIES
// =====================================================

const categories = [
  { id: "all", label: "All Topics", icon: Grid2X2 },
  { id: "Land Ownership", label: "Land Ownership", icon: MapPin },
  { id: "Guides", label: "Guides", icon: BookOpen },
  { id: "Investment", label: "Investment", icon: TrendingUp },
  { id: "Experiences", label: "Experiences", icon: Users },
];

// =====================================================
// PREVIEW ARTICLES
// =====================================================

const sampleArticles = [
  {
    id: 1,
    title: "Mambo ya Kuzingatia Kabla ya Kununua Kiwanja",
    description:
      "Mambo muhimu ya kuangalia kabla ya kununua kiwanja ili kuepuka hasara na kuhakikisha uwekezaji wako ni salama.",
    category: "Land Ownership",
    tags: ["Guides", "Land Ownership", "Investment"],
    readingTime: "5 min read",
    icon: ShieldCheck,
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=640&q=85",
  },
  {
    id: 2,
    title: "Umuhimu wa Kuhakiki Nyaraka za Ardhi",
    description:
      "Jifunze aina za nyaraka za ardhi, namna ya kuzihakiki, na kwa nini uhakiki wa nyaraka ni hatua muhimu ya kulinda uwekezaji wako.",
    category: "Guides",
    tags: ["Land Ownership", "Guides"],
    readingTime: "6 min read",
    icon: FileCheck2,
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=640&q=85",
  },
  {
    id: 3,
    title: "Kuchagua Eneo Sahihi kwa Uwekezaji",
    description:
      "Jinsi ya kutathmini na kuchagua eneo lenye fursa bora za ukuaji wa thamani, miundombinu na mahitaji ya soko.",
    category: "Investment",
    tags: ["Investment", "Guides", "Land Ownership"],
    readingTime: "5 min read",
    icon: MapPinned,
    image:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=640&q=85",
  },
  {
    id: 4,
    title: "Safari ya Mwekezaji wa Ardhi",
    description:
      "Uzoefu halisi kutoka kwa wawekezaji wa ardhi nchini Tanzania, changamoto walizokutana nazo, na mafunzo muhimu waliyopata.",
    category: "Experiences",
    tags: ["Experiences", "Investment"],
    readingTime: "7 min read",
    icon: Sprout,
    image: communityImage,
  },
];

// =====================================================
// UPCOMING TOPICS
// =====================================================

const upcomingTopics = [
  "Aina za Hati za Ardhi Tanzania",
  "Gharama Zinazohusiana na Ununuzi wa Kiwanja",
  "Namna ya Kupima na Kuthibitisha Mipaka",
  "Makosa ya Kawaida ya Wawekezaji Wapya",
  "Uwekezaji wa Ardhi: Fursa na Hatari",
];

// =====================================================
// CATEGORY BUTTON
// =====================================================

const CategoryButton = ({
  category,
  activeCategory,
  onSelect,
  compact = false,
}) => {
  const Icon = category.icon;
  const isActive = activeCategory === category.id;

  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      aria-pressed={isActive}
      className={[
        "flex items-center gap-3 rounded-lg text-left transition-colors",
        compact
          ? "shrink-0 px-3 py-2 text-xs"
          : "w-full px-3 py-2.5 text-[13px]",
        isActive
          ? "bg-zinc-950 font-semibold text-white"
          : "font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
      ].join(" ")}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
      <span>{category.label}</span>
    </button>
  );
};

// =====================================================
// ARTICLE CARD
// =====================================================

const ArticleCard = ({ article }) => {
  const Icon = article.icon;
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 sm:p-4">
      <div className="flex flex-col gap-4 sm:flex-row">

        {/* ARTICLE IMAGE */}

        <div className="h-44 w-full shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:h-[160px] sm:w-[180px] xl:w-[190px]">
          {imageFailed ? (
            <div className="flex h-full w-full items-center justify-center">
              <Icon
                className="h-10 w-10 text-zinc-400"
                strokeWidth={1.3}
              />
            </div>
          ) : (
            <img
              src={article.image}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* ARTICLE CONTENT */}

        <div className="flex min-w-0 flex-1 flex-col">

          {/* AUTHOR */}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100">
              <Icon
                className="h-3.5 w-3.5 text-zinc-700"
                strokeWidth={1.8}
              />
            </span>

            <span className="font-semibold text-zinc-900">
              Plotbase Maarifa
            </span>

            <span className="text-zinc-400">·</span>

            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600">
              Preview
            </span>
          </div>

          {/* TITLE */}

          <h2 className="mt-2 text-[17px] font-semibold leading-snug tracking-tight text-zinc-950 sm:text-[19px]">
            {article.title}
          </h2>

          {/* TAGS */}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* DESCRIPTION */}

          <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600 sm:text-[13px]">
            {article.description}
          </p>

          {/* METADATA */}

          <div className="mt-auto flex flex-wrap items-center gap-3 pt-3 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {article.readingTime}
            </span>

            <span className="h-1 w-1 rounded-full bg-zinc-300" />

            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Coming Soon
            </span>
          </div>

        </div>
      </div>
    </article>
  );
};

// =====================================================
// MAARIFA PAGE
// =====================================================

const Maarifa = () => {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredArticles =
    activeCategory === "all"
      ? sampleArticles
      : sampleArticles.filter((article) =>
          article.tags.includes(activeCategory)
        );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <Navbar />

      {/* MAIN PAGE CONTAINER */}

      <main
        className="
          mx-auto
          flex
          w-full
          max-w-[1440px]
          flex-col
          px-4
          pb-12
          pt-20
          sm:px-6
          lg:h-dvh
          lg:min-h-0
          lg:overflow-hidden
          lg:pb-5
          lg:px-8
        "
      >

        {/* ==========================================
            PAGE HEADER
        ========================================== */}

        <header className="mb-5 shrink-0">
          <div className="flex flex-wrap items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-200/70">
              <BookOpen className="h-6 w-6" strokeWidth={1.7} />
            </div>

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Plotbase Maarifa
                </h1>

                <span className="rounded-full bg-zinc-200 px-3 py-1 text-[10px] font-semibold text-zinc-700">
                  Coming Soon
                </span>
              </div>

              <p className="mt-1 text-xs text-zinc-600 sm:text-sm">
                Maarifa na uzoefu kuhusu uwekezaji wa ardhi nchini Tanzania.
              </p>

            </div>
          </div>
        </header>

        {/* ==========================================
            THREE-COLUMN LAYOUT

            LARGE SCREENS:
            Left   - Stationary
            Center - Scrollable
            Right  - Stationary
        ========================================== */}

        <div
          className="
            grid
            grid-cols-1
            items-start
            gap-4
            lg:min-h-0
            lg:flex-1
            lg:items-stretch
            lg:grid-cols-[175px_minmax(0,1fr)_245px]
            xl:grid-cols-[210px_minmax(0,1fr)_280px]
          "
        >

          {/* ========================================
              LEFT SIDEBAR - STATIONARY
          ======================================== */}

          <aside
            className="
              hidden
              lg:block
              lg:h-full
              lg:min-h-0
              lg:overflow-hidden
            "
          >
            <div className="rounded-xl border border-zinc-200 bg-white p-3">

              <nav
                aria-label="Maarifa topics"
                className="space-y-1"
              >
                {categories.map((category) => (
                  <CategoryButton
                    key={category.id}
                    category={category}
                    activeCategory={activeCategory}
                    onSelect={setActiveCategory}
                  />
                ))}
              </nav>

            </div>
          </aside>

          {/* ========================================
              CENTER CONTENT - SCROLLABLE
          ======================================== */}

          <section
            aria-label="Maarifa articles"
            tabIndex={0}
            className="
              min-w-0
              lg:h-full
              lg:min-h-0
              lg:overflow-y-auto
              lg:overscroll-contain
              lg:pr-2
            "
          >

            {/* MOBILE CATEGORY FILTERS */}

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {categories.map((category) => (
                <CategoryButton
                  key={category.id}
                  category={category}
                  activeCategory={activeCategory}
                  onSelect={setActiveCategory}
                  compact
                />
              ))}
            </div>

            {/* ARTICLES */}

            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                />
              ))}
            </div>

            {/* EMPTY STATE */}

            {filteredArticles.length === 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-zinc-400" />

                <p className="mt-3 text-sm font-medium text-zinc-900">
                  No topics available yet
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  More Maarifa articles are coming soon.
                </p>
              </div>
            )}

            {/* MOBILE EXPLORE BUTTON */}

            <div className="mt-5 lg:hidden">
              <Link
                to="/viwanja"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                <MapPin className="h-4 w-4" />
                Explore Viwanja
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* CENTER FOOTNOTE */}

            <div className="mt-6 border-t border-zinc-200 pt-4">
              <p className="text-xs text-zinc-500">
                Plotbase Maarifa — Tupo Pamoja.
              </p>
            </div>

          </section>

          {/* ========================================
              RIGHT SIDEBAR - STATIONARY
          ======================================== */}

          <aside
            className="
              hidden
              lg:block
              lg:h-full
              lg:min-h-0
              lg:overflow-hidden
            "
          >
            <div className="rounded-xl border border-zinc-200 bg-white p-4">

              {/* SIDEBAR TITLE */}

              <div className="flex items-center gap-2">
                <Flame
                  className="h-5 w-5 text-zinc-900"
                  strokeWidth={1.8}
                />

                <h2 className="text-base font-semibold tracking-tight">
                  Upcoming Topics
                </h2>
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Makala zijazo katika Plotbase Maarifa.
              </p>

              {/* UPCOMING TOPICS */}

              <div className="mt-4 divide-y divide-zinc-100">
                {upcomingTopics.map((topic) => (
                  <div
                    key={topic}
                    className="flex items-start gap-3 py-3"
                  >
                    <FileText
                      className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
                      strokeWidth={1.7}
                    />

                    <p className="text-xs font-medium leading-5 text-zinc-700">
                      {topic}
                    </p>
                  </div>
                ))}
              </div>

              {/* EXPLORE BUTTON */}

              <div className="mt-4 border-t border-zinc-200 pt-4">
                <Link
                  to="/viwanja"
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  <MapPin className="h-4 w-4" />
                  Explore Viwanja
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

            </div>
          </aside>

        </div>
      </main>
    </div>
  );
};

export default Maarifa;