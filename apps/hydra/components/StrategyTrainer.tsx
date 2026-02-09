'use client';

import React, { useMemo, useState } from 'react';

interface StrategyTrainerProps {
  className?: string;
}

const CHANCE_PER_ATTEMPT = 0.05; // 5% chance per attempt for simulation
const STEPS = 20;
const WIDTH = 300;
const HEIGHT = 150;

const StrategyTrainer: React.FC<StrategyTrainerProps> = ({ className = '' }) => {
  const [parallelism, setParallelism] = useState(4);
  const [lockout, setLockout] = useState(10);

  const points = useMemo(() => {
    const pts: { t: number; success: number }[] = [];
    for (let t = 0; t <= STEPS; t++) {
      const attempts = Math.min(parallelism * t, lockout);
      const success = 1 - Math.pow(1 - CHANCE_PER_ATTEMPT, attempts);
      pts.push({ t, success });
    }
    return pts;
  }, [parallelism, lockout]);

  const path = points
    .map(
      (p) => {
        const x = Math.round((p.t / STEPS) * WIDTH * 100) / 100;
        const y = Math.round((HEIGHT - p.success * HEIGHT) * 100) / 100;
        return `${x},${y}`;
      }
    )
    .join(' ');

  const finalSuccess = points[points.length - 1]?.success ?? 0;

  const containerClass = ['p-4', 'bg-gray-800', 'rounded', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass}>
      <h2 className="text-xl mb-4">Strategy Trainer</h2>
      <div className="mb-4">
        <label
          className="block mb-1"
          htmlFor="hydra-strategy-parallelism"
          id="hydra-strategy-parallelism-label"
        >
          Parallelism: {parallelism}
        </label>
        <input
          id="hydra-strategy-parallelism"
          type="range"
          min={1}
          max={16}
          value={parallelism}
          onChange={(e) => setParallelism(Number(e.target.value))}
          className="w-full"
          aria-labelledby="hydra-strategy-parallelism-label"
        />
      </div>
      <div className="mb-4">
        <label
          className="block mb-1"
          htmlFor="hydra-strategy-lockout"
          id="hydra-strategy-lockout-label"
        >
          Lockout Threshold: {lockout}
        </label>
        <input
          id="hydra-strategy-lockout"
          type="range"
          min={1}
          max={50}
          value={lockout}
          onChange={(e) => setLockout(Number(e.target.value))}
          className="w-full"
          aria-labelledby="hydra-strategy-lockout-label"
        />
      </div>
      <svg width={WIDTH} height={HEIGHT} className="bg-black">
        <polyline
          points={path}
          fill="none"
          stroke="lime"
          strokeWidth="2"
        />
      </svg>
      <p className="mt-2 text-sm">
        Estimated success chance: {(finalSuccess * 100).toFixed(1)}%
      </p>
    </div>
  );
};

export default StrategyTrainer;

