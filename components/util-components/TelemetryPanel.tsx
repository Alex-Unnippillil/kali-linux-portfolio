import React from 'react';
import { usePerfTelemetryLog } from '@/hooks/usePerfTelemetryLog';
import { isTelemetryActive } from '@/utils/perfTelemetry';

type TelemetryPanelProps = {
  limit?: number;
  className?: string;
};

const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ limit = 6, className }) => {
  const entries = usePerfTelemetryLog(limit);

  if (!isTelemetryActive() || entries.length === 0) {
    return null;
  }

  const panelClasses =
    'pointer-events-none absolute bottom-2 right-2 z-50 w-56 rounded border border-green-500/40 bg-black/80 p-3 text-xs text-green-300 shadow-lg backdrop-blur';

  return (
    <div className={`${panelClasses} ${className || ''}`.trim()} aria-live="polite">
      <p className="mb-1 font-semibold uppercase tracking-wide text-green-400">
        Telemetry
      </p>
      <ul className="space-y-1">
        {entries
          .slice()
          .reverse()
          .map((entry) => (
            <li key={`${entry.name}-${entry.startTime}`} className="flex justify-between space-x-2">
              <span className="truncate" title={entry.name}>
                {entry.name}
              </span>
              <span className="font-mono tabular-nums text-green-200">
                {entry.duration.toFixed(2)}ms
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default TelemetryPanel;
