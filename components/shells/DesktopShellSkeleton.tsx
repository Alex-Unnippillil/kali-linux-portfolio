import React from 'react';

const gridPlaceholders = ['one', 'two', 'three', 'four', 'five', 'six'] as const;
const dockPlaceholders = ['dock-a', 'dock-b', 'dock-c', 'dock-d', 'dock-e'] as const;

export default function DesktopShellSkeleton() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-300">
      <div className="h-11 w-full animate-pulse bg-slate-900/80 backdrop-blur-sm" />
      <div id="window-area" className="flex flex-1 items-center justify-center p-6">
        <div className="grid w-full max-w-4xl grid-cols-2 gap-6 lg:grid-cols-3">
          {gridPlaceholders.map((placeholder) => (
            <div
              key={placeholder}
              className="flex aspect-square flex-col items-center justify-center rounded-lg bg-slate-800/60 p-4 text-center shadow-inner animate-pulse"
            >
              <div className="mb-3 h-10 w-10 rounded-full bg-slate-700/80" />
              <div className="h-2 w-16 rounded-full bg-slate-700/60" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex h-16 w-full items-center justify-center gap-4 bg-slate-950/80 px-6 pb-4 pt-3 backdrop-blur-md">
        {dockPlaceholders.map((placeholder) => (
          <div key={placeholder} className="h-4 w-12 rounded-full bg-slate-800/70 animate-pulse" />
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-red-500/50 animate-pulse" />
          <div className="h-5 w-5 rounded-full bg-yellow-400/50 animate-pulse" />
          <div className="h-5 w-5 rounded-full bg-green-500/50 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
