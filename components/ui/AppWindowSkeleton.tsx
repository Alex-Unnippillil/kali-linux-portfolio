import type { ReactNode } from 'react';

type AppWindowSkeletonProps = {
  /**
   * Title of the app that is currently loading. Shown to assistive tech users
   * inside the live region and to help tailor messaging.
   */
  title?: string;
  /**
   * Optional short description that clarifies what is being prepared.
   */
  description?: ReactNode;
  /**
   * Number of placeholder content rows to render below the header region.
   */
  lines?: number;
};

const buildLineWidths = (count: number) =>
  Array.from({ length: count }, (_, index) => 100 - index * 12).map((width) =>
    Math.max(width, 34),
  );

export default function AppWindowSkeleton({
  title = 'Loading app',
  description,
  lines = 4,
}: AppWindowSkeletonProps) {
  const widths = buildLineWidths(lines);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full w-full flex-col gap-6 rounded-xl border border-slate-800/60 bg-slate-950/80 p-6 text-slate-200 shadow-inner"
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg bg-slate-800/70 animate-pulse" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-4 w-40 rounded bg-slate-800/70 animate-pulse" />
          <div className="h-3 w-28 rounded bg-slate-900/70 animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        {widths.map((width, index) => (
          <div
            key={`skeleton-line-${index}`}
            className="h-3 rounded bg-slate-900/70 animate-pulse"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
      <span className="sr-only">
        {`${title} is loading.`}
        {description ? ` ${description}` : ''}
      </span>
    </div>
  );
}
