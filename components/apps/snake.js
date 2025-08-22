import React, { useState, useEffect, useRef, useCallback } from 'react';

const gridSize = 20;
const createFood = () => ({
  x: Math.floor(Math.random() * gridSize),
  y: Math.floor(Math.random() * gridSize),
});

const Snake = () => {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState(createFood());
  const [direction, setDirection] = useState({ x: 0, y: -1 });
  const [gameOver, setGameOver] = useState(false);
  const moveRef = useRef();

  const moveSnake = useCallback(() => {
    setSnake((prev) => {
      const head = { x: prev[0].x + direction.x, y: prev[0].y + direction.y };
      if (
        head.x < 0 ||
        head.x >= gridSize ||
        head.y < 0 ||
        head.y >= gridSize ||
        prev.some((seg) => seg.x === head.x && seg.y === head.y)
      ) {
        setGameOver(true);
        return prev;
      }
      const newSnake = [head, ...prev];
      if (head.x === food.x && head.y === food.y) {
        setFood(createFood());
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  }, [direction, food]);

  useEffect(() => {
    moveRef.current = setInterval(moveSnake, 150);
    return () => clearInterval(moveRef.current);
  }, [moveSnake]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowUp' && direction.y !== 1) setDirection({ x: 0, y: -1 });
      if (e.key === 'ArrowDown' && direction.y !== -1) setDirection({ x: 0, y: 1 });
      if (e.key === 'ArrowLeft' && direction.x !== 1) setDirection({ x: -1, y: 0 });
      if (e.key === 'ArrowRight' && direction.x !== -1) setDirection({ x: 1, y: 0 });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [direction]);

  const reset = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(createFood());
    setDirection({ x: 0, y: -1 });
    setGameOver(false);
  };

  const cells = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const isSnake = snake.some((s) => s.x === x && s.y === y);
      const isFood = food.x === x && food.y === y;
      cells.push(
        <div
          key={`${x}-${y}`}
          className={`w-4 h-4 border border-gray-700 ${
            isSnake ? 'bg-green-500' : isFood ? 'bg-red-500' : 'bg-ub-cool-grey'
          }`}
        />
      );
    }
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white">
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
      >
        {cells}
      </div>
      {gameOver && (
        <div className="mt-2 flex items-center">
          <span className="mr-2">Game Over</span>
          <button
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={reset}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default Snake;

