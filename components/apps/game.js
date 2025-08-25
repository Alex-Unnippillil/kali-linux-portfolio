import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { withGameErrorBoundary } from './GameErrorBoundary';

const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const calculateWinner = (squares) => {
  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
};

const GameApp = () => {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);

  const winner = useMemo(() => calculateWinner(squares), [squares]);

  const handleClick = useCallback(
    (i) => {
      setSquares((prev) => {
        if (prev[i] || calculateWinner(prev)) return prev;
        const next = [...prev];
        next[i] = xIsNext ? 'X' : 'O';
        setXIsNext(!xIsNext);
        return next;
      });
    },
    [xIsNext]
  );

  useEffect(() => {
    let timer;
    if (winner || squares.every(Boolean)) {
      timer = setTimeout(() => {
        setSquares(Array(9).fill(null));
        setXIsNext(true);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [winner, squares]);

  const status = winner
    ? `Winner: ${winner}`
    : squares.every(Boolean)
    ? 'Draw'
    : `Next player: ${xIsNext ? 'X' : 'O'}`;

  const reset = useCallback(() => {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
  }, []);

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col items-center justify-center">
      <div className="mb-4 text-xl">{status}</div>
      <div className="grid grid-cols-3 gap-2">
        {squares.map((value, idx) => (
          <button
            key={idx}
            className="w-16 h-16 bg-gray-700 hover:bg-gray-600 text-2xl flex items-center justify-center"
            onClick={() => handleClick(idx)}
          >
            {value}
          </button>
        ))}
      </div>
      <button
        className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={reset}
      >
        Reset
      </button>
    </div>
  );
};

const GameAppWithBoundary = withGameErrorBoundary(GameApp);

export default GameAppWithBoundary;

export const displayGame = () => <GameAppWithBoundary />;

