import React from 'react';
import history from './task-history.json';

const statuses = ['Queued', 'Running', 'Completed'];
const colors = {
  Queued: 'fill-kali-info',
  Running: 'fill-kali-primary',
  Completed: 'fill-kali-control',
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
      className="mb-2 h-24 w-full"
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
              className="stroke-white/20"
              strokeWidth="0.75"
            />
            <text
              x="0"
              y={y - 1}
              className="fill-white/70 text-[8px]"
            >
              {s}
            </text>
          </g>
        );
      })}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        className="stroke-kali-primary"
        strokeWidth="1.5"
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
            r="2.5"
            className={`${colors[d.status]} stroke-kali-background stroke-[0.75]`}
          />
        );
      })}
    </svg>
  );
};

export default TaskRunChart;
