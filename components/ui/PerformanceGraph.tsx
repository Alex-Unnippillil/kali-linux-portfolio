import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

const SAMPLE_INTERVAL = 1000;
const MAX_POINTS = 32;
const GRAPH_HEIGHT = 18;
const GRAPH_WIDTH = 80;

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

  const descriptionId = useId();

  const graphMetrics = useMemo(() => {
    if (points.length === 0) {
      return { path: '', samples: 0, latest: 0, average: 0 };
    }

    const visiblePoints = points.slice(-MAX_POINTS);
    const step =
      visiblePoints.length > 1 ? GRAPH_WIDTH / (visiblePoints.length - 1) : GRAPH_WIDTH;

    const commands: string[] = [];
    let sum = 0;
    visiblePoints.forEach((value, index) => {
      const clamped = Math.max(0, Math.min(1, value));
      const x = Number((index * step).toFixed(2));
      const y = Number(((1 - clamped) * GRAPH_HEIGHT).toFixed(2));
      commands.push(`${index === 0 ? 'M' : 'L'}${x} ${y}`);
      sum += clamped;
    });

    const latest = Math.max(0, Math.min(1, visiblePoints[visiblePoints.length - 1] ?? 0));
    const average = visiblePoints.length > 0 ? sum / visiblePoints.length : 0;

    return {
      path: commands.join(' '),
      samples: visiblePoints.length,
      latest,
      average,
    };
  }, [points]);

  const { path, samples, latest, average } = graphMetrics;
  const latestPercent = Math.round(latest * 100);
  const averagePercent = Math.round(average * 100);

  return (
    <div
      className={
        'hidden items-center pr-2 text-ubt-grey/70 sm:flex md:pr-3 lg:pr-4' + (className ? ` ${className}` : '')
      }
      role="img"
      aria-labelledby={descriptionId}
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
    >
      <p id={descriptionId} className="sr-only">
        {samples > 0
          ? `Performance graph showing average frame pacing at ${averagePercent} percent of the sampling budget over ${samples} samples. Latest frame at ${latestPercent} percent.`
          : 'Performance graph with no samples recorded yet.'}
      </p>
      <svg
        width={GRAPH_WIDTH}
        height={GRAPH_HEIGHT}
        viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
        className="opacity-90"
        role="presentation"
        focusable="false"
        aria-hidden="true"
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
          strokeWidth={1.6}
          strokeLinecap="round"
          shapeRendering="geometricPrecision"
        />
      </svg>
    </div>
  );
};

export default PerformanceGraph;
