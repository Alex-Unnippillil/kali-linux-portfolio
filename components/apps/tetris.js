import React, { useState, useEffect, useCallback } from 'react';

const WIDTH = 10;
const HEIGHT = 20;

const createBoard = () => Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));

const Tetris = () => {
  const [board, setBoard] = useState(createBoard());
  const [pos, setPos] = useState({ x: Math.floor(WIDTH / 2), y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setPos((p) => {
        if (p.y + 1 >= HEIGHT) {
          setBoard((b) => {
            const newBoard = b.map((row) => row.slice());
            newBoard[p.y][p.x] = 1;
            return newBoard;
          });
          return { x: Math.floor(WIDTH / 2), y: 0 };
        }
        return { ...p, y: p.y + 1 };
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      setPos((p) => ({ ...p, x: Math.max(0, p.x - 1) }));
    }
    if (e.key === 'ArrowRight') {
      setPos((p) => ({ ...p, x: Math.min(WIDTH - 1, p.x + 1) }));
    }
    if (e.key === 'ArrowDown') {
      setPos((p) => ({ ...p, y: Math.min(HEIGHT - 1, p.y + 1) }));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const cells = [];
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const filled = board[y][x] || (pos.x === x && pos.y === y);
      cells.push(
        <div
          key={`${x}-${y}`}
          className={`w-4 h-4 border border-gray-700 ${filled ? 'bg-blue-500' : 'bg-ub-cool-grey'}`}
        />
      );
    }
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${WIDTH}, minmax(0, 1fr))` }}>
        {cells}
      </div>
    </div>
  );
};

export default Tetris;

