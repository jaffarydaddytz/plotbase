const Loader = () => {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center"
    >
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-2 w-2 animate-bounce rounded-full bg-zinc-700"
            style={{
              animationDelay: `${dot * 150}ms`,
              animationDuration: "900ms",
            }}
          />
        ))}
      </div>

      <span className="sr-only">Loading Plotbase...</span>
    </div>
  );
};

export default Loader;