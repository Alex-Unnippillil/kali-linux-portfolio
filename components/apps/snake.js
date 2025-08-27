import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameLayout from './GameLayout';
import useGameControls from './useGameControls';

// simple deterministic PRNG (https://stackoverflow.com/a/47593316)
const createRng = (seed) => {
  return () => {
    seed |= 0; // ensure int
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};


// size of the square play field
const gridSize = 20;

// speed progression settings
const SPEED_STEP = 10;
const MIN_SPEED = 50;
const SPEED_INTERVAL = 5; // foods per speed increase

// helper that finds a random unoccupied cell using provided rng
const randomCell = (rng, occupied) => {
  let cell;
  do {
    cell = {
      x: Math.floor(rng() * gridSize),
      y: Math.floor(rng() * gridSize),
    };
  } while (occupied.some((p) => p.x === cell.x && p.y === cell.y));
  return cell;
};

const createObstacles = (rng, count, occupied = []) => {
  const obs = [];
  while (obs.length < count) {
    obs.push(randomCell(rng, [...occupied, ...obs]));
  }
  return obs;
};

const createPortals = (rng, occupied = []) => {
  const pts = [];
  while (pts.length < 2) {
    pts.push(randomCell(rng, [...occupied, ...pts]));
  }
  return pts;
};

const speedLevels = { slow: 200, normal: 150, fast: 100 };

const Snake = () => {
  // snake state and movement
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState({ x: 0, y: -1 });
  const dirQueue = useRef([]); // buffered turns
  const snakeRef = useRef(snake);

  // deterministic rng seed
  const [seed, setSeed] = useState(Date.now());
  const rngRef = useRef(createRng(seed));

  // entities
  const [food, setFood] = useState(() => randomCell(rngRef.current, [{ x: 10, y: 10 }]));
  const [obstacles, setObstacles] = useState(() =>
    createObstacles(rngRef.current, 5, [{ x: 10, y: 10 }])
  );
  const [portals, setPortals] = useState([]); // pair of teleport cells

  // game state
  const [paused, setPaused] = useState(false);
  const [mode, setMode] = useState('normal'); // normal | wrap | portal
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
  const [replayData, setReplayData] = useState(null);
  const [playingReplay, setPlayingReplay] = useState(false);

  // fixed time step loop
  const lastTime = useRef(0);
  const acc = useRef(0);
  const animationFrameRef = useRef();
  const replayFrameRef = useRef();
  const replayLastTimeRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('snakeMode');
    if (stored) {
      try {
        const { mode: m = 'normal', speed: s = 'normal' } = JSON.parse(stored);
        setMode(m);
        setSpeedSetting(s);
        setSpeed(speedLevels[s]);
        const hs = localStorage.getItem(`snakeHighScore_${m}_${s}`);
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
    localStorage.setItem('snakeMode', JSON.stringify({ mode, speed: speedSetting }));
    const hs = localStorage.getItem(`snakeHighScore_${mode}_${speedSetting}`);
    setHighScore(hs ? parseInt(hs, 10) : 0);
    setSpeed(speedLevels[speedSetting]);
  }, [mode, speedSetting]);

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
  const step = useCallback(
    (replayDir) => {
      setSnake((prev) => {
        let dir = direction;
        if (replayDir) {
          dir = replayDir;
          setDirection(dir);
        } else if (dirQueue.current.length) {
          dir = dirQueue.current.shift();
          setDirection(dir);
        }

        let head = { x: prev[0].x + dir.x, y: prev[0].y + dir.y };
        if (mode === 'wrap') {
          head.x = (head.x + gridSize) % gridSize;
          head.y = (head.y + gridSize) % gridSize;
        }

        if (mode === 'portal' && portals.length === 2) {
          const idx = portals.findIndex((p) => p.x === head.x && p.y === head.y);
          if (idx !== -1) {
            head = { ...portals[1 - idx] };
          }
        }

        const outOfBounds =
          head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize;
        const hitWall = mode !== 'wrap' && outOfBounds;
        const hitSelf = prev.some((s) => s.x === head.x && s.y === head.y);
        const hitObstacle = obstacles.some((o) => o.x === head.x && o.y === head.y);
        if (hitWall || hitSelf || hitObstacle) {
          setGameOver(true);
          setReplayData({ seed, mode, steps: replayRef.current });
          return prev;
        }

        const newSnake = [head, ...prev];
        if (head.x === food.x && head.y === food.y) {
          const occupied = [...newSnake, ...obstacles, ...portals];
          const newFood = randomCell(rngRef.current, occupied);
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

        if (!playingReplay) replayRef.current.push(dir);
        return newSnake;
      });
    },
    [direction, food, obstacles, portals, mode, seed, playingReplay]
  );

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
    if (!replayData) return;
    cancelAnimationFrame(replayFrameRef.current);
    // reset game with stored seed and mode
    reset(replayData.seed, replayData.mode, true);
    setPlayingReplay(true);
    let i = 0;
    replayLastTimeRef.current = 0;
    const run = (time) => {
      if (!replayLastTimeRef.current) replayLastTimeRef.current = time;
      if (i >= replayData.steps.length) {
        setPlayingReplay(false);
        return;
      }
      if (time - replayLastTimeRef.current >= speed) {
        step(replayData.steps[i]);
        i += 1;
        replayLastTimeRef.current = time;
      }
      replayFrameRef.current = requestAnimationFrame(run);
    };
    replayFrameRef.current = requestAnimationFrame(run);
  };

  const reset = (seedOverride, modeOverride = mode, keepReplay = false) => {
    cancelAnimationFrame(replayFrameRef.current);
    const newSeed = seedOverride ?? Date.now();
    setSeed(newSeed);
    rngRef.current = createRng(newSeed);
    const start = { x: 10, y: 10 };
    setSnake([start]);
    setDirection({ x: 0, y: -1 });
    dirQueue.current = [];
    setMode(modeOverride);
    const obs = createObstacles(rngRef.current, 5, [start]);
    setObstacles(obs);
    const pts =
      modeOverride === 'portal'
        ? createPortals(rngRef.current, [start, ...obs])
        : [];
    setPortals(pts);
    setFood(randomCell(rngRef.current, [start, ...obs, ...pts]));
    setScore(0);
    setSpeed(speedLevels[speedSetting]);
    setGameOver(false);
    setPaused(false);
    if (!keepReplay) {
      replayRef.current = [];
      setReplayData(null);
    }
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
          `snakeHighScore_${mode}_${speedSetting}`,
          score.toString()
        );
      }
    }
  }, [gameOver, score, highScore, mode, speedSetting]);

  const cells = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const isSnake = snake.some((s) => s.x === x && s.y === y);
      const isFood = food.x === x && food.y === y;
      const isObstacle = obstacles.some((o) => o.x === x && o.y === y);
      const isPortal = portals.some((p) => p.x === x && p.y === y);
      cells.push(
        <div
          key={`${x}-${y}`}
          className={`w-4 h-4 border border-gray-700 transform transition-transform ${
            isSnake
              ? `bg-green-500 ${
                  growCell && growCell.x === x && growCell.y === y
                    ? 'scale-125'
                    : 'scale-100'
                }`
              : isFood
              ? `bg-red-500 ${foodAnim ? 'scale-125' : 'scale-100'}`
              : isObstacle
              ? 'bg-gray-500'
              : isPortal
              ? 'bg-blue-500'
              : 'bg-ub-cool-grey'
          }`}
        />
      );
    }
  }

  return (
    <GameLayout instructions="Use arrow keys or swipe to move.">
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none">
        <div className="mb-2 flex flex-wrap items-center space-x-2">
          <span>Score: {score}</span>
          <span>| High Score: {highScore}</span>
          <span>| Seed: {seed}</span>
          <button
            className="ml-2 px-2 py-0.5 bg-gray-700 rounded"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="ml-2 px-2 py-0.5 bg-gray-700 rounded"
            onClick={() => reset()}
          >
            Reset
          </button>
          <button
            className="ml-2 px-2 py-0.5 bg-gray-700 rounded"
            onClick={playReplay}
            disabled={!replayData}
          >
            Replay
          </button>
          <select
            className="ml-2 px-1 bg-gray-700 rounded"
            value={mode}
            onChange={(e) => reset(undefined, e.target.value)}
          >
            <option value="normal">Normal</option>
            <option value="wrap">Wrap</option>
            <option value="portal">Portal</option>
          </select>
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
      </div>
    </GameLayout>

  );
};

export default Snake;
