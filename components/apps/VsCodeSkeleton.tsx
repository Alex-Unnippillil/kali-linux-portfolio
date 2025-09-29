export default function VsCodeSkeleton() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-black/20 bg-[#1e1e1e] text-white min-[1366px]:flex-row">
      <aside className="flex w-16 flex-col items-center gap-3 bg-[#252526] p-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-10 w-10 rounded bg-[#3a3d41] animate-pulse"
            aria-hidden
          />
        ))}
      </aside>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-end gap-3 border-b border-black/40 bg-[#1e1e1e] px-3 py-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-4 w-4 rounded bg-[#3a3d41] animate-pulse" aria-hidden />
          ))}
        </div>
        <div className="flex flex-1 flex-col md:flex-row">
          <div className="hidden w-48 flex-shrink-0 border-r border-black/40 bg-[#252526] p-3 md:flex md:flex-col md:gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-4 w-full rounded bg-[#3a3d41] animate-pulse" aria-hidden />
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-3 bg-[#1e1e1e] p-4">
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-8 w-32 rounded bg-[#2d2d2d] animate-pulse" aria-hidden />
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-2 rounded border border-black/40 bg-[#1b1f23] p-4">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className={`h-3 rounded bg-[#2d2d2d] animate-pulse ${index % 3 === 0 ? 'w-11/12' : 'w-full'}`}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-black/40 bg-[#007acc]/40 px-3 py-2 text-xs uppercase tracking-wide">
          <div className="h-4 w-16 rounded bg-white/20 animate-pulse" aria-hidden />
          <div className="h-4 w-20 rounded bg-white/20 animate-pulse" aria-hidden />
        </div>
      </div>
    </div>
  );
}
