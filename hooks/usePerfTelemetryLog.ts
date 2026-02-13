import { useEffect, useState } from 'react';
import {
  PerfTelemetryEntry,
  isTelemetryActive,
  subscribeToTelemetry,
} from '@/utils/perfTelemetry';

export const usePerfTelemetryLog = (limit = 6) => {
  const [entries, setEntries] = useState<PerfTelemetryEntry[]>([]);

  useEffect(() => {
    if (!isTelemetryActive()) {
      return undefined;
    }

    const unsubscribe = subscribeToTelemetry((entry) => {
      setEntries((prev) => {
        const next = [...prev, entry];
        return next.slice(Math.max(0, next.length - limit));
      });
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[telemetry] ${entry.name}: ${entry.duration.toFixed(2)}ms`);
      }
    });

    return unsubscribe;
  }, [limit]);

  return entries;
};
