import React, { useEffect, useMemo, useRef, useState, useId } from 'react';

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
  const sparklineTitleId = useId();
  const sparklineDescId = useId();
  const dialogTitleId = useId();
  const dialogDescId = useId();
  const [points, setPoints] = useState<number[]>(() =>
    Array.from({ length: MAX_POINTS }, (_, index) => 0.32 + (index % 3) * 0.04)
  );
  const [expanded, setExpanded] = useState(false);
  const timeoutRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastSampleRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

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

  const stats = useMemo(() => {
    const visiblePoints = points.slice(-MAX_POINTS);
    if (visiblePoints.length === 0) {
      return {
        min: 0,
        max: 0,
        average: 0,
        latest: 0,
      };
    }

    const min = Math.min(...visiblePoints);
    const max = Math.max(...visiblePoints);
    const average = visiblePoints.reduce((sum, value) => sum + value, 0) / visiblePoints.length;
    const latest = visiblePoints[visiblePoints.length - 1];

    return { min, max, average, latest };
  }, [points]);

  const detailedPaths = useMemo(() => {
    const visiblePoints = points.slice(-MAX_POINTS);
    if (visiblePoints.length === 0) {
      return { linePath: '', areaPath: '' };
    }

    const chartWidth = 240;
    const chartHeight = 140;
    const paddingX = 24;
    const paddingY = 24;
    const innerWidth = chartWidth - paddingX * 2;
    const innerHeight = chartHeight - paddingY * 2;
    const step = visiblePoints.length > 1 ? innerWidth / (visiblePoints.length - 1) : innerWidth;

    const commands = visiblePoints.map((value, index) => {
      const clamped = Math.max(0, Math.min(1, value));
      const x = Number((paddingX + index * step).toFixed(2));
      const y = Number((paddingY + (1 - clamped) * innerHeight).toFixed(2));
      return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
    });

    const linePath = commands.join(' ');

    const areaPath = `${commands.join(' ')} L${paddingX + innerWidth} ${paddingY + innerHeight} L${paddingX} ${
      paddingY + innerHeight
    } Z`;

    return { linePath, areaPath };
  }, [points]);

  useEffect(() => {
    if (!expanded) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expanded]);

  useEffect(() => {
    if (expanded && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [expanded]);

  return (
    <>
      <div
        className={
          'flex items-center gap-2 pr-2 text-ubt-grey/70 sm:pr-3 lg:pr-4' + (className ? ` ${className}` : '')
        }
        data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
      >
        <svg
          width={GRAPH_WIDTH}
          height={GRAPH_HEIGHT}
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          className="opacity-90"
          role="img"
          aria-labelledby={`${sparklineTitleId} ${sparklineDescId}`}
          focusable="false"
        >
          <title id={sparklineTitleId}>System performance sparkline</title>
          <desc id={sparklineDescId}>
            Normalised frame timings for the last {Math.min(points.length, MAX_POINTS)} samples. Current value {stats.latest.toFixed(
              2
            )} with an average of {stats.average.toFixed(2)} and a range between {stats.min.toFixed(2)} and {stats.max.toFixed(2)}.
            {prefersReducedMotion
              ? ' Updates are paused to respect your reduced motion setting.'
              : ' The sparkline updates roughly once per second.'}
          </desc>
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
        <button
          type="button"
          className="rounded border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          onClick={() => setExpanded(true)}
          aria-haspopup="dialog"
          aria-expanded={expanded}
        >
          Details
        </button>
      </div>
      {expanded && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur"
          role="presentation"
          onClick={() => setExpanded(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            aria-describedby={dialogDescId}
            className="relative w-full max-w-xl rounded-lg border border-white/10 bg-slate-950/95 p-6 text-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={dialogTitleId} className="text-lg font-semibold text-white">
                  Performance details
                </h2>
                <p id={dialogDescId} className="mt-1 text-sm text-white/80">
                  Normalised frame timings from the last {Math.min(points.length, MAX_POINTS)} samples. Lower values indicate
                  smoother frame delivery. Range: {stats.min.toFixed(2)} – {stats.max.toFixed(2)}. Average:{' '}
                  {stats.average.toFixed(2)}. Latest sample: {stats.latest.toFixed(2)}.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded border border-white/10 px-3 py-1 text-sm text-white/80 transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Close
              </button>
            </div>
            <div className="mt-6">
              <svg
                width="100%"
                height="200"
                viewBox="0 0 240 140"
                role="img"
                aria-labelledby={`${dialogTitleId} ${dialogDescId}`}
                data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
                className="w-full"
              >
                <defs>
                  <linearGradient id="kaliSparkArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#61a3ff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#1f4aa8" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="kaliSparkStroke" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8dc5ff" />
                    <stop offset="100%" stopColor="#3a6ccc" />
                  </linearGradient>
                </defs>
                <rect x="24" y="24" width="192" height="92" fill="#0b1120" opacity="0.6" rx="6" ry="6" />
                <path d={detailedPaths.areaPath} fill="url(#kaliSparkArea)" />
                <path
                  d={detailedPaths.linePath}
                  fill="none"
                  stroke="url(#kaliSparkStroke)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  shapeRendering="geometricPrecision"
                />
                {[0, 0.5, 1].map((tick) => {
                  const y = 24 + (1 - tick) * 92;
                  return (
                    <g key={tick}>
                      <line x1="24" x2="216" y1={y} y2={y} stroke="#ffffff1a" strokeDasharray="4 4" />
                      <text
                        x="16"
                        y={y + 4}
                        fontSize="10"
                        textAnchor="end"
                        fill="#cbd5f5"
                      >
                        {tick.toFixed(1)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <p className="mt-4 text-xs text-white/60">
              The chart updates about once per second to mirror the desktop widget. {prefersReducedMotion
                ? 'Live updates are paused because reduced motion is enabled.'
                : 'This view uses the same smoothing logic as the compact sparkline.'}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default PerformanceGraph;
