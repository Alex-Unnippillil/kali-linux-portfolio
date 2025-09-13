"use client";

import { useEffect, useState } from 'react';
import { getMetricsCounts } from '../utils/metrics';

export default function MetricsDebug() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setCounts(getMetricsCounts());
  }, []);

  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl mb-4">Usage Metrics</h1>
      {Object.keys(counts).length === 0 ? (
        <p>No metrics recorded.</p>
      ) : (
        <ul className="space-y-2">
          {Object.entries(counts).map(([name, value]) => (
            <li key={name}>
              {name}: {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
