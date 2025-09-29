import React, { useEffect, useMemo, useRef, useState, useId } from 'react';

const SAMPLE_INTERVAL = 1000;
const MAX_POINTS = 32;
const GRAPH_HEIGHT = 18;
const GRAPH_WIDTH = 80;
const GRID_LINE_FRACTIONS = [0.25, 0.5, 0.75];
const GRID_LINE_POSITIONS = GRID_LINE_FRACTIONS.map(fraction =>
  Number((GRAPH_HEIGHT * fraction).toFixed(2))
);

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => {
        mediaQuery.removeEventListener('change', updatePreference);
      };
    }

    mediaQuery.addListener(updatePreference);
    return () => {
      mediaQuery.removeListener(updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

function normaliseDelta(delta: number) {
  const jitter = Math.min(1, Math.abs(delta - SAMPLE_INTERVAL) / SAMPLE_INTERVAL);
  const noise = Math.random() * 0.18;
  return Math.max(0.12, Math.min(1, 0.28 + jitter * 0.6 + noise));
}

type PerformanceGraphProps = {
  className?: string;
};

const PerformanceGraph: React.FC<PerformanceGraphProps> = ({ className }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [points, setPoints] = useState<number[]>(() =>
    Array.from({ length: MAX_POINTS }, (_, index) => 0.32 + (index % 3) * 0.04)
  );
  const timeoutRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastSampleRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (prefersReducedMotion) {
      setPoints(prev => prev.map(() => 0.28));
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      return undefined;
    }

    let cancelled = false;

    const captureSample = (time: number) => {
      if (cancelled) return;

      const delta = time - lastSampleRef.current;
      lastSampleRef.current = time;
      setPoints(prev => {
        const next = prev.slice(-MAX_POINTS + 1);
        next.push(normaliseDelta(delta));
        return next;
      });

      scheduleNext();
    };

    const scheduleNext = () => {
      timeoutRef.current = window.setTimeout(() => {
        frameRef.current = requestAnimationFrame(captureSample);
      }, SAMPLE_INTERVAL);
    };

    frameRef.current = requestAnimationFrame(captureSample);

    return () => {
      cancelled = true;
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [prefersReducedMotion]);

  const gradientId = useId();

  const path = useMemo(() => {
    if (points.length === 0) {
      return '';
    }

    const visiblePoints = points.slice(-MAX_POINTS);
    const step = visiblePoints.length > 1 ? GRAPH_WIDTH / (visiblePoints.length - 1) : GRAPH_WIDTH;

    return visiblePoints
      .map((value, index) => {
        const clamped = Math.max(0, Math.min(1, value));
        const x = Number((index * step).toFixed(2));
        const y = Number(((1 - clamped) * GRAPH_HEIGHT).toFixed(2));
        return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
      })
      .join(' ');
  }, [points]);

  return (
    <div
      className={
        'hidden items-center gap-2 pr-2 text-ubt-grey/70 sm:flex md:pr-3 lg:pr-4' +
        (className ? ` ${className}` : '')
      }
      aria-hidden="true"
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
    >
      <svg
        width={GRAPH_WIDTH}
        height={GRAPH_HEIGHT}
        viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
        className="opacity-90"
        role="presentation"
        focusable="false"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--chart-line-strong)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--chart-line-soft)" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <g aria-hidden="true">
          {GRID_LINE_POSITIONS.map(position => (
            <line
              key={position}
              x1={0}
              x2={GRAPH_WIDTH}
              y1={position}
              y2={position}
              stroke="var(--chart-grid-line)"
              strokeWidth={0.4}
              strokeDasharray="4 3"
              shapeRendering="crispEdges"
            />
          ))}
        </g>
        <path
          d={path}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={1.6}
          strokeLinecap="round"
          shapeRendering="geometricPrecision"
        />
      </svg>
      <div
        className="hidden items-center gap-1 text-[0.625rem] font-medium uppercase tracking-wide sm:flex"
        style={{ color: 'var(--chart-legend-text)' }}
      >
        <span
          aria-hidden="true"
          className="inline-flex h-2 w-3 rounded-sm"
          style={{
            background: 'var(--chart-line-strong)',
            boxShadow: '0 0 0 1px var(--chart-swatch-border)',
          }}
        />
        <span>Frame time</span>
      </div>
    </div>
  );
};

export default PerformanceGraph;
