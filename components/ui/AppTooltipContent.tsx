import React from 'react';
import { typography, typographyMono } from '@/styles/theme';

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
    return <span className={`${typography.caption} text-gray-200`}>Metadata unavailable.</span>;
  }

  return (
    <div className="space-y-2">
      {meta.title ? (
        <p className={`font-semibold text-white ${typography.body}`}>{meta.title}</p>
      ) : null}
      {meta.description ? (
        <p className={`${typography.bodySm} leading-relaxed text-gray-200`}>{meta.description}</p>
      ) : null}
      {meta.path ? (
        <p className={`${typography.caption} text-gray-300`}>
          <span className={`font-semibold text-gray-100 ${typography.bodySm}`}>Path:</span>{' '}
          <code className={`rounded bg-black/40 px-1 py-0.5 text-ubt-grey ${typographyMono.xs}`}>
            {meta.path}
          </code>
        </p>
      ) : null}
      {meta.keyboard?.length ? (
        <ul className={`list-disc space-y-1 pl-4 text-gray-200 ${typography.caption}`}>
          {meta.keyboard.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default AppTooltipContent;
