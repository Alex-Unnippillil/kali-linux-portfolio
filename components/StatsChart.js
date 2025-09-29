import React from 'react';

const StatsChart = ({ count, time }) => {
  const max = Math.max(count, time, 1);
  const cH = (count / max) * 80;
  const tH = (time / max) * 80;
  return (
    <svg viewBox="0 0 120 100" className="w-full h-24 mt-2">
      <rect
        x="10"
        y={90 - cH}
        width="40"
        height={cH}
        fill="var(--chart-series-1)"
      />
      <rect
        x="70"
        y={90 - tH}
        width="40"
        height={tH}
        fill="var(--chart-series-2)"
      />
      <text x="30" y="95" textAnchor="middle" fontSize="8" fill="var(--chart-label)">
        candidates
      </text>
      <text x="90" y="95" textAnchor="middle" fontSize="8" fill="var(--chart-label)">
        seconds
      </text>
    </svg>
  );
};

export default StatsChart;
