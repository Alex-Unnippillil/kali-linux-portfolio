import type { FC } from 'react';

export type AppSuspenseFallbackProps = {
  appName?: string;
};

const AppSuspenseFallback: FC<AppSuspenseFallbackProps> = ({ appName }) => (
  <div
    role="status"
    className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-slate-600/60 bg-slate-900/60 p-6 text-sm text-slate-200 shadow-inner"
    data-testid="app-suspense-fallback"
  >
    <span className="animate-pulse font-semibold tracking-wide">
      Loading {appName ?? 'app'}…
    </span>
    <span className="text-xs text-slate-400">
      Preparing offline fixtures and workspace assets.
    </span>
  </div>
);

export default AppSuspenseFallback;
