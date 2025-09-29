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
    return (
      <div className="text-xs text-gray-200" role="presentation">
        Metadata unavailable.
      </div>
    );
  }

  const { title, description, path, keyboard } = meta;

  return (
    <div className="flex flex-col gap-2 text-left">
      {title ? (
        <p className="text-sm font-semibold text-white" data-testid="tooltip-title">
          {title}
        </p>
      ) : null}
      {description ? (
        <p className="text-xs leading-relaxed text-gray-200" data-testid="tooltip-description">
          {description}
        </p>
      ) : null}
      {(path || keyboard?.length) && (
        <dl className="space-y-1 text-[11px] text-gray-200" data-testid="tooltip-meta">
          {path ? (
            <div>
              <dt className="font-semibold text-gray-100">Path</dt>
              <dd>
                <code className="rounded bg-black/40 px-1 py-0.5 text-[11px] text-ubt-grey">
                  {path}
                </code>
              </dd>
            </div>
          ) : null}
          {keyboard?.length ? (
            <div>
              <dt className="font-semibold text-gray-100">Shortcuts</dt>
              <dd>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {keyboard.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
        </dl>
      )}
    </div>
  );
};

export default AppTooltipContent;
