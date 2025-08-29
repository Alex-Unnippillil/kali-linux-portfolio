'use client';

import { useMemo, useState } from 'react';

const profileFns = {
  light: (t: number) => 30 + 10 * Math.sin(t / 5),
  medium: (t: number) => 50 + 20 * Math.sin(t / 7),
  heavy: (t: number) => 70 + 25 * Math.sin(t / 9),
};

const profileOptions = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

export default function WorkloadVisualizer() {
  const [profile, setProfile] = useState('light');
  const data = useMemo(() => {
    const fn = profileFns[profile as keyof typeof profileFns];
    return Array.from({ length: 60 }, (_, i) => ({
      t: i,
      v: Math.min(100, Math.max(0, fn(i))),
    }));
  }, [profile]);

  const points = data
    .map((p, i) => `${(i / (data.length - 1)) * 100},${100 - p.v}`)
    .join(' ');

  return (
    <div className="space-y-2" aria-label="workload visualizer">
      <label>
        Profile
        <select
          className="ml-2 text-black p-1 rounded"
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
        >
          {profileOptions.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-40 bg-gray-800"
        role="img"
        aria-label="workload profile chart"
      >
        <polyline
          fill="none"
          stroke="#4ade80"
          strokeWidth={1}
          points={points}
        />
      </svg>
    </div>
  );
}

