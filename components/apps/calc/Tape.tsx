import React, { useEffect, useRef } from 'react';

export interface TapeEntry {
  expr: string;
  result: string;
}

interface Props {
  entries: TapeEntry[];
  onClear: () => void;
}

const Tape: React.FC<Props> = ({ entries, onClear }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="w-48 ml-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold">Tape</span>
        <button
          aria-label="clear tape"
          onClick={onClear}
          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
        >
          Clear
        </button>
      </div>
      <div
        ref={ref}
        data-testid="calc-tape"
        className="flex-1 overflow-y-auto bg-gray-800 rounded p-2 text-sm"
      >
        {entries.map((entry, idx) => (
          <div key={idx} className="mb-1">
            {entry.expr} = {entry.result}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tape;
