'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import { CHART_TEXTURES, ChartTextureToken, ChartTextureKey } from '@/data/design-system/charts';

export type ChartSeriesKey = Extract<ChartTextureKey, 'cpu' | 'memory' | 'disk' | 'network'>;

interface ResourceSeriesMeta {
  key: ChartSeriesKey;
  label: string;
  unit: string;
  defaultMax: number;
  color: string;
}

const SERIES: ResourceSeriesMeta[] = [
  {
    key: 'cpu',
    label: 'CPU',
    unit: '%',
    defaultMax: 100,
    color: 'var(--chart-series-cpu, #16a34a)',
  },
  {
    key: 'memory',
    label: 'Memory',
    unit: '%',
    defaultMax: 100,
    color: 'var(--chart-series-memory, #fbbf24)',
  },
  {
    key: 'disk',
    label: 'Disk',
    unit: '%',
    defaultMax: 100,
    color: 'var(--chart-series-disk, #38bdf8)',
  },
  {
    key: 'network',
    label: 'Network',
    unit: 'Mbps',
    defaultMax: 100,
    color: 'var(--chart-series-network, #c084fc)',
  },
];

const VIEWBOX = {
  width: 100,
  height: 60,
};

const GRID_STEPS = 4;

const formatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

type ChartsProps = {
  data: Record<ChartSeriesKey, number[]>;
  sampleRateMs?: number;
};

type ChartStats = {
  latest: number;
  min: number;
  max: number;
  avg: number;
};

function calculateStats(values: number[]): ChartStats {
  if (!values.length) {
    return { latest: 0, min: 0, max: 0, avg: 0 };
  }

  const latest = values[values.length - 1];
  let min = values[0];
  let max = values[0];
  let sum = 0;

  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
  }

  return {
    latest,
    min,
    max,
    avg: sum / values.length,
  };
}

function formatValue(value: number, unit: string) {
  return `${formatter.format(value)}${unit}`;
}

function createLinePath(values: number[], maxValue: number) {
  if (!values.length) return '';
  const denominator = Math.max(values.length - 1, 1);
  return values
    .map((value, index) => {
      const x = (index / denominator) * VIEWBOX.width;
      const clamped = Number.isFinite(value) ? value : 0;
      const y = VIEWBOX.height - (clamped / maxValue) * VIEWBOX.height;
      const command = index === 0 ? 'M' : 'L';
      return `${command}${x.toFixed(3)},${y.toFixed(3)}`;
    })
    .join(' ');
}

function createAreaPath(values: number[], maxValue: number) {
  if (!values.length) return '';
  const line = createLinePath(values, maxValue);
  return `${line} L${VIEWBOX.width},${VIEWBOX.height} L0,${VIEWBOX.height} Z`;
}

function renderPatternShapes(token: ChartTextureToken) {
  const ink = token.foreground;

  if (token.type === 'forward-diagonal') {
    const offsets = [-token.spacing, 0, token.spacing];
    return offsets.map((offset, index) => (
      <line
        key={`diag-${index}`}
        x1={offset}
        y1={token.size}
        x2={offset + token.size}
        y2={0}
        stroke={ink}
        strokeWidth={token.strokeWidth}
      />
    ));
  }

  if (token.type === 'dot-grid') {
    const dots = [] as React.ReactNode[];
    for (let x = token.spacing / 2; x < token.size; x += token.spacing) {
      for (let y = token.spacing / 2; y < token.size; y += token.spacing) {
        dots.push(
          <circle
            key={`dot-${x}-${y}`}
            cx={x}
            cy={y}
            r={token.radius}
            fill={ink}
          />,
        );
      }
    }
    return dots;
  }

  if (token.type === 'cross-hatch') {
    const offsets = [-token.spacing, 0, token.spacing];
    return offsets.flatMap((offset, index) => [
      <line
        key={`cross-forward-${index}`}
        x1={offset}
        y1={token.size}
        x2={offset + token.size}
        y2={0}
        stroke={ink}
        strokeWidth={token.strokeWidth}
      />,
      <line
        key={`cross-back-${index}`}
        x1={offset}
        y1={0}
        x2={offset + token.size}
        y2={token.size}
        stroke={ink}
        strokeWidth={token.strokeWidth}
      />,
    ]);
  }

  // horizontal-band
  const lines = [] as React.ReactNode[];
  for (let y = 0; y <= token.size; y += token.spacing) {
    lines.push(
      <line
        key={`band-${y}`}
        x1={0}
        y1={y}
        x2={token.size}
        y2={y}
        stroke={ink}
        strokeWidth={token.strokeWidth}
      />,
    );
  }
  return lines;
}

interface PatternDefProps {
  token: ChartTextureToken;
  patternId: string;
}

function PatternDef({ token, patternId }: PatternDefProps) {
  return (
    <pattern
      id={patternId}
      patternUnits="userSpaceOnUse"
      width={token.size}
      height={token.size}
    >
      <rect width={token.size} height={token.size} fill={token.background} />
      {renderPatternShapes(token)}
    </pattern>
  );
}

interface ChartCardProps {
  series: ResourceSeriesMeta;
  values: number[];
}

function ChartCard({ series, values }: ChartCardProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const chartInstanceId = useId();
  const texture = CHART_TEXTURES[series.key];
  const stats = useMemo(() => calculateStats(values), [values]);
  const maxValue = useMemo(() => {
    const target = Math.max(series.defaultMax, stats.max || 0);
    return Number.isFinite(target) && target > 0 ? target : series.defaultMax;
  }, [series.defaultMax, stats.max]);

  const linePath = useMemo(() => createLinePath(values, maxValue), [values, maxValue]);
  const areaPath = useMemo(() => createAreaPath(values, maxValue), [values, maxValue]);
  const hasData = values.length > 0 && !!linePath;

  const titleId = `${series.key}-title-${chartInstanceId}`;
  const srDescriptionId = `${series.key}-sr-${chartInstanceId}`;
  const tooltipId = `${series.key}-tooltip-${chartInstanceId}`;
  const patternId = `${texture.id}-${chartInstanceId}`;

  return (
    <figure className="relative flex flex-col gap-3 rounded-lg bg-[var(--kali-panel)]/80 p-3 text-white shadow-inner">
      <header className="flex items-center justify-between">
        <span id={titleId} className="text-sm font-semibold uppercase tracking-wide">
          {series.label}
        </span>
        <span className="text-sm text-[var(--chart-label-muted, #94a3b8)]">
          {hasData ? formatValue(stats.latest, series.unit) : 'Awaiting data'}
        </span>
      </header>
      <div
        className="relative"
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        onFocus={() => setTooltipVisible(true)}
        onBlur={() => setTooltipVisible(false)}
        tabIndex={0}
        role="group"
        aria-describedby={`${srDescriptionId} ${tooltipId}`}
      >
        <svg
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          className="h-32 w-full"
          role="img"
          aria-labelledby={titleId}
        >
          <defs>
            <PatternDef token={texture} patternId={patternId} />
          </defs>
          <rect
            width={VIEWBOX.width}
            height={VIEWBOX.height}
            fill="var(--chart-surface, rgba(15,23,42,0.35))"
            rx={4}
          />
          {Array.from({ length: GRID_STEPS - 1 }).map((_, index) => {
            const y = ((index + 1) / GRID_STEPS) * VIEWBOX.height;
            return (
              <line
                key={`grid-${y}`}
                x1={0}
                x2={VIEWBOX.width}
                y1={y}
                y2={y}
                stroke="var(--chart-grid, rgba(148,163,184,0.2))"
                strokeWidth={0.5}
              />
            );
          })}
          {hasData ? (
            <>
              <path
                d={areaPath}
                fill={`url(#${patternId})`}
                fillOpacity={0.9}
              />
              <path
                d={linePath}
                fill="none"
                stroke={series.color}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          ) : (
            <text
              x={VIEWBOX.width / 2}
              y={VIEWBOX.height / 2}
              fill="var(--chart-label-muted, #94a3b8)"
              fontSize={8}
              textAnchor="middle"
            >
              No samples yet
            </text>
          )}
        </svg>
        <div id={srDescriptionId} className="sr-only">
          {`${series.label} uses ${texture.description}. Latest sample ${formatValue(
            stats.latest,
            series.unit,
          )}. Range ${formatValue(stats.min, series.unit)} to ${formatValue(stats.max, series.unit)}.`}
        </div>
        <div
          id={tooltipId}
          role="tooltip"
          className={`pointer-events-none absolute left-3 top-3 max-w-[12rem] rounded-md border border-white/10 bg-black/80 p-2 text-xs shadow-lg transition-opacity duration-150 ${
            tooltipVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p className="font-semibold tracking-wide text-[0.65rem] uppercase text-white/80">
            {series.label} Trend
          </p>
          <p className="mt-1 text-white">Latest {formatValue(stats.latest, series.unit)}</p>
          <p className="text-[var(--chart-label-muted, #94a3b8)]">
            Min {formatValue(stats.min, series.unit)} · Max {formatValue(stats.max, series.unit)}
          </p>
          <p className="text-[var(--chart-label-muted, #94a3b8)]">
            Avg {formatValue(stats.avg, series.unit)}
          </p>
          <p className="mt-1 text-[var(--chart-label-muted, #94a3b8)]">Texture: {texture.description}</p>
        </div>
      </div>
    </figure>
  );
}

const EMPTY_SERIES: Record<ChartSeriesKey, number[]> = {
  cpu: [],
  memory: [],
  disk: [],
  network: [],
};

export default function Charts({ data, sampleRateMs = 1000 }: ChartsProps) {
  const safeData = data ?? EMPTY_SERIES;

  const liveAnnouncement = useMemo(() => {
    return SERIES.map((series) => {
      const seriesValues = safeData[series.key] ?? [];
      const stats = calculateStats(seriesValues);
      return `${series.label} ${formatValue(stats.latest, series.unit)}`;
    }).join(' • ');
  }, [safeData]);

  const [announcement, setAnnouncement] = useState(liveAnnouncement);
  useEffect(() => {
    setAnnouncement(liveAnnouncement);
  }, [liveAnnouncement, sampleRateMs]);

  return (
    <div className="flex w-full flex-col gap-4" aria-live="polite">
      <span className="sr-only">{announcement}</span>
      <div className="grid gap-4 md:grid-cols-2">
        {SERIES.map((series) => (
          <ChartCard
            key={series.key}
            series={series}
            values={safeData[series.key] ?? []}
          />
        ))}
      </div>
    </div>
  );
}
