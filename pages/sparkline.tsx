'use client';
import React, { useState } from 'react';
import Sparkline, { SparklineMode } from '../components/Sparkline';

const SparklinePage = () => {
  const [mode, setMode] = useState<SparklineMode>('led');
  const data = [2, 5, 3, 9, 6, 5, 7, 3, 4, 8];

  return (
    <div className="p-4 space-y-4">
      <Sparkline data={data} mode={mode} width={120} height={40} />
      <div className="space-x-2">
        {(['led', 'gradient', 'fire'] as SparklineMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-2 py-1 border rounded ${
              mode === m ? 'bg-ub-orange text-white' : 'text-ubt-grey'
            }`}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SparklinePage;
