import React, { useState, useEffect } from 'react';

const BOARD_SIZE = 5;
const SHIP_COUNT = 3;

const createEmptyBoard = () => Array(BOARD_SIZE * BOARD_SIZE).fill(null);

const randomShips = () => {
  const set = new Set();
  while (set.size < SHIP_COUNT) {
    set.add(Math.floor(Math.random() * BOARD_SIZE * BOARD_SIZE));
  }
  return set;
};

const Battleship = () => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [ships, setShips] = useState(new Set());
  const [status, setStatus] = useState('Take a shot');

  const reset = () => {
    setBoard(createEmptyBoard());
    setShips(randomShips());
    setStatus('Take a shot');
  };

  useEffect(() => {
    reset();
  }, []);

  const handleClick = (idx) => {
    if (board[idx] || status.startsWith('All')) return;
    const newBoard = board.slice();
    const isHit = ships.has(idx);
    newBoard[idx] = isHit ? 'hit' : 'miss';
    setBoard(newBoard);

    if (isHit) {
      const remaining = new Set(ships);
      remaining.delete(idx);
      setShips(remaining);
      setStatus(remaining.size === 0 ? 'All ships sunk! You win!' : 'Hit!');
    } else {
      setStatus('Miss!');
    }
  };

  const cellClass = (cell) => {
    if (cell === 'hit') return 'bg-red-600';
    if (cell === 'miss') return 'bg-gray-600';
    return 'bg-gray-700 hover:bg-gray-600';
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="grid grid-cols-5 gap-1">
        {board.map((cell, idx) => (
          <button
            key={idx}
            className={`h-10 w-10 flex items-center justify-center text-xl ${cellClass(cell)}`}
            onClick={() => handleClick(idx)}
            disabled={Boolean(board[idx]) || status.startsWith('All')}
          >
            {cell === 'hit' ? 'X' : cell === 'miss' ? '\u2022' : ''}
          </button>
        ))}
      </div>
      <div className="mt-4">{status}</div>
      <button
        className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={reset}
      >
        Reset
      </button>
    </div>
  );
};

export default Battleship;

