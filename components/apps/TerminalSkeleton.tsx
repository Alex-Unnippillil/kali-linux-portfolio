const terminalLines = [
  'w-5/6',
  'w-3/4',
  'w-full',
  'w-2/3',
  'w-11/12',
  'w-4/5',
  'w-5/6',
  'w-2/3',
];

export default function TerminalSkeleton() {
  return (
    <div className="flex h-full w-full flex-col bg-gray-900 text-white">
      <div className="flex flex-shrink-0 items-center gap-2 overflow-x-hidden bg-gray-800 text-sm">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 px-3 py-2 ${index === 0 ? 'bg-gray-700' : 'bg-gray-800'}`}
            aria-hidden
          >
            <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-3 rounded bg-white/20 animate-pulse" />
          </div>
        ))}
        <div className="ml-auto px-3 py-2">
          <div className="h-3 w-6 rounded bg-white/10 animate-pulse" aria-hidden />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 bg-black/80 p-4">
        <div className="flex items-center justify-between text-xs text-white/60">
          <div className="h-3 w-44 rounded bg-white/10 animate-pulse" aria-hidden />
          <div className="flex items-center gap-2">
            <div className="h-3 w-14 rounded bg-white/10 animate-pulse" aria-hidden />
            <div className="h-3 w-16 rounded bg-white/10 animate-pulse" aria-hidden />
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded border border-white/10 bg-black/60 p-4">
          <div className="flex h-full flex-col gap-2">
            {terminalLines.map((widthClass, index) => (
              <div
                key={widthClass + index}
                className={`h-3 rounded bg-white/10 animate-pulse ${widthClass}`}
                aria-hidden
              />
            ))}
            <div className="mt-auto flex items-center gap-2 pt-4">
              <div className="h-3 w-24 rounded bg-cyan-500/40 animate-pulse" aria-hidden />
              <div className="h-3 flex-1 rounded bg-white/10 animate-pulse" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
