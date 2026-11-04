const Loader = () => {
  return (
    <div
      role="status"
      aria-label="Loading Plotbase"
      className="flex min-h-screen items-center justify-center"
    >
      <div className="flex items-center gap-2" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="plotbase-loader-dot h-2 w-2 rounded-full bg-zinc-900"
            style={{
              animationDelay: `${dot * -150}ms`,
            }}
          />
        ))}
      </div>

      <span className="sr-only">Loading Plotbase...</span>
    </div>
  );
};

export default Loader;