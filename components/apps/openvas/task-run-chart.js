import React from 'react';
import history from './task-history.json';
import { STATUS_TONE_METADATA, resolveTone } from '../../common/statusMeta';

const statuses = ['Queued', 'Running', 'Completed'];
const markerSize = 4;

const patternIdForTone = (tone) => `openvas-status-${tone}`;

const renderMarker = (d, i, x, y) => {
  const tone = resolveTone(d.status, 'info');
  const metadata = STATUS_TONE_METADATA[tone];
  const fillId = patternIdForTone(tone);
  const fill = `url(#${fillId})`;
  const stroke = `var(${metadata.accentVar})`;
  const title = `${d.status} at ${d.time}`;
  const markerKey = `${d.time}-${i}`;
  const common = {
    fill,
    stroke,
    strokeWidth: 1,
  };

  if (tone === 'success') {
    return (
      <circle key={markerKey} {...common} cx={x} cy={y} r={markerSize + 1}>
        <title>{title}</title>
      </circle>
    );
  }

  if (tone === 'warning') {
    return (
      <rect
        key={markerKey}
        {...common}
        x={x - (markerSize + 0.5)}
        y={y - (markerSize + 0.5)}
        width={(markerSize + 0.5) * 2}
        height={(markerSize + 0.5) * 2}
        rx={1}
      >
        <title>{title}</title>
      </rect>
    );
  }

  if (tone === 'danger') {
    return (
      <polygon
        key={markerKey}
        {...common}
        points={`${x},${y - (markerSize + 1)} ${x - (markerSize + 1)},${y} ${x},${y + (markerSize + 1)} ${x + (markerSize + 1)},${y}`}
      >
        <title>{title}</title>
      </polygon>
    );
  }

  if (tone === 'neutral') {
    return (
      <rect
        key={markerKey}
        {...common}
        x={x - (markerSize + 1)}
        y={y - 1}
        width={(markerSize + 1) * 2}
        height={2}
      >
        <title>{title}</title>
      </rect>
    );
  }

  return (
    <polygon
      key={markerKey}
      {...common}
      points={`${x},${y - (markerSize + 1)} ${x - (markerSize + 1)},${y + (markerSize + 1)} ${x + (markerSize + 1)},${y + (markerSize + 1)}`}
    >
      <title>{title}</title>
    </polygon>
  );
};

const TaskRunChart = () => {
  const height = 40;
  const width = history.length * 20 + 20;
  const tonesInUse = Array.from(
    new Set(history.map((d) => resolveTone(d.status, 'info')))
  );
  const points = history
    .map((d, i) => {
      const x = i * 20 + 10;
      const y =
        height - (statuses.indexOf(d.status) / (statuses.length - 1)) * height;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${width} ${height + 10}`}
      className="w-full h-24 mb-2"
      role="img"
      aria-label="Task runs and status changes over time"
    >
      <defs>
        {tonesInUse.map((tone) => {
          const meta = STATUS_TONE_METADATA[tone];
          const id = patternIdForTone(tone);
          const size = 8;
          return (
            <pattern
              key={tone}
              id={id}
              patternUnits="userSpaceOnUse"
              width={size}
              height={size}
            >
              <rect width={size} height={size} fill={`var(${meta.colorVar})`} />
              <path
                d={`M0 ${size} L${size} 0`}
                stroke={`var(${meta.accentVar})`}
                strokeWidth={1.5}
                strokeLinecap="square"
              />
              <path
                d={`M${-size / 2} ${size / 2} L${size / 2} ${-size / 2}`}
                stroke={`var(${meta.accentVar})`}
                strokeWidth={1.5}
                strokeLinecap="square"
              />
            </pattern>
          );
        })}
      </defs>
      {statuses.map((s, idx) => {
        const y = height - (idx / (statuses.length - 1)) * height;
        return (
          <g key={s}>
            <line
              x1="0"
              y1={y}
              x2={width}
              y2={y}
              stroke="var(--status-neutral-strong)"
              strokeWidth="0.5"
            />
            <text
              x="0"
              y={y - 1}
              className="fill-white text-[8px]"
            >
              {s}
            </text>
          </g>
        );
      })}
      <polyline
        points={points}
        fill="none"
        stroke="var(--status-neutral-strong)"
        strokeDasharray="4 2"
        strokeWidth="1"
      />
      {history.map((d, i) => {
        const x = i * 20 + 10;
        const y =
          height - (statuses.indexOf(d.status) / (statuses.length - 1)) * height;
        return renderMarker(d, i, x, y);
      })}
    </svg>
  );
};

export default TaskRunChart;
