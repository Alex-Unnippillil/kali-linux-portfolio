import React from 'react';

interface ProgressDonutProps {
  value: number;
  total: number;
}

const ProgressDonut: React.FC<ProgressDonutProps> = ({ value, total }) => {
  const pct = Math.min(100, (value / total) * 100);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24" aria-label="Attack progress">
      <circle
        className="text-gray-700"
        strokeWidth="10"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="50"
        cy="50"
      />
      <circle
        className="text-green-500"
        strokeWidth="10"
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="50"
        cy="50"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
      <text
        x="50"
        y="55"
        textAnchor="middle"
        className="fill-white text-sm"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
};

export default ProgressDonut;
