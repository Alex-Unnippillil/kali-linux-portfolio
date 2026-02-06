import React from 'react';
import data from '../data/impact-metrics.json';

const colors: Record<string, string> = {
  Low: 'fill-green-600',
  Medium: 'fill-yellow-500',
  High: 'fill-orange-600',
  Critical: 'fill-red-700',
};

const ImpactChart: React.FC = () => {
  const max = Math.max(...data.metrics.map((m) => m.count));
  return (
    <figure className="max-w-md">
      <svg
        role="img"
        aria-labelledby="impactChartTitle impactChartDesc"
        viewBox="0 0 200 140"
        className="w-full h-48"
      >
        <title id="impactChartTitle">Vulnerability impact metrics</title>
        <desc id="impactChartDesc">
          {data.metrics.map((m) => `${m.severity} ${m.count}`).join(', ')}.
        </desc>
        {/* axes */}
        <line x1="30" y1="10" x2="30" y2="110" stroke="white" strokeWidth="1" />
        <line x1="30" y1="110" x2="190" y2="110" stroke="white" strokeWidth="1" />
        {/* bars */}
        {data.metrics.map((m, i) => {
          const barHeight = (m.count / max) * 80;
          const x = 40 + i * 40;
          const y = 110 - barHeight;
          return (
            <rect
              key={m.severity}
              x={x}
              y={y}
              width="30"
              height={barHeight}
              className={colors[m.severity]}
            >
              <title>{`${m.count} ${m.severity} findings`}</title>
            </rect>
          );
        })}
        {/* x labels */}
        {data.metrics.map((m, i) => (
          <text
            key={`${m.severity}-label`}
            x={55 + i * 40}
            y="125"
            textAnchor="middle"
            className="fill-white text-[10px]"
          >
            {m.severity}
          </text>
        ))}
        {/* y-axis label */}
        <text
          x="10"
          y="60"
          textAnchor="middle"
          transform="rotate(-90 10 60)"
          className="fill-white text-[10px]"
        >
          Findings
        </text>
        {/* x-axis label */}
        <text
          x="110"
          y="135"
          textAnchor="middle"
          className="fill-white text-[10px]"
        >
          Severity
        </text>
      </svg>
      <figcaption className="mt-2 text-sm text-gray-200">
        Data source: {data.source}
      </figcaption>
    </figure>
  );
};

export default ImpactChart;
