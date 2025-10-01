"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  MetricName,
  PercentilePoint,
  getMetricSummary,
  getRollingSeries,
  isMetricsCollectionEnabled,
  subscribeToMetrics,
} from '@/utils/metrics';

interface MetricConfig {
  name: MetricName;
  label: string;
  description: string;
  unit?: string;
  decimals: number;
}

const WINDOW_MS = 5 * 60 * 1000; // five minutes
const BUCKETS = 12;
const CHART_WIDTH = 360;
const CHART_HEIGHT = 160;
const H_PADDING = 32;
const V_PADDING = 24;

const METRICS: MetricConfig[] = [
  {
    name: 'LCP',
    label: 'Largest Contentful Paint',
    description: 'Measures the render time of the largest content element in the viewport.',
    unit: 'ms',
    decimals: 0,
  },
  {
    name: 'INP',
    label: 'Interaction to Next Paint',
    description: 'Captures latency for the slowest interactions during the sample window.',
    unit: 'ms',
    decimals: 0,
  },
  {
    name: 'CLS',
    label: 'Cumulative Layout Shift',
    description: 'Tracks unexpected layout shifts to quantify visual stability.',
    decimals: 3,
  },
  {
    name: 'rowsRendered',
    label: 'Rows Rendered',
    description: 'Counts UI rows rendered in data-heavy panels to spot virtualization issues.',
    unit: 'rows',
    decimals: 0,
  },
  {
    name: 'workerTime',
    label: 'Worker Processing Time',
    description: 'Reports how long web workers spent processing asynchronous tasks.',
    unit: 'ms',
    decimals: 1,
  },
];

const cx = (
  ...classes: Array<string | Record<string, boolean> | false | null | undefined>
) => {
  const tokens: string[] = [];
  classes.forEach((entry) => {
    if (!entry) return;
    if (typeof entry === 'string') {
      tokens.push(entry);
    } else if (typeof entry === 'object') {
      Object.entries(entry).forEach(([key, value]) => {
        if (value) tokens.push(key);
      });
    }
  });
  return tokens.join(' ');
};

const formatValue = (value: number | null, decimals: number, unit?: string) => {
  if (value === null || Number.isNaN(value)) return '–';
  const formatted = value.toFixed(decimals);
  return unit ? `${formatted} ${unit}` : formatted;
};

const buildSummary = () => {
  const summary: Record<MetricName, ReturnType<typeof getMetricSummary>> = {} as Record<
    MetricName,
    ReturnType<typeof getMetricSummary>
  >;
  METRICS.forEach(({ name }) => {
    summary[name] = getMetricSummary(name, WINDOW_MS);
  });
  return summary;
};

const buildSeries = () => {
  const series: Record<MetricName, PercentilePoint[]> = {} as Record<MetricName, PercentilePoint[]>;
  METRICS.forEach(({ name }) => {
    series[name] = getRollingSeries(name, WINDOW_MS, BUCKETS);
  });
  return series;
};

const Chart = ({
  data,
  unit,
}: {
  data: PercentilePoint[];
  unit?: string;
}) => {
  const values = data.flatMap((point) => [point.p75, point.p95].filter((value): value is number => value !== null));

  if (values.length === 0) {
    return <p className="text-xs text-white/60">Waiting for samples…</p>;
  }

  const maxValue = Math.max(...values);
  const minValue = Math.min(0, ...values);
  const usableHeight = CHART_HEIGHT - V_PADDING * 2;
  const usableWidth = CHART_WIDTH - H_PADDING * 2;
  const verticalRange = Math.max(maxValue - minValue, maxValue || 1);

  const pointToY = (value: number) =>
    CHART_HEIGHT - V_PADDING - ((value - minValue) / verticalRange) * usableHeight;

  const pointToX = (index: number) => {
    if (data.length <= 1) return H_PADDING + usableWidth / 2;
    return H_PADDING + (usableWidth * index) / (data.length - 1);
  };

  const buildPolyline = (key: 'p75' | 'p95') =>
    data
      .map((point, index) => {
        const value = point[key];
        if (value === null) return null;
        return `${pointToX(index)},${pointToY(value)}`;
      })
      .filter(Boolean)
      .join(' ');

  const p75Line = buildPolyline('p75');
  const p95Line = buildPolyline('p95');

  const yTicks = [0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: CHART_HEIGHT - V_PADDING - usableHeight * ratio,
  }));

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="img"
      aria-label={`Rolling percentiles${unit ? ` (${unit})` : ''}`}
      className="w-full"
    >
      {yTicks.map((tick, index) => (
        <line
          key={index}
          x1={H_PADDING}
          y1={tick.y}
          x2={CHART_WIDTH - H_PADDING}
          y2={tick.y}
          stroke="currentColor"
          opacity={0.12}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      ))}
      <line
        x1={H_PADDING}
        y1={CHART_HEIGHT - V_PADDING}
        x2={CHART_WIDTH - H_PADDING}
        y2={CHART_HEIGHT - V_PADDING}
        stroke="currentColor"
        opacity={0.3}
        strokeWidth={1}
      />
      {p95Line && (
        <polyline
          points={p95Line}
          fill="none"
          stroke="var(--color-ub-orange, #f97316)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {p75Line && (
        <polyline
          points={p75Line}
          fill="none"
          stroke="var(--color-ub-green, #22c55e)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {data.map((point, index) => {
        const x = pointToX(index);
        return (
          <g key={point.timestamp ?? index}>
            {point.p95 !== null && (
              <circle
                cx={x}
                cy={pointToY(point.p95)}
                r={3.5}
                fill="var(--color-ub-orange, #f97316)"
                opacity={0.9}
              />
            )}
            {point.p75 !== null && (
              <circle
                cx={x}
                cy={pointToY(point.p75)}
                r={3}
                fill="var(--color-ub-green, #22c55e)"
                opacity={0.9}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

const Legend = ({ unit }: { unit?: string }) => (
  <div className="flex items-center gap-4 text-[11px] uppercase tracking-wide text-white/70">
    <span className="flex items-center gap-1">
      <span className="h-2 w-3 rounded bg-[var(--color-ub-green,#22c55e)]" aria-hidden="true" />
      P75{unit ? ` (${unit})` : ''}
    </span>
    <span className="flex items-center gap-1">
      <span className="h-2 w-3 rounded bg-[var(--color-ub-orange,#f97316)]" aria-hidden="true" />
      P95{unit ? ` (${unit})` : ''}
    </span>
  </div>
);

interface MetricCardProps {
  config: MetricConfig;
  summary: ReturnType<typeof getMetricSummary> | undefined;
  series: PercentilePoint[] | undefined;
}

const MetricCard = ({ config, summary, series }: MetricCardProps) => {
  const { label, description, unit, decimals, name } = config;
  const hasSamples = (summary?.count ?? 0) > 0;
  return (
    <section
      key={name}
      className={cx(
        'rounded-lg border border-white/10 bg-black/40 p-4 shadow-lg shadow-black/40 transition-colors',
        {
          'ring-1 ring-ub-orange/40': !hasSamples,
        },
      )}
      aria-live="polite"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{label}</h3>
          <p className="text-xs text-white/70">{description}</p>
        </div>
        <Legend unit={unit} />
      </header>
      <div className="mt-4 grid gap-3 sm:grid-cols-3" role="presentation">
        <div className="rounded border border-white/10 bg-white/5 p-3 text-sm text-white/80">
          <span className="block text-xs uppercase tracking-wide text-white/50">P75 (last 5 min)</span>
          <span className="text-lg font-semibold">
            {formatValue(summary?.p75 ?? null, decimals, unit)}
          </span>
        </div>
        <div className="rounded border border-white/10 bg-white/5 p-3 text-sm text-white/80">
          <span className="block text-xs uppercase tracking-wide text-white/50">P95 (last 5 min)</span>
          <span className="text-lg font-semibold">
            {formatValue(summary?.p95 ?? null, decimals, unit)}
          </span>
        </div>
        <div className="rounded border border-white/10 bg-white/5 p-3 text-sm text-white/80">
          <span className="block text-xs uppercase tracking-wide text-white/50">Samples</span>
          <span className="text-lg font-semibold">{summary?.count ?? 0}</span>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-white/5 bg-black/30">
        <Chart data={series ?? []} unit={unit} />
      </div>
    </section>
  );
};

const MetricsPanel = () => {
  const [summaries, setSummaries] = useState(buildSummary);
  const [series, setSeries] = useState(buildSeries);
  const [enabled, setEnabled] = useState(isMetricsCollectionEnabled());

  useEffect(() => {
    const unsubscribe = subscribeToMetrics(() => {
      setEnabled(isMetricsCollectionEnabled());
      setSummaries(buildSummary());
      setSeries(buildSeries());
    });
    return unsubscribe;
  }, []);

  const analyticsFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

  const note = useMemo(() => {
    if (!analyticsFlag) {
      return 'Client analytics are disabled. Set NEXT_PUBLIC_ENABLE_ANALYTICS="true" to begin recording metrics.';
    }
    if (!enabled) {
      return 'Metrics capture is paused until network access is permitted in Settings.';
    }
    return null;
  }, [analyticsFlag, enabled]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-white">Performance Metrics</h2>
        <p className="text-sm text-white/70">
          Rolling percentiles update as client-side analytics samples accumulate.
        </p>
      </header>
      {note && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/15 p-3 text-sm text-amber-100">
          {note}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        {METRICS.map((config) => (
          <MetricCard
            key={config.name}
            config={config}
            summary={summaries[config.name]}
            series={series[config.name]}
          />
        ))}
      </div>
    </div>
  );
};

export default MetricsPanel;

