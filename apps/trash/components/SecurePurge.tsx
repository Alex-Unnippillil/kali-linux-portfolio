'use client';

import { useEffect, useState } from 'react';

interface Props {
  onComplete: () => void;
}

const passes = [
  'Pass 1/3: Overwriting with zeros…',
  'Pass 2/3: Overwriting with ones…',
  'Pass 3/3: Overwriting with random data…',
];

export default function SecurePurge({ onComplete }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step < passes.length) {
      const t = setTimeout(() => setStep(step + 1), 700);
      return () => clearTimeout(t);
    }
    const done = setTimeout(onComplete, 400);
    return () => clearTimeout(done);
  }, [step, onComplete]);

  const percent = Math.min(step / passes.length, 1) * 100;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white">
      <p className="mb-4">{step < passes.length ? passes[step] : 'Secure purge complete.'}</p>
      <div className="w-64 h-4 bg-gray-700 rounded overflow-hidden">
        <div
          className="h-full bg-ub-orange transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-4 text-sm text-center px-4">
        Secure delete overwrites files multiple times to help prevent recovery.
      </p>
    </div>
  );
}

