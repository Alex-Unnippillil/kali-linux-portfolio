export default function FilesLoading() {
  return (
    <div
      className="space-y-6 rounded-lg border border-white/10 bg-black/20 p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="files-loading"
    >
      <span className="sr-only">Loading file explorer…</span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-6 w-40 rounded bg-white/10 motion-safe:animate-pulse" />
        <div className="h-10 w-full max-w-xs rounded bg-white/5 motion-safe:animate-pulse sm:w-48" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-2/3 rounded bg-white/10 motion-safe:animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-white/10 motion-safe:animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="flex h-28 flex-col items-center justify-center gap-3 rounded-md border border-white/10 bg-white/5 p-4 text-center motion-safe:animate-pulse"
          >
            <div className="h-12 w-12 rounded bg-white/10" />
            <div className="h-3 w-16 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
