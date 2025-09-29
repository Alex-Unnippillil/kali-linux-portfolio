import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Chart } from 'chart.js';
import { loadFND03 } from '../../utils/fnd-03';

const SAMPLE_INTERVAL = 1000;
const MAX_POINTS = 50000;
const DEFAULT_GRAPH_WIDTH = 96;

type ChartPoint = { x: number; y: number };

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function downsampleLTTB(points: ChartPoint[], threshold: number): ChartPoint[] {
  if (threshold <= 0 || threshold >= points.length) {
    return points.slice();
  }

  const sampled: ChartPoint[] = [];
  let sampledIndex = 0;
  const every = (points.length - 2) / (threshold - 2);

  sampled.push(points[0]);

  for (let i = 0; i < threshold - 2; i += 1) {
    const rawRangeStart = Math.floor((i + 1) * every) + 1;
    const rawRangeEnd = Math.floor((i + 2) * every) + 1;

    const bucketStart = Math.max(Math.floor(i * every) + 1, 1);
    const bucketEnd = Math.max(
      bucketStart,
      Math.min(Math.floor((i + 1) * every) + 1, points.length - 1)
    );

    const avgRangeStart = Math.min(rawRangeStart, points.length - 1);
    const avgRangeEnd = Math.min(rawRangeEnd, points.length);

    let avgX = 0;
    let avgY = 0;
    let avgRangeLength = Math.max(0, avgRangeEnd - avgRangeStart);

    if (avgRangeLength === 0) {
      avgRangeLength = 1;
      avgX = points[avgRangeStart].x;
      avgY = points[avgRangeStart].y;
    } else {
      for (let j = avgRangeStart; j < avgRangeEnd; j += 1) {
        avgX += points[j].x;
        avgY += points[j].y;
      }

      avgX /= avgRangeLength;
      avgY /= avgRangeLength;
    }

    let maxArea = -1;
    let nextPointIndex = bucketStart;

    for (let j = bucketStart; j <= bucketEnd; j += 1) {
      const area = Math.abs(
        (points[sampledIndex].x - avgX) * (points[j].y - points[sampledIndex].y) -
          (points[sampledIndex].x - points[j].x) * (avgY - points[sampledIndex].y)
      );

      if (area > maxArea) {
        maxArea = area;
        nextPointIndex = j;
      }
    }

    sampled.push(points[nextPointIndex]);
    sampledIndex = nextPointIndex;
  }

  sampled.push(points[points.length - 1]);
  return sampled;
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
  const [points, setPoints] = useState<number[]>(() =>
    Array.from({ length: 64 }, (_, index) => 0.32 + (index % 3) * 0.04)
  );
  const timeoutRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastSampleRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  const chartRef = useRef<Chart<'line', ChartPoint[]> | null>(null);
  const chartModuleRef = useRef<typeof import('chart.js/auto') | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(DEFAULT_GRAPH_WIDTH);

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
        const trimmed =
          prev.length >= MAX_POINTS ? prev.slice(prev.length - MAX_POINTS + 1) : prev.slice();
        trimmed.push(normaliseDelta(delta));
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

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) {
      return;
    }

    if (typeof ResizeObserver === 'undefined') {
      setContainerWidth(containerRef.current.offsetWidth || DEFAULT_GRAPH_WIDTH);
      return;
    }

    const observer = new ResizeObserver(entries => {
      entries.forEach(entry => {
        const width = entry.contentRect.width;
        if (width > 0) {
          setContainerWidth(width);
        }
      });
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadFND03('chart.js', () => import('chart.js/auto'))
      .then(module => {
        if (cancelled) return;
        chartModuleRef.current = module;
        setChartReady(true);
      })
      .catch(error => {
        console.error('Failed to load performance chart module', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const preparedPoints = useMemo<ChartPoint[]>(
    () => points.map((value, index) => ({ x: index, y: clamp01(value) })),
    [points]
  );

  const downsampledPoints = useMemo(() => {
    if (preparedPoints.length === 0) {
      return preparedPoints;
    }

    const target = Math.max(
      2,
      Math.min(preparedPoints.length, Math.round(containerWidth || DEFAULT_GRAPH_WIDTH))
    );

    return downsampleLTTB(preparedPoints, target);
  }, [preparedPoints, containerWidth]);

  const latestPointsRef = useRef<ChartPoint[]>(downsampledPoints);

  useEffect(() => {
    latestPointsRef.current = downsampledPoints;
  }, [downsampledPoints]);

  useEffect(() => {
    const module = chartModuleRef.current;
    const canvas = canvasRef.current;

    if (!chartReady || !module || !canvas) {
      return;
    }

    const exported = module as unknown as { Chart?: typeof Chart; default?: typeof Chart };
    const ChartConstructor = exported.Chart ?? exported.default;
    const context = canvas.getContext('2d');

    if (!ChartConstructor || !context) {
      return;
    }

    const chartInstance = new ChartConstructor(context, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Latency',
            data: latestPointsRef.current,
            parsing: false,
            borderColor: '#61a3ff',
            borderWidth: 1.6,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: {
              target: 'origin',
              above: 'rgba(97, 163, 255, 0.25)',
              below: 'rgba(97, 163, 255, 0.1)',
            },
            tension: 0.28,
          },
        ],
      },
      options: {
        animation: prefersReducedMotion
          ? false
          : {
              duration: 180,
              easing: 'linear',
            },
        events: [],
        responsive: true,
        maintainAspectRatio: false,
        normalized: true,
        scales: {
          x: {
            type: 'linear',
            display: false,
          },
          y: {
            min: 0,
            max: 1,
            display: false,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
          },
          decimation: {
            enabled: true,
            algorithm: 'lttb',
            samples: Math.max(2, Math.round(containerWidth || DEFAULT_GRAPH_WIDTH)),
          },
        },
        elements: {
          line: {
            borderCapStyle: 'round',
            borderJoinStyle: 'round',
          },
        },
      },
    });

    chartRef.current = chartInstance;

    return () => {
      chartInstance.destroy();
      chartRef.current = null;
    };
  }, [chartReady]);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    const chartInstance = chartRef.current;
    const dataset = chartInstance.data.datasets[0];

    dataset.data = downsampledPoints;

    if (chartInstance.options.plugins?.decimation) {
      chartInstance.options.plugins.decimation.samples = Math.max(
        2,
        Math.round(containerWidth || DEFAULT_GRAPH_WIDTH)
      );
    }

    chartInstance.options.animation = prefersReducedMotion
      ? false
      : {
          duration: 120,
          easing: 'linear',
        };

    chartInstance.update('none');
  }, [downsampledPoints, containerWidth, prefersReducedMotion]);

  return (
    <div
      className={
        'hidden items-center pr-2 text-ubt-grey/70 sm:flex md:pr-3 lg:pr-4' + (className ? ` ${className}` : '')
      }
      aria-hidden="true"
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
    >
      <div
        ref={containerRef}
        className="relative h-[18px] w-[80px] sm:w-[96px] md:w-[112px]"
        aria-hidden="true"
      >
        {chartReady ? (
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            role="presentation"
            aria-hidden="true"
          />
        ) : (
          <div className="h-full w-full animate-pulse rounded-sm bg-gradient-to-r from-ubt-blue/40 via-ubt-blue/20 to-ubt-blue/40" />
        )}
      </div>
    </div>
  );
};

export default PerformanceGraph;
