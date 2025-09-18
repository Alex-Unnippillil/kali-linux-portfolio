'use client';

import React, { useEffect, useState } from 'react';
import type { InputSourceId } from '../../hooks/useSession';

interface InputSourceMeta {
  id: string;
  label: string;
  shortLabel: string;
}

interface InputIndicatorProps {
  activeSourceId?: InputSourceId | string;
  sources: readonly InputSourceMeta[];
  durationMs?: number;
}

const DEFAULT_VISIBILITY_MS = 2400;

const InputIndicator: React.FC<InputIndicatorProps> = ({
  activeSourceId,
  sources,
  durationMs = DEFAULT_VISIBILITY_MS,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sources.length) return;
    setVisible(true);
    if (durationMs === Infinity) return undefined;
    const timeout = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(timeout);
  }, [activeSourceId, durationMs, sources.length]);

  if (!sources.length || !visible) return null;

  const active =
    sources.find((source) => source.id === activeSourceId) || sources[0];

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40" aria-live="polite">
      <div className="rounded-lg bg-black/70 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
        <div className="text-xs uppercase tracking-wide text-ubt-grey">
          Input Source
        </div>
        <div className="text-lg font-semibold">{active.shortLabel}</div>
        <div className="text-xs text-ubt-grey">{active.label}</div>
        <div className="mt-1 text-[0.7rem] text-ubt-grey">
          Switch with <span className="font-mono">Super+Space</span> or{' '}
          <span className="font-mono">Shift+Super+Space</span>
        </div>
      </div>
    </div>
  );
};

export default InputIndicator;
