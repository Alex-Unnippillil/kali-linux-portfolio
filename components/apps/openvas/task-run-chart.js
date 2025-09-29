import React from 'react';
import history from './task-history.json';

const statuses = ['Queued', 'Running', 'Completed'];
const colors = {
  Queued: 'var(--chart-status-queued)',
  Running: 'var(--chart-status-running)',
  Completed: 'var(--chart-status-completed)',
};

const TaskRunChart = () => {
  const height = 40;
  const width = history.length * 20 + 20;
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
      {statuses.map((s, idx) => {
        const y = height - (idx / (statuses.length - 1)) * height;
        return (
          <g key={s}>
            <line
              x1="0"
              y1={y}
              x2={width}
              y2={y}
              stroke="var(--chart-grid)"
              strokeWidth="0.5"
            />
            <text
              x="0"
              y={y - 1}
              className="text-[8px]"
              fill="var(--chart-label)"
            >
              {s}
            </text>
          </g>
        );
      })}
      <polyline
        points={points}
        fill="none"
        stroke="var(--chart-line)"
        strokeWidth="1"
      />
      {history.map((d, i) => {
        const x = i * 20 + 10;
        const y =
          height - (statuses.indexOf(d.status) / (statuses.length - 1)) * height;
        return (
          <circle
            key={d.time}
            cx={x}
            cy={y}
            r="2"
            fill={colors[d.status]}
          />
        );
      })}
    </svg>
  );
};

export default TaskRunChart;
