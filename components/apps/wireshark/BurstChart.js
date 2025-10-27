import React from 'react';

const BurstChart = ({ minutes = [] }) => {
  if (!minutes.length) return null;
  const max = Math.max(...minutes.map((m) => m.count));
  const avg = minutes.reduce((sum, m) => sum + m.count, 0) / minutes.length;
  return (
    <div
      className="h-24 flex items-end overflow-x-auto border border-kali-border/40 bg-kali-surface/90 px-2"
      role="img"
      aria-label="Traffic bursts by minute"
    >
      {minutes.map((m) => {
        const height = (m.count / max) * 100;
        const isBurst = m.count > avg * 2;
        return (
          <div
            key={m.minute}
            className={`mx-1 w-4 rounded-sm shadow-sm transition-colors ${
              isBurst ? 'bg-rose-500/80' : 'bg-kali-primary/80'
            }`}
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
