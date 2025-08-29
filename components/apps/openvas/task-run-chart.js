import React from 'react';
import history from './task-history.json';

const statuses = ['Queued', 'Running', 'Completed'];
const colors = {
  Queued: 'fill-blue-500',
  Running: 'fill-yellow-500',
  Completed: 'fill-green-500',
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
              className="stroke-gray-600"
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
      <polyline points={points} fill="none" stroke="white" strokeWidth="1" />
      {history.map((d, i) => {
        const x = i * 20 + 10;
        const y =
          height - (statuses.indexOf(d.status) / (statuses.length - 1)) * height;
        return <circle key={d.time} cx={x} cy={y} r="2" className={colors[d.status]} />;
      })}
    </svg>
  );
};

export default TaskRunChart;
