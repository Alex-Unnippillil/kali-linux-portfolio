import React, { useId, useMemo } from 'react';

const StatsChart = ({ count = 0, time = 0 }) => {
  const chartTitleId = useId();
  const chartDescId = useId();

  const maxValue = Math.max(count, time, 1);
  const chartHeight = 70;
  const baselineY = 90;
  const axisX = 40;
  const barWidth = 36;
  const barSpacing = 32;

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 1,
      }),
    []
  );

  const bars = useMemo(
    () => [
      {
        key: 'candidates',
        label: 'Candidates processed',
        shortLabel: 'Candidates',
        value: count,
        unit: 'candidates',
        x: axisX + 10,
        color: 'var(--game-color-success)',
      },
      {
        key: 'seconds',
        label: 'Seconds elapsed',
        shortLabel: 'Seconds',
        value: time,
        unit: 'seconds',
        x: axisX + 10 + barWidth + barSpacing,
        color: 'var(--game-color-secondary)',
      },
    ],
    [axisX, barSpacing, barWidth, count, time]
  );

  const chartRight = bars[bars.length - 1].x + barWidth + 10;
  const axisColor = 'var(--color-ubt-grey, #aea79f)';
  const textColor = 'var(--color-text, #f5f5f5)';
  const transition =
    'height var(--motion-medium, 300ms) ease-out, y var(--motion-medium, 300ms) ease-out';

  const description = `Bar chart comparing ${numberFormatter.format(
    count
  )} candidates against ${numberFormatter.format(time)} seconds.`;

  return (
    <svg
      role="img"
      aria-labelledby={chartTitleId}
      aria-describedby={chartDescId}
      viewBox={`0 0 ${chartRight + 20} 120`}
      className="w-full h-28 mt-2"
    >
      <title id={chartTitleId}>Hash cracking progress overview</title>
      <desc id={chartDescId}>{description}</desc>
      <line
        x1={axisX}
        y1={baselineY - chartHeight}
        x2={axisX}
        y2={baselineY}
        stroke={axisColor}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={axisX}
        y1={baselineY}
        x2={chartRight}
        y2={baselineY}
        stroke={axisColor}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <g aria-hidden="true" fill={axisColor} fontSize="8">
        <text x={axisX - 4} y={baselineY + 6} textAnchor="end">
          0
        </text>
        <text x={axisX - 4} y={baselineY - chartHeight + 4} textAnchor="end">
          {numberFormatter.format(maxValue)}
        </text>
      </g>
      <text
        x={axisX / 2}
        y={baselineY - chartHeight / 2}
        textAnchor="middle"
        fontSize="9"
        fill={textColor}
        transform={`rotate(-90 ${axisX / 2} ${baselineY - chartHeight / 2})`}
      >
        Value
      </text>
      <text
        x={(axisX + chartRight) / 2}
        y={baselineY + 18}
        textAnchor="middle"
        fontSize="9"
        fill={textColor}
      >
        Metrics
      </text>
      {bars.map((bar) => {
        const height = (bar.value / maxValue) * chartHeight;
        const y = baselineY - height;
        return (
          <g key={bar.key}>
            <rect
              x={bar.x}
              y={y}
              width={barWidth}
              height={height}
              fill={bar.color}
              rx="4"
              style={{ transition }}
            >
              <title>
                {`${bar.label}: ${numberFormatter.format(bar.value)} ${bar.unit}`}
              </title>
            </rect>
            <text
              x={bar.x + barWidth / 2}
              y={baselineY + 10}
              textAnchor="middle"
              fontSize="8.5"
              fill={textColor}
            >
              {bar.shortLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default StatsChart;
