import React, { useRef, useState } from 'react';

const StatsChart = ({ count, time }) => {
  const [visibility, setVisibility] = useState({
    count: true,
    time: true,
  });

  const series = [
    { key: 'count', label: 'candidates', value: count, color: '#10b981', x: 10 },
    { key: 'time', label: 'seconds', value: time, color: '#3b82f6', x: 70 },
  ];

  const max = Math.max(count, time, 1);
  const buttonRefs = useRef([]);

  const toggleSeries = (key) => {
    setVisibility((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleKeyDown = (event, index) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (index + direction + series.length) % series.length;
      const nextButton = buttonRefs.current[nextIndex];
      if (nextButton) {
        nextButton.focus();
      }
    }
  };

  return (
    <div>
      <div className="mt-2 flex gap-2" role="toolbar" aria-label="Toggle chart series">
        {series.map(({ key, label, color }, index) => {
          const isActive = visibility[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => toggleSeries(key)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              ref={(element) => {
                buttonRefs.current[index] = element;
              }}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                isActive
                  ? 'bg-slate-800 text-white focus-visible:ring-sky-400'
                  : 'bg-slate-900 text-slate-300 opacity-70 focus-visible:ring-slate-500'
              }`}
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded"
                style={{ backgroundColor: color }}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <svg viewBox="0 0 120 100" className="w-full h-24 mt-4">
        {series.map(({ key, x, value, color, label }) => {
          const height = (value / max) * 80;
          const isVisible = visibility[key];

          return (
            <g key={key}>
              <rect
                x={x}
                y={isVisible ? 90 - height : 90}
                width="40"
                height={isVisible ? height : 0}
                fill={color}
                opacity={isVisible ? 1 : 0}
              />
              <text
                x={x + 20}
                y="95"
                textAnchor="middle"
                fontSize="8"
                fill={isVisible ? 'white' : '#9ca3af'}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default StatsChart;
