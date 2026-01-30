import React from 'react';

/**
 * @typedef {{ minute: number; count: number }} MinuteBucket
 */

/**
 * @param {{ minutes?: MinuteBucket[] }} props
 */
const BurstChart = ({ minutes = [] }) => {
  if (!minutes.length) return null;
  const max = Math.max(...minutes.map((m) => m.count));
  const avg = minutes.reduce((sum, m) => sum + m.count, 0) / minutes.length;
  return (
    <div
      className="h-24 bg-black flex items-end overflow-x-auto px-2"
      role="img"
      aria-label="Traffic bursts by minute"
    >
      {minutes.map((m) => {
        const height = (m.count / max) * 100;
        const isBurst = m.count > avg * 2;
        return (
          <div
            key={m.minute}
            className={`w-4 mx-1 ${isBurst ? 'bg-red-500' : 'bg-gray-500'}`}
            style={{ height: `${height}%` }}
            title={`Minute ${m.minute}: ${m.count} packets`}
            aria-label={`Minute ${m.minute}: ${m.count} packets${isBurst ? ' burst' : ''}`}
          />
        );
      })}
    </div>
  );
};

export default BurstChart;
