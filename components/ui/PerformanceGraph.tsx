import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useDecimatedSeries } from '../../hooks/useDecimatedSeries';
import { buildSvgPath } from '../../utils/charting/decimator';
import type { ChartPoint } from '../../types/chart-decimator';

const SAMPLE_INTERVAL = 1000;
const GRAPH_HEIGHT = 18;
const GRAPH_WIDTH = 80;
const TARGET_POINTS = 96;
const DECIMATION_THRESHOLD = 160;
const MAX_HISTORY = 960;
const INITIAL_SEED = 48;

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
  const [samples, setSamples] = useState<ChartPoint[]>(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return Array.from({ length: INITIAL_SEED }, (_, index) => ({
      x: now - (INITIAL_SEED - index) * SAMPLE_INTERVAL,
      y: 0.32 + (index % 3) * 0.04,
      sourceIndex: index,
    }));
  });
  const timeoutRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastSampleRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  const sampleIndexRef = useRef<number>(INITIAL_SEED);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (prefersReducedMotion) {
      setSamples(prev => prev.map(sample => ({ ...sample, y: 0.28 })));
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      return undefined;
    }

    let cancelled = false;

    lastSampleRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const captureSample = (time: number) => {
      if (cancelled) return;

      const delta = time - lastSampleRef.current;
      lastSampleRef.current = time;
      const value = normaliseDelta(delta);
      const index = sampleIndexRef.current;
      sampleIndexRef.current += 1;
      setSamples(prev => {
        const trimmed = prev.length >= MAX_HISTORY ? prev.slice(prev.length - MAX_HISTORY + 1) : prev.slice();
        trimmed.push({ x: time, y: value, sourceIndex: index });
        return trimmed;
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

  const displaySamples = useDecimatedSeries(samples, {
    maxPoints: prefersReducedMotion ? 32 : TARGET_POINTS,
    highWatermark: prefersReducedMotion ? 64 : DECIMATION_THRESHOLD,
    strategy: 'lttb',
  });

  const path = useMemo(() => {
    if (displaySamples.length === 0) {
      return '';
    }

    const { d } = buildSvgPath(displaySamples, {
      width: GRAPH_WIDTH,
      height: GRAPH_HEIGHT,
      yDomain: [0, 1],
      clamp: true,
    });

    return d;
  }, [displaySamples]);

  return (
    <div
      className={
        'hidden items-center pr-2 text-ubt-grey/70 sm:flex md:pr-3 lg:pr-4' + (className ? ` ${className}` : '')
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
