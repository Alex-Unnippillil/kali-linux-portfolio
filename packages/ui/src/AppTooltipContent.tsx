import React from 'react';

type AppTooltipContentProps = {
  meta?: {
    title?: string;
    description?: string;
    path?: string;
    keyboard?: string[];
  } | null;
};

const AppTooltipContent: React.FC<AppTooltipContentProps> = ({ meta }) => {
  if (!meta) {
    return <span className="text-xs text-gray-200">Metadata unavailable.</span>;
  }

  return (
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
  );
};

export default AppTooltipContent;
