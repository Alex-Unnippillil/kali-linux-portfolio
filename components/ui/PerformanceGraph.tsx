import React, { useEffect, useMemo, useRef, useState } from 'react';

const SAMPLE_INTERVAL = 1000;
const MAX_POINTS = 32;
const GRAPH_HEIGHT = 18;
const GRAPH_WIDTH = 80;
const SVG_HEIGHT = GRAPH_HEIGHT + 6;

type GraphPoint = {
  x: number;
  y: number;
  value: number;
  index: number;
  secondsAgo: number;
};

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
  const [containerWidth, setContainerWidth] = useState<number>(GRAPH_WIDTH);
  const [tooltip, setTooltip] = useState<
    | {
        left: number;
        top: number;
        valueLabel: string;
        timeLabel: string;
      }
    | null
  >(null);
  const timeoutRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastSampleRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('ResizeObserver' in window)) {
      return;
    }

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setContainerWidth(entry.contentRect.width);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
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

  const graphData = useMemo<{ path: string; coordinates: GraphPoint[]; count: number }>(() => {
    const visiblePoints = points.slice(-MAX_POINTS);
    if (visiblePoints.length === 0) {
      return { path: '', coordinates: [], count: 0 };
    }

    const step =
      visiblePoints.length > 1 ? GRAPH_WIDTH / (visiblePoints.length - 1) : GRAPH_WIDTH;

    const coordinates = visiblePoints.map<GraphPoint>((value, index) => {
      const clamped = Math.max(0, Math.min(1, value));
      const x = Number((index * step).toFixed(2));
      const y = Number(((1 - clamped) * GRAPH_HEIGHT).toFixed(2));
      const secondsAgo = Math.round(
        ((visiblePoints.length - 1 - index) * SAMPLE_INTERVAL) / 1000
      );

      return { x, y, value: clamped, index, secondsAgo };
    });

    const path = coordinates
      .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`)
      .join(' ');

    return { path, coordinates, count: visiblePoints.length };
  }, [points]);

  const ticks = useMemo(() => {
    const visibleCount = graphData.count;
    if (visibleCount <= 1) {
      return [] as {
        x: number;
        label: string;
      }[];
    }

    const maxTicks = Math.min(
      visibleCount,
      Math.max(2, Math.floor(containerWidth / 48))
    );

    if (maxTicks <= 1) {
      return [];
    }

    const step = visibleCount > 1 ? GRAPH_WIDTH / (visibleCount - 1) : GRAPH_WIDTH;
    const indices = new Set<number>();

    for (let i = 0; i < maxTicks; i += 1) {
      const index = Math.round(((visibleCount - 1) * i) / (maxTicks - 1));
      indices.add(index);
    }

    return Array.from(indices)
      .sort((a, b) => a - b)
      .map(index => {
        const secondsAgo = Math.round(((visibleCount - 1 - index) * SAMPLE_INTERVAL) / 1000);
        const label = secondsAgo === 0 ? 'now' : `-${secondsAgo}s`;
        const x = Number((index * step).toFixed(2));

        return { x, label };
      });
  }, [containerWidth, graphData.count]);

  const labelAngle = containerWidth < 140 ? -35 : 0;

  const formatValueLabel = (value: number) => `${Math.round(value * 100)}% load`;
  const formatTimeLabel = (secondsAgo: number) =>
    secondsAgo === 0 ? 'live sample' : `${secondsAgo}s ago`;

  const positionForPoint = (point: GraphPoint) => {
    if (!svgRef.current || !containerRef.current) {
      return null;
    }

    const svgRect = svgRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const xRatio = svgRect.width / GRAPH_WIDTH;
    const yRatio = svgRect.height / SVG_HEIGHT;

    return {
      left: point.x * xRatio + (svgRect.left - containerRect.left),
      top: point.y * yRatio + (svgRect.top - containerRect.top),
    };
  };

  const showTooltip = (point: GraphPoint) => {
    const position = positionForPoint(point);
    if (!position) {
      return;
    }

    setTooltip({
      left: position.left,
      top: Math.max(position.top - 4, 0),
      valueLabel: formatValueLabel(point.value),
      timeLabel: formatTimeLabel(point.secondsAgo),
    });
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  return (
    <div
      ref={containerRef}
      className={
        'relative hidden items-center pr-2 text-ubt-grey/70 sm:flex md:pr-3 lg:pr-4' +
        (className ? ` ${className}` : '')
      }
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
    >
      {tooltip ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded bg-ubt-grey/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg"
          style={{ left: tooltip.left, top: tooltip.top }}
        >
          <div>{tooltip.valueLabel}</div>
          <div className="text-[9px] font-normal opacity-80">{tooltip.timeLabel}</div>
        </div>
      ) : null}
      <svg
        ref={svgRef}
        width={GRAPH_WIDTH}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${GRAPH_WIDTH} ${SVG_HEIGHT}`}
        className="opacity-90"
        role="img"
        aria-label="Recent system load samples"
        focusable="false"
      >
        <defs>
          <linearGradient id="kaliSpark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#61a3ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1f4aa8" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <path
          d={graphData.path}
          fill="none"
          stroke="url(#kaliSpark)"
          strokeWidth={1.6}
          strokeLinecap="round"
          shapeRendering="geometricPrecision"
        />
        <line
          x1={0}
          y1={GRAPH_HEIGHT}
          x2={GRAPH_WIDTH}
          y2={GRAPH_HEIGHT}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={0.5}
        />
        <g className="text-[7px]">
          {ticks.map(tick => (
            <g key={`${tick.x}-${tick.label}`}>
              <line
                x1={tick.x}
                y1={GRAPH_HEIGHT}
                x2={tick.x}
                y2={GRAPH_HEIGHT - 2}
                stroke="currentColor"
                strokeOpacity={0.35}
                strokeWidth={0.5}
              />
              <text
                x={tick.x}
                y={SVG_HEIGHT}
                fill="currentColor"
                textAnchor="middle"
                dominantBaseline="hanging"
                transform={labelAngle ? `rotate(${labelAngle} ${tick.x} ${SVG_HEIGHT})` : undefined}
              >
                {tick.label}
              </text>
            </g>
          ))}
        </g>
        <g>
          {graphData.coordinates.map(point => (
            <circle
              key={point.index}
              cx={point.x}
              cy={point.y}
              r={1.8}
              fill="#61a3ff"
              fillOpacity={0.9}
              stroke="#0f2b5c"
              strokeWidth={0.4}
              tabIndex={0}
              onFocus={() => showTooltip(point)}
              onBlur={hideTooltip}
              onMouseEnter={() => showTooltip(point)}
              onMouseLeave={hideTooltip}
              aria-label={`${formatValueLabel(point.value)}, ${formatTimeLabel(point.secondsAgo)}`}
            />
          ))}
        </g>
      </svg>
    </div>
  );
};

export default PerformanceGraph;
