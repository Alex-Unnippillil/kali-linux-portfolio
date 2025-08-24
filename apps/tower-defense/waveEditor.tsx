import React, { useState } from 'react';

interface Props {
  onStart: (count: number) => void;
  recomputeCount: number;
}

const WaveEditor: React.FC<Props> = ({ onStart, recomputeCount }) => {
  const [count, setCount] = useState(5);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label htmlFor="wave-count" className="text-xs">
          Wave size
        </label>
        <input
          id="wave-count"
          type="number"
          value={count}
          min={1}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-16 text-black"
        />
        <button
          className="bg-blue-600 px-2 py-1 text-xs"
          onClick={() => onStart(count)}
        >
          Start
        </button>
      </div>
      <div className="text-xs">Field recomputes: {recomputeCount}</div>
    </div>
  );
};

export default WaveEditor;
