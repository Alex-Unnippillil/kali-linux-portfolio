import React from 'react';

const HourlyGraph = ({ hourly = [], unit }) => {
  const slice = hourly.slice(0, 12);
  if (slice.length === 0) return null;
  const temps = slice.map((h) => h.temp);
  const max = Math.max(...temps);
  const min = Math.min(...temps);
  const points = temps
    .map((t, i) => {
      const x = (i / (slice.length - 1)) * 100;
      const y = 100 - ((t - min) / (max - min || 1)) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 100 100" className="w-full h-24 text-white">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
};

export default HourlyGraph;
