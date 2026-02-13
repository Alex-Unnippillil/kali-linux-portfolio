import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

const SAMPLE_INTERVAL = 1000;
const MAX_POINTS = 32;
const SPARKLINE_HEIGHT = 18;
const SPARKLINE_WIDTH = 120;
const FULL_GRAPH_HEIGHT = 48;
const FULL_GRAPH_WIDTH = 280;

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [points, setPoints] = useState<number[]>(() =>
    Array.from({ length: MAX_POINTS }, (_, index) => 0.32 + (index % 3) * 0.04)
  );
  const timeoutRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastSampleRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  const graphInstanceId = useId();

  const graphWidth = isExpanded ? FULL_GRAPH_WIDTH : SPARKLINE_WIDTH;
  const graphHeight = isExpanded ? FULL_GRAPH_HEIGHT : SPARKLINE_HEIGHT;

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

  const path = useMemo(() => {
    if (points.length === 0) {
      return '';
    }

    const visiblePoints = points.slice(-MAX_POINTS);
    const step = visiblePoints.length > 1 ? graphWidth / (visiblePoints.length - 1) : graphWidth;

    return visiblePoints
      .map((value, index) => {
        const clamped = Math.max(0, Math.min(1, value));
        const x = Number((index * step).toFixed(2));
        const y = Number(((1 - clamped) * graphHeight).toFixed(2));
        return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
      })
      .join(' ');
  }, [graphHeight, graphWidth, points]);

  return (
    <div
      className={
        'flex w-full max-w-xs items-center justify-between gap-3 pr-2 text-ubt-grey/70 sm:max-w-sm md:pr-3 lg:pr-4' +
        (className ? ` ${className}` : '')
      }
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
      data-view={isExpanded ? 'expanded' : 'compact'}
    >
      <svg
        id={`${graphInstanceId}-graph`}
        width={graphWidth}
        height={graphHeight}
        viewBox={`0 0 ${graphWidth} ${graphHeight}`}
        className="shrink-0 opacity-90"
        role="presentation"
        focusable="false"
      >
        <defs>
          <linearGradient id="kaliSpark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#61a3ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1f4aa8" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <path
          d={path}
          fill="none"
          stroke="url(#kaliSpark)"
          strokeWidth={isExpanded ? 2 : 1.6}
          strokeLinecap="round"
          shapeRendering="geometricPrecision"
        />
      </svg>
      <button
        type="button"
        className="ml-auto inline-flex shrink-0 items-center rounded border border-ubt-blue/40 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-ubt-blue transition hover:border-ubt-blue hover:text-ubt-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue/70"
        onClick={() => setIsExpanded(prev => !prev)}
        aria-expanded={isExpanded}
        aria-controls={`${graphInstanceId}-graph`}
      >
        {isExpanded ? 'Compact View' : 'Full View'}
      </button>
    </div>
  );
};

export default PerformanceGraph;
