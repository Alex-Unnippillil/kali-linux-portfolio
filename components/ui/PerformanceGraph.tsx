import React, { useEffect, useMemo, useRef, useState } from 'react';

const SAMPLE_INTERVAL = 1000;
const MAX_POINTS = 32;
const GRAPH_HEIGHT = 18;
const GRAPH_WIDTH = 80;
const DEFAULT_ACCENT = '#1793d1';

function sanitizeAccent(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ACCENT;
}

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
  const [accentColor, setAccentColor] = useState<string>(DEFAULT_ACCENT);
  const [points, setPoints] = useState<number[]>(() =>
    Array.from({ length: MAX_POINTS }, (_, index) => 0.32 + (index % 3) * 0.04)
  );
  const timeoutRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastSampleRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const rootStyle = getComputedStyle(document.documentElement);
    const accent =
      rootStyle.getPropertyValue('--kali-accent') ||
      rootStyle.getPropertyValue('--color-primary') ||
      DEFAULT_ACCENT;

    const nextAccent = sanitizeAccent(accent);

    setAccentColor(prev => (prev === nextAccent ? prev : nextAccent));
  }, []);

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
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.25" />
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
