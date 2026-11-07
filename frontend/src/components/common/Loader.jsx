import { TextShimmer } from "@/components/text-shimmer";

// =====================================================
// PLOTBASE SHIMMER
// =====================================================

const PlotbaseShimmer = () => {
  return (
    <TextShimmer
      as="span"
      duration={2.5}
      spread={2}
      baseColor="#a1a1aa"
      shimmerColor="#18181b"
      className="font-comfortaa text-base font-bold tracking-tight"
    >
      plotbase
    </TextShimmer>
  );
};

// =====================================================
// PAGE PLACEHOLDER
// =====================================================

const PagePlaceholder = () => {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-6xl px-4 py-8 opacity-40 sm:px-6"
    >
      <div className="mb-6 space-y-3">
        <div className="h-7 w-48 rounded-md bg-zinc-200" />
        <div className="h-3 w-72 max-w-full rounded bg-zinc-200" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="h-28 rounded-lg bg-zinc-100" />

            <div className="mt-4 h-4 w-2/3 rounded bg-zinc-200" />

            <div className="mt-3 h-3 w-full rounded bg-zinc-100" />

            <div className="mt-2 h-3 w-4/5 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
};

// =====================================================
// MAIN PLOTBASE LOADER
// =====================================================

const Loader = ({ overlay = false }) => {
  // ---------------------------------------------------
  // TRANSPARENT OVERLAY
  // ---------------------------------------------------

  if (overlay) {
    return (
      <div
        role="status"
        aria-label="Loading Plotbase"
        aria-busy="true"
        className="absolute inset-0 z-20 flex items-center justify-center bg-white/55 backdrop-blur-[1px]"
      >
        <PlotbaseShimmer />
      </div>
    );
  }

  // ---------------------------------------------------
  // PAGE LOADING
  // ---------------------------------------------------

  // Rendered inside a layout that displays the Navbar.
  // The loader occupies the content area below it.

  return (
    <div
      role="status"
      aria-label="Loading Plotbase"
      aria-busy="true"
      className="relative isolate min-h-[calc(100dvh-60px)] overflow-hidden bg-zinc-50"
    >
      <PagePlaceholder />

      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
        <PlotbaseShimmer />
      </div>
    </div>
  );
};

// =====================================================
// DEFAULT EXPORT
// =====================================================

export default Loader;