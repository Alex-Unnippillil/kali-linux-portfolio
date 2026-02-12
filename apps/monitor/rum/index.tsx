'use client';

import React, { useEffect, useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import {
  METRIC_LABELS,
  METRIC_TARGETS,
  RUM_METRICS,
  computeRollingP75,
  getRating,
  getRumState,
  getServerRumState,
  startRumSession,
  subscribeRum,
  type RumMetricName,
  type RumSample,
} from '../../../src/rum';

import MetricCard from './metric-card';
import RecentInteractions from './recent-interactions';

const ROLLING_WINDOW = 20;

function useRumStore() {
  return useSyncExternalStore(subscribeRum, getRumState, getServerRumState);
}

type MetricSummary = {
  name: RumMetricName;
  label: string;
  target: number;
  p75: number | null;
  samples: number;
  rating: ReturnType<typeof getRating> | 'no-data';
  latest?: RumSample;
};

export default function RumMonitorApp(): React.ReactElement {
  const state = useRumStore();

  useEffect(() => {
    startRumSession();
  }, []);

  const summaries = useMemo<MetricSummary[]>(
    () =>
      RUM_METRICS.map((name) => {
        const history = state.history[name];
        const p75 = computeRollingP75(history, ROLLING_WINDOW);
        const target = METRIC_TARGETS[name];
        const rating =
          typeof p75 === 'number' ? getRating(name, p75) : ('no-data' as const);
        const latest = history.length > 0 ? history[history.length - 1] : undefined;
        return {
          name,
          label: METRIC_LABELS[name],
          target,
          p75,
          samples: history.length,
          rating,
          latest,
        } satisfies MetricSummary;
      }),
    [state],
  );

  const interactions = useMemo(() => {
    const merged: RumSample[] = [];
    RUM_METRICS.forEach((name) => {
      merged.push(...state.history[name]);
    });
    return merged
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);
  }, [state]);

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white overflow-auto">
      <div className="p-4 space-y-4">
        <header>
          <h1 className="text-lg font-bold">Real User Monitoring</h1>
          <p className="text-xs text-gray-300 max-w-xl">
            Capture Interaction to Next Paint (INP) and First Input Delay (FID) metrics
            directly from the browser. Interact with the desktop to populate samples and
            track how the rolling p75 compares to Core Web Vitals targets.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          {summaries.map((summary) => (
            <MetricCard
              key={summary.name}
              summary={summary}
              rollingWindow={ROLLING_WINDOW}
            />
          ))}
        </section>

        <RecentInteractions interactions={interactions} />
      </div>
    </div>
  );
}
