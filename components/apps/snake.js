import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameLayout from './GameLayout';
import useGameControls from './useGameControls';


// size of the square play field
const gridSize = 20;

// speed progression settings
const SPEED_STEP = 10;
const MIN_SPEED = 50;
const SPEED_INTERVAL = 5; // foods per speed increase

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

const speedLevels = { slow: 200, normal: 150, fast: 100 };

const Snake = () => {
  // snake state and movement
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState({ x: 0, y: -1 });
  const dirQueue = useRef([]); // buffered turns
  const snakeRef = useRef(snake);

  // entities
  const [food, setFood] = useState(() => randomCell([{ x: 10, y: 10 }]));
  const [obstacles, setObstacles] = useState(() => createObstacles(5, [{ x: 10, y: 10 }]));

  // game state
  const [paused, setPaused] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [speedSetting, setSpeedSetting] = useState('normal');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(speedLevels[speedSetting]); // ms per step

  // animation state
  const [growCell, setGrowCell] = useState(null);
  const [foodAnim, setFoodAnim] = useState(false);

  // replay handling
  const replayRef = useRef([]); // record of directions
  const [replayData, setReplayData] = useState([]);
  const [playingReplay, setPlayingReplay] = useState(false);

  // fixed time step loop
  const lastTime = useRef(0);
  const acc = useRef(0);
  const animationFrameRef = useRef();
  const replayFrameRef = useRef();
  const replayLastTimeRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedMode = localStorage.getItem('snakeMode');
    if (storedMode) {
      try {
        const { wrap: w = false, speed: s = 'normal' } = JSON.parse(storedMode);
        setWrap(w);
        setSpeedSetting(s);
        setSpeed(speedLevels[s]);
        const hs = localStorage.getItem(
          `snakeHighScore_${w ? 'wrap' : 'nowrap'}_${s}`
        );
        if (hs) setHighScore(parseInt(hs, 10));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('snakeMode', JSON.stringify({ wrap, speed: speedSetting }));
    const hs = localStorage.getItem(`snakeHighScore_${wrap ? 'wrap' : 'nowrap'}_${speedSetting}`);
    setHighScore(hs ? parseInt(hs, 10) : 0);
    setSpeed(speedLevels[speedSetting]);
  }, [wrap, speedSetting]);

  const enqueueDir = useCallback(
    (dir) => {
      const last = dirQueue.current.length
        ? dirQueue.current[dirQueue.current.length - 1]
        : direction;
      if (
        snakeRef.current.length > 1 &&
        last.x + dir.x === 0 &&
        last.y + dir.y === 0
      )
        return; // prevent 180 into self
      dirQueue.current.push(dir);
    },
    [direction]
  );

  useGameControls(enqueueDir);

  // pause key
  useEffect(() => {
    const handle = (e) => {
      if (e.key === ' ') setPaused((p) => !p);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

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
        const newFood = randomCell(occupied);
        setFood(newFood);
        setScore((s) => {
          const ns = s + 1;
          if (ns % SPEED_INTERVAL === 0) {
            setSpeed((sp) => Math.max(MIN_SPEED, sp - SPEED_STEP));
          }
          return ns;
        });
        setGrowCell(head);
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
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [paused, gameOver, step, speed, playingReplay]);

  // replay playback
  const playReplay = () => {
    if (!replayData.length) return;
    cancelAnimationFrame(replayFrameRef.current);
    setPlayingReplay(true);
    setSnake([{ x: 10, y: 10 }]);
    let i = 0;
    replayLastTimeRef.current = 0;
    const run = (time) => {
      if (!replayLastTimeRef.current) replayLastTimeRef.current = time;
      if (i >= replayData.length) {
        setPlayingReplay(false);
        return;
      }
      if (time - replayLastTimeRef.current >= speed) {
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
        replayLastTimeRef.current = time;
      }
      replayFrameRef.current = requestAnimationFrame(run);
    };
    replayFrameRef.current = requestAnimationFrame(run);
  };

  const reset = () => {
    cancelAnimationFrame(replayFrameRef.current);
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 0, y: -1 });
    dirQueue.current = [];
    setFood(randomCell([{ x: 10, y: 10 }]));
    setObstacles(createObstacles(5, [{ x: 10, y: 10 }]));
    setScore(0);
    setSpeed(speedLevels[speedSetting]);
    setGameOver(false);
    setPaused(false);
    replayRef.current = [];
    setReplayData([]);
    setGrowCell(null);
    setFoodAnim(false);
  };

  useEffect(() => () => cancelAnimationFrame(replayFrameRef.current), []);

  useEffect(() => {
    if (growCell) {
      const t = setTimeout(() => setGrowCell(null), 200);
      return () => clearTimeout(t);
    }
  }, [growCell]);

  useEffect(() => {
    setFoodAnim(true);
    const t = setTimeout(() => setFoodAnim(false), 200);
    return () => clearTimeout(t);
  }, [food]);

  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          `snakeHighScore_${wrap ? 'wrap' : 'nowrap'}_${speedSetting}`,
          score.toString()
        );
      }
    }
  }, [gameOver, score, highScore, wrap, speedSetting]);

  const cells = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const idx = snake.findIndex((s) => s.x === x && s.y === y);
      const isSnake = idx !== -1;
      const isFood = food.x === x && food.y === y;
      const isObstacle = obstacles.some((o) => o.x === x && o.y === y);

      // create gradient color for snake segments from head to tail
      const colorPercent = snake.length > 1 ? idx / (snake.length - 1) : 0;
      const segmentColor = `hsl(${120 - colorPercent * 60}, 70%, 45%)`;

      cells.push(
        <div
          key={`${x}-${y}`}
          style={isSnake ? { '--segment-color': segmentColor } : {}}
          className={`w-4 h-4 border border-gray-700 transform transition-transform ${
            isSnake
              ? `snake-segment ${
                  growCell && growCell.x === x && growCell.y === y
                    ? 'scale-125'
                    : 'scale-100'
                }`
              : isFood
              ? `bg-red-500 ${foodAnim ? 'scale-125' : 'scale-100'}`
              : isObstacle
              ? 'bg-gray-500'
              : 'bg-ub-cool-grey'
          }`}
        />
      );
    }
  }

  return (
    <GameLayout instructions="Use arrow keys or swipe to move.">
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none">
        <div className="mb-2 flex space-x-2">
          <span>High Score: {highScore}</span>
          <button
            className="ml-2 px-2 py-0.5 bg-gray-700 rounded"
            onClick={() => setPaused((p) => !p)}

          >
            Retry
          </button>
          <button
            className="ml-2 px-2 py-0.5 bg-gray-700 rounded"
            onClick={() => setWrap((w) => !w)}

          >
            Replay
          </button>
          <select
            className="ml-2 px-1 bg-gray-700 rounded"
            value={speedSetting}
            onChange={(e) => setSpeedSetting(e.target.value)}
          >
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
        </div>
        <div className="relative">
          <div className="score-overlay">Score: {score}</div>
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {cells}
          </div>
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
      </div>
    </GameLayout>

  );
};

export default Snake;
