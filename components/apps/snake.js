import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameLayout from './GameLayout';

// size of the square play field
const gridSize = 20;

// helper that finds a random unoccupied cell
const randomCell = (occupied) => {
  let cell;
  do {
    cell = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
  } while (occupied.some((p) => p.x === cell.x && p.y === cell.y));
  return cell;
};

const createObstacles = (count, occupied = []) => {
  const obs = [];
  while (obs.length < count) {
    obs.push(randomCell([...occupied, ...obs]));
  }
  return obs;
};

const Snake = () => {
  // snake state and movement
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState({ x: 0, y: -1 });
  const dirQueue = useRef([]); // buffered turns

  // entities
  const [food, setFood] = useState(() => randomCell([{ x: 10, y: 10 }]));
  const [obstacles, setObstacles] = useState(() => createObstacles(5, [{ x: 10, y: 10 }]));

  // game state
  const [paused, setPaused] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(200); // ms per step

  // replay handling
  const replayRef = useRef([]); // record of directions
  const [replayData, setReplayData] = useState([]);
  const [playingReplay, setPlayingReplay] = useState(false);

  // fixed time step loop
  const lastTime = useRef(0);
  const acc = useRef(0);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('snakeHighScore') : null;
    if (stored) setHighScore(parseInt(stored, 10));
  }, []);

  const enqueueDir = useCallback((dir) => {
    const last = dirQueue.current.length ? dirQueue.current[dirQueue.current.length - 1] : direction;
    if (last.x + dir.x === 0 && last.y + dir.y === 0) return; // prevent 180
    dirQueue.current.push(dir);
  }, [direction]);

  // keyboard controls
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowUp') enqueueDir({ x: 0, y: -1 });
      if (e.key === 'ArrowDown') enqueueDir({ x: 0, y: 1 });
      if (e.key === 'ArrowLeft') enqueueDir({ x: -1, y: 0 });
      if (e.key === 'ArrowRight') enqueueDir({ x: 1, y: 0 });
      if (e.key === ' ') setPaused((p) => !p);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [enqueueDir]);

  // swipe controls
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    const start = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const end = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) enqueueDir({ x: 1, y: 0 });
        else if (dx < -30) enqueueDir({ x: -1, y: 0 });
      } else {
        if (dy > 30) enqueueDir({ x: 0, y: 1 });
        else if (dy < -30) enqueueDir({ x: 0, y: -1 });
      }
    };
    window.addEventListener('touchstart', start);
    window.addEventListener('touchend', end);
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchend', end);
    };
  }, [enqueueDir]);

  // movement and game logic
  const step = useCallback(() => {
    setSnake((prev) => {
      let dir = direction;
      if (dirQueue.current.length) {
        dir = dirQueue.current.shift();
        setDirection(dir);
      }

      let head = { x: prev[0].x + dir.x, y: prev[0].y + dir.y };
      if (wrap) {
        head.x = (head.x + gridSize) % gridSize;
        head.y = (head.y + gridSize) % gridSize;
      }

      const hitWall = head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize;
      const hitSelf = prev.some((s) => s.x === head.x && s.y === head.y);
      const hitObstacle = obstacles.some((o) => o.x === head.x && o.y === head.y);
      if ((!wrap && hitWall) || hitSelf || hitObstacle) {
        setGameOver(true);
        setReplayData(replayRef.current);
        return prev;
      }

      const newSnake = [head, ...prev];
      if (head.x === food.x && head.y === food.y) {
        const occupied = [...newSnake, ...obstacles];
        setFood(randomCell(occupied));
        setScore((s) => s + 1);
        setSpeed((s) => Math.max(50, s - 10));
      } else {
        newSnake.pop();
      }

      replayRef.current.push(dir);
      return newSnake;
    });
  }, [direction, food, obstacles, wrap]);

  // fixed time step game loop using rAF
  useEffect(() => {
    const loop = (time) => {
      if (!paused && !gameOver && !playingReplay) {
        const delta = time - lastTime.current;
        acc.current += delta;
        while (acc.current > speed) {
          step();
          acc.current -= speed;
        }
      }
      lastTime.current = time;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, [paused, gameOver, step, speed, playingReplay]);

  // replay playback
  const playReplay = () => {
    if (!replayData.length) return;
    setPlayingReplay(true);
    setSnake([{ x: 10, y: 10 }]);
    let i = 0;
    const run = () => {
      if (i >= replayData.length) {
        setPlayingReplay(false);
        return;
      }
      setSnake((prev) => {
        const dir = replayData[i];
        i += 1;
        let head = { x: prev[0].x + dir.x, y: prev[0].y + dir.y };
        if (wrap) {
          head.x = (head.x + gridSize) % gridSize;
          head.y = (head.y + gridSize) % gridSize;
        }
        const ns = [head, ...prev];
        ns.pop();
        return ns;
      });
      setTimeout(run, speed);
    };
    run();
  };

  const reset = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 0, y: -1 });
    dirQueue.current = [];
    setFood(randomCell([{ x: 10, y: 10 }]));
    setObstacles(createObstacles(5, [{ x: 10, y: 10 }]));
    setScore(0);
    setSpeed(200);
    setGameOver(false);
    setPaused(false);
    replayRef.current = [];
    setReplayData([]);
  };

  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
      if (typeof window !== 'undefined') {
        localStorage.setItem('snakeHighScore', score.toString());
      }
    }
  }, [gameOver, score, highScore]);

  const cells = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const isSnake = snake.some((s) => s.x === x && s.y === y);
      const isFood = food.x === x && food.y === y;
      const isObstacle = obstacles.some((o) => o.x === x && o.y === y);
      cells.push(
        <div
          key={`${x}-${y}`}
          className={`w-4 h-4 border border-gray-700 ${
            isSnake
              ? 'bg-green-500'
              : isFood
              ? 'bg-red-500'
              : isObstacle
              ? 'bg-gray-500'
              : 'bg-ub-cool-grey'
          }`}
        />
      );
    }
  }

  return (
    <GameLayout
      title="Snake"
      score={
        <div className="flex space-x-2">
          <span>Score: {score}</span>
          <span>| High Score: {highScore}</span>
        </div>
      }
      controls={
        <>
          <button
            className="px-2 py-0.5 bg-gray-700 rounded"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="px-2 py-0.5 bg-gray-700 rounded"
            onClick={() => setWrap((w) => !w)}
          >
            {wrap ? 'No Wrap' : 'Wrap'}
          </button>
        </>
      }
      instructions="Use arrow keys or swipe to move."
    >
      <>
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {cells}
        </div>
        {gameOver && (
          <div className="mt-2 flex items-center space-x-2">
            <span>Game Over</span>
            <button
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={reset}
            >
              Retry
            </button>
            <button
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={playReplay}
            >
              Replay
            </button>
          </div>
        )}
      </>
    </GameLayout>
  );
};

export default Snake;

