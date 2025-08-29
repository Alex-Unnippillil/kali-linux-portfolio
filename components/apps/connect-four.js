import React, { useState } from 'react';
import GameLayout from './GameLayout';

const ROWS = 6;
const COLS = 7;

function Board() {
  const [board, setBoard] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );

  const handleCell = (row, col) => {
    setBoard((prev) => {
      const next = prev.map((r) => r.slice());
      next[row][col] = next[row][col] ? null : 'red';
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-1">
      {board.map((row, rIdx) => (
        <div key={rIdx} className="flex gap-1">
          {row.map((cell, cIdx) => (
            <button
              key={cIdx}
              aria-label={`cell-${rIdx}-${cIdx}`}
              className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center focus:outline-none"
              onClick={() => handleCell(rIdx, cIdx)}
            >
              {cell && <div className="w-8 h-8 rounded-full bg-red-500" />}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ConnectFour() {
  return (
    <GameLayout gameId="connect-four">
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white p-4">
        <Board />
      </div>
    </GameLayout>
  );
}

