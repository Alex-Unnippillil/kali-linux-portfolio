import React, { useEffect, useMemo, useRef, useState } from 'react';

import { downsampleLTTB } from '../utils/foundations/downsample';
import { createHeavyComponent } from '../utils/foundations/dynamic';

const FALLBACK_HEIGHT = 180;
let chartRegistered = false;

const BarChart = createHeavyComponent(
  async () => {
    const [reactChart, chartJs] = await Promise.all([
      import('react-chartjs-2'),
      import('chart.js'),
    ]);

    if (!chartRegistered) {
      chartJs.Chart.register(...chartJs.registerables);
      chartRegistered = true;
    }

    return { default: reactChart.Bar };
  },
  {
    loading: () => (
      <div className="w-full h-full animate-pulse bg-ub-cool-grey/30" aria-hidden="true" />
    ),
  }
);

const buildSeries = (count, time) => {
  const safeCount = Number.isFinite(count) && count > 0 ? count : 0;
  const safeTime = Number.isFinite(time) && time > 0 ? time : 0;

  return [
    {
      label: 'Candidate space',
      value: safeCount,
      x: 0,
    },
    {
      label: 'Seconds @1M/s',
      value: safeTime,
      x: 1,
    },
  ];
};

const StatsChart = ({ count = 0, time = 0, maxPoints = 60 }) => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setWidth((prev) => {
        const nextWidth = Math.floor(entry.contentRect.width);
        return prev === nextWidth ? prev : nextWidth;
      });
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const height = useMemo(() => {
    if (!width) {
      return FALLBACK_HEIGHT;
    }

    const scaled = Math.round(width * 0.55);
    return Math.min(Math.max(scaled, 140), 280);
  }, [width]);

  const rawSeries = useMemo(() => buildSeries(count, time), [count, time]);

  const processedSeries = useMemo(
    () =>
      downsampleLTTB(
        rawSeries,
        Math.min(Math.max(maxPoints, 2), rawSeries.length),
        (point) => point.x,
        (point) => point.value
      ),
    [maxPoints, rawSeries]
  );

  const chartData = useMemo(() => {
    const labels = processedSeries.map((point) => point.label);
    const values = processedSeries.map((point) => point.value);
    const palette = ['#10b981', '#3b82f6'];

    return {
      labels,
      datasets: [
        {
          label: 'Mask complexity overview',
          data: values,
          backgroundColor: values.map((_, index) => palette[index % palette.length]),
          borderRadius: 8,
          barThickness: 'flex',
        },
      ],
    };
  }, [processedSeries]);

  const chartOptions = useMemo(
    () => ({
      responsive: false,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: '#d1d5db',
            font: {
              size: 11,
              family: 'var(--font-sans, system-ui)',
            },
          },
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            color: '#d1d5db',
            callback: (value) =>
              Number.isFinite(value) ? value.toLocaleString('en-US') : value,
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.15)',
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed.y;
              const label = context.label ? `${context.label}: ` : '';
              return `${label}${Number(value).toLocaleString('en-US')}`;
            },
          },
        },
      },
    }),
    []
  );

  return (
    <div className="mt-2">
      <dl className="sr-only">
        <div>
          <dt>Candidate space</dt>
          <dd>{Number(count).toLocaleString('en-US')}</dd>
        </div>
        <div>
          <dt>Seconds at one million hashes per second</dt>
          <dd>{Number(time).toLocaleString('en-US')}</dd>
        </div>
      </dl>
      <div
        ref={containerRef}
        className="w-full rounded border border-white/10 bg-ub-cool-grey/30 backdrop-blur"
        style={{ minHeight: `${FALLBACK_HEIGHT}px`, height: `${height}px` }}
      >
        {width > 0 ? (
          <BarChart
            aria-label="Mask complexity chart"
            data={chartData}
            options={chartOptions}
            width={width}
            height={height}
          />
        ) : (
          <div className="w-full h-full animate-pulse bg-ub-cool-grey/20" aria-hidden="true" />
        )}
      </div>
    </div>
  );
};

export default StatsChart;
