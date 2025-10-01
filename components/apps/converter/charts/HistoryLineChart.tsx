import React, { useEffect, useMemo, useState } from 'react';

import { useDecimatedSeries } from '../../../../hooks/useDecimatedSeries';
import { buildSvgPath } from '../../../../utils/charting/decimator';
import type { ChartPoint, PathProjectPoint } from '../../../../types/chart-decimator';

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 80;

export interface RateHistoryPoint {
  timestamp: string;
  rate: number;
}

interface HistoryLineChartProps {
  history: RateHistoryPoint[];
  ariaLabel?: string;
}

function safeTimestamp(value: string, fallback: number) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const HistoryLineChart: React.FC<HistoryLineChartProps> = ({
  history,
  ariaLabel = 'exchange rate history',
}) => {
  const stats = useMemo(() => {
    if (history.length === 0) {
      return { min: 0, max: 1 };
    }
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const entry of history) {
      if (Number.isFinite(entry.rate)) {
        if (entry.rate < min) min = entry.rate;
        if (entry.rate > max) max = entry.rate;
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { min: 0, max: 1 };
    }
    if (min === max) {
      return { min: min - 1, max: max + 1 };
    }
    return { min, max };
  }, [history]);

  const points = useMemo<ChartPoint[]>(() => {
    return history.map((entry, index) => ({
      x: safeTimestamp(entry.timestamp, index),
      y: entry.rate,
      sourceIndex: index,
    }));
  }, [history]);

  const displayPoints = useDecimatedSeries(points, {
    maxPoints: 240,
    highWatermark: 360,
    strategy: 'lttb',
  });

  const { d, projected } = useMemo(() => {
    if (displayPoints.length === 0) {
      return {
        d: '',
        projected: [] as PathProjectPoint[],
      };
    }
    const { d: path, projected: anchors } = buildSvgPath(displayPoints, {
      width: VIEWBOX_WIDTH,
      height: VIEWBOX_HEIGHT,
      yDomain: [stats.min, stats.max],
      clamp: true,
    });
    return { d: path, projected: anchors };
  }, [displayPoints, stats.max, stats.min]);

  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  useEffect(() => {
    setFocusIndex(history.length > 0 ? history.length - 1 : null);
  }, [history.length]);

  const activePoint = focusIndex != null ? history[focusIndex] : undefined;
  const activeAnchor =
    focusIndex != null ? projected.find((anchor) => anchor.sourceIndex === focusIndex) : undefined;

  const handlePointerMove: React.PointerEventHandler<SVGSVGElement> = (event) => {
    if (projected.length === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = bounds.width > 0 ? (event.clientX - bounds.left) / bounds.width : 0;
    const targetX = ratio * VIEWBOX_WIDTH;

    let closest = projected[0];
    let minDistance = Math.abs(closest.x - targetX);
    for (let i = 1; i < projected.length; i += 1) {
      const candidate = projected[i];
      const distance = Math.abs(candidate.x - targetX);
      if (distance < minDistance) {
        minDistance = distance;
        closest = candidate;
      }
    }
    setFocusIndex(closest.sourceIndex);
  };

  const handlePointerLeave = () => {
    setFocusIndex(history.length > 0 ? history.length - 1 : null);
  };

  return (
    <div className="mt-2">
      <svg
        className="h-28 w-full"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="rgba(15,23,42,0.6)" rx={2} />
        {d && (
          <path
            d={d}
            fill="none"
            stroke="#4ade80"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {activeAnchor && (
          <g>
            <line
              x1={activeAnchor.x}
              x2={activeAnchor.x}
              y1={0}
              y2={VIEWBOX_HEIGHT}
              stroke="rgba(148,163,184,0.4)"
              strokeDasharray="2 2"
            />
            <circle cx={activeAnchor.x} cy={activeAnchor.y} r={1.8} fill="#facc15" stroke="#1c1917" strokeWidth={0.5} />
          </g>
        )}
      </svg>
      {activePoint ? (
        <div className="mt-1 text-xs text-slate-200" aria-live="polite">
          {new Date(activePoint.timestamp).toLocaleString(undefined, {
            hour12: false,
          })}
          :
          {' '}
          {activePoint.rate.toFixed(4)}
        </div>
      ) : (
        <div className="mt-1 text-xs text-slate-300">No history available.</div>
      )}
    </div>
  );
};

export default HistoryLineChart;
