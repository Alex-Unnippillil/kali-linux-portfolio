'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface ChartPoint {
  value: number;
  timestamp: number;
  label: string;
}

interface RequestChartProps {
  data: ChartPoint[];
  label: string;
  description?: string;
  paused?: boolean;
}

const GRID_LINE_COUNT = 4;
const VERTICAL_PADDING = 8;
const MAX_HEIGHT = 100;
const CHART_HEIGHT = MAX_HEIGHT - VERTICAL_PADDING * 2;

const formatValue = (value: number) => `${Math.round(value)} ms`;

const createTimeFormatter = () =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

type PointWithCoordinates = ChartPoint & {
  index: number;
  x: number;
  y: number;
};

export default function RequestChart({
  data,
  label,
  description,
  paused = false,
}: RequestChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tooltipBaseId = useId();
  const formatterRef = useRef(createTimeFormatter());
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setActiveIndex(null);
    buttonRefs.current = [];
  }, [data]);

  const maxValue = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(...data.map((point) => point.value));
  }, [data]);

  const points: PointWithCoordinates[] = useMemo(() => {
    if (data.length === 0) return [];
    const denominator = Math.max(data.length - 1, 1);
    const effectiveMax = maxValue <= 0 ? 1 : maxValue;
    return data.map((point, index) => {
      const x = (index / denominator) * 100;
      const relativeHeight = (point.value / effectiveMax) * CHART_HEIGHT;
      const y = VERTICAL_PADDING + (CHART_HEIGHT - relativeHeight);
      return {
        ...point,
        index,
        x,
        y,
      };
    });
  }, [data, maxValue]);

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ');
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    const start = `M ${points[0].x.toFixed(2)} ${MAX_HEIGHT.toFixed(2)}`;
    const middle = points
      .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ');
    const end = `L ${points[points.length - 1].x.toFixed(2)} ${MAX_HEIGHT.toFixed(2)} Z`;
    return `${start} ${middle} ${end}`;
  }, [points]);

  const tooltipPoint = activeIndex != null ? points[activeIndex] : null;
  const tooltipId = tooltipPoint ? `${tooltipBaseId}-${tooltipPoint.index}` : undefined;

  const chartLabel = [label, description, paused ? 'paused' : null]
    .filter(Boolean)
    .join(', ');

  const handleKeyNavigation = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (points.length === 0) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (index + delta + points.length) % points.length;
      buttonRefs.current[nextIndex]?.focus();
      setActiveIndex(nextIndex);
    }
  };

  return (
    <div
      className="relative w-full max-w-[320px] h-[180px] rounded border border-gray-700 bg-[var(--kali-panel)] p-2"
      role="group"
      aria-label={chartLabel}
    >
      <svg
        viewBox={`0 0 100 ${MAX_HEIGHT}`}
        preserveAspectRatio="none"
        className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)]"
        aria-hidden="true"
      >
        <rect
          x={0}
          y={0}
          width={100}
          height={MAX_HEIGHT}
          fill="transparent"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
          rx={2}
        />
        {Array.from({ length: GRID_LINE_COUNT }).map((_, index) => {
          const y =
            VERTICAL_PADDING + ((index + 1) * CHART_HEIGHT) / (GRID_LINE_COUNT + 1);
          return (
            <line
              key={`grid-${index}`}
              x1={0}
              x2={100}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={0.5}
            />
          );
        })}
        {areaD && (
          <path d={areaD} fill="rgba(0,255,0,0.12)" stroke="none" />
        )}
        {pathD && (
          <path d={pathD} fill="none" stroke="#00ff00" strokeWidth={1.2} />
        )}
      </svg>
      <div className="relative z-10 h-full w-full">
        {points.map((point) => (
          <button
            key={point.index}
            ref={(element) => {
              buttonRefs.current[point.index] = element;
            }}
            type="button"
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400 ${
              activeIndex === point.index
                ? 'h-4 w-4 border-green-300 bg-green-400/80'
                : 'h-3 w-3 border-green-300 bg-green-400/60 hover:h-4 hover:w-4'
            }`}
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
            }}
            aria-label={`${label} at ${formatterRef.current.format(
              new Date(point.timestamp),
            )} is ${formatValue(point.value)}`}
            aria-describedby={
              tooltipPoint && tooltipPoint.index === point.index ? tooltipId : undefined
            }
            onFocus={() => setActiveIndex(point.index)}
            onBlur={() => setActiveIndex((current) => (current === point.index ? null : current))}
            onMouseEnter={() => setActiveIndex(point.index)}
            onMouseLeave={() =>
              setActiveIndex((current) => (current === point.index ? null : current))
            }
            onKeyDown={(event) => handleKeyNavigation(event, point.index)}
          >
            <span className="sr-only">{formatValue(point.value)}</span>
          </button>
        ))}
        {tooltipPoint && (
          <div
            role="tooltip"
            id={tooltipId}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded bg-black/80 px-2 py-1 text-[11px] text-white shadow-lg"
            style={{
              left: `${tooltipPoint.x}%`,
              top: `${tooltipPoint.y}%`,
              marginTop: -6,
            }}
          >
            <div className="font-semibold">{formatValue(tooltipPoint.value)}</div>
            <div className="text-[10px] text-gray-200">
              {formatterRef.current.format(new Date(tooltipPoint.timestamp))}
            </div>
          </div>
        )}
        {points.length === 0 && (
          <div className="flex h-full items-center justify-center text-center text-[11px] text-gray-400">
            No data in this range yet
          </div>
        )}
      </div>
    </div>
  );
}
