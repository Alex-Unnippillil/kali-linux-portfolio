import React, { useEffect, useMemo, useState } from 'react';
import { loadTaskHistory } from './data-loader';

const statuses = ['Queued', 'Running', 'Completed'];
const colors = {
  Queued: 'fill-blue-500',
  Running: 'fill-yellow-500',
  Completed: 'fill-green-500',
};

const TaskRunChart = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadTaskHistory()
      .then((data) => {
        if (cancelled) return;
        setHistory(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setHistory([]);
        setError(err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chart = useMemo(() => {
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
    return { height, width, points };
  }, [history]);

  if (loading && history.length === 0) {
    return (
      <div className="w-full h-24 mb-2">
        <div className="w-full h-full rounded bg-gray-700/70 animate-pulse" />
        <span className="sr-only">Loading task run history…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-red-400" role="status">
        Failed to load task run history.
      </p>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${chart.width || 100} ${(chart.height || 40) + 10}`}
      className="w-full h-24 mb-2"
      role="img"
      aria-label="Task runs and status changes over time"
    >
      {statuses.map((s, idx) => {
        const y = (chart.height || 40) - (idx / (statuses.length - 1)) * (chart.height || 40);
        return (
          <g key={s}>
            <line
              x1="0"
              y1={y}
              x2={chart.width || 100}
              y2={y}
              className="stroke-gray-600"
              strokeWidth="0.5"
            />
            <text x="0" y={y - 1} className="fill-white text-[8px]">
              {s}
            </text>
          </g>
        );
      })}
      <polyline
        points={chart.points}
        fill="none"
        stroke="white"
        strokeWidth="1"
      />
      {history.map((d, i) => {
        const x = i * 20 + 10;
        const y =
          (chart.height || 40) -
          (statuses.indexOf(d.status) / (statuses.length - 1)) * (chart.height || 40);
        return <circle key={d.time} cx={x} cy={y} r="2" className={colors[d.status]} />;
      })}
    </svg>
  );
};

export default TaskRunChart;
