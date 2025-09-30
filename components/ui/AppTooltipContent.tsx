import React from 'react';

type AppTooltipContentProps = {
  meta?: {
    title?: string;
    description?: string;
    path?: string;
    keyboard?: string[];
  } | null;
  placement?: 'top' | 'bottom';
  arrowOffset?: number;
};

const ARROW_OFFSET_FALLBACK = 24;

const AppTooltipContent: React.FC<AppTooltipContentProps> = ({
  meta,
  placement = 'bottom',
  arrowOffset = ARROW_OFFSET_FALLBACK,
}) => {
  const content = meta ? (
    <div className="space-y-2">
      {meta.title ? (
        <p className="text-sm font-semibold text-white">{meta.title}</p>
      ) : null}
      {meta.description ? (
        <p className="text-xs leading-relaxed text-gray-200">{meta.description}</p>
      ) : null}
      {meta.path ? (
        <p className="text-[11px] text-gray-300">
          <span className="font-semibold text-gray-100">Path:</span>{' '}
          <code className="rounded bg-black/40 px-1 py-0.5 text-[11px] text-ubt-grey">
            {meta.path}
          </code>
        </p>
      ) : null}
      {meta.keyboard?.length ? (
        <ul className="list-disc space-y-1 pl-4 text-[11px] text-gray-200">
          {meta.keyboard.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      ) : null}
    </div>
  ) : (
    <span className="text-xs text-gray-200">Metadata unavailable.</span>
  );

  return (
    <div
      data-testid="app-tooltip-content"
      className="relative text-xs text-white"
      style={{
        width: 'min(20rem, calc(100vw - 2rem))',
        maxWidth: '20rem',
      }}
    >
      <span
        data-testid="app-tooltip-arrow"
        aria-hidden="true"
        className="pointer-events-none absolute h-3 w-3 border border-gray-500/60 bg-ub-grey/95"
        style={{
          left: `${arrowOffset}px`,
          transform: 'translateX(-50%) rotate(45deg)',
          top: placement === 'bottom' ? '-6px' : undefined,
          bottom: placement === 'top' ? '-6px' : undefined,
        }}
      />
      <div className="space-y-2 rounded-md border border-gray-500/60 bg-ub-grey/95 px-3 py-2 text-left shadow-xl backdrop-blur">
        {content}
      </div>
    </div>
  );
};

export default AppTooltipContent;
