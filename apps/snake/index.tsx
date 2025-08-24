import React, { useCallback, useEffect, useRef, useState } from 'react';

type Point = { x: number; y: number };
const CELL_SIZE = 20;
const OBSTACLE_COUNT = 5;
const BASE_SPEED = 200; // ms per step
const MIN_SPEED = 50;

const themes = {
  classic: { bg: '#000000', snake: '#00ff00', food: '#ff0000', obstacle: '#555555' },
  neon: { bg: '#222222', snake: '#0fffff', food: '#ff00ff', obstacle: '#ffff00' },
  dark: { bg: '#111111', snake: '#ffffff', food: '#ff6600', obstacle: '#666666' },
  colorBlind: { bg: '#000000', snake: '#00aaff', food: '#ffaa00', obstacle: '#888888' },
};

type ThemeName = keyof typeof themes;
type Mode = 'walls' | 'portals' | 'obstacles' | 'speed';

const useRandomCell = (size: number) =>
  useCallback((occupied: Point[]): Point => {
    let cell: Point;
    do {
      cell = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
    } while (occupied.some((p) => p.x === cell.x && p.y === cell.y));
    return cell;
  }, [size]);

const randomCellFor = (occupied: Point[], size: number): Point => {
  let cell: Point;
  do {
    cell = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
  } while (occupied.some((p) => p.x === cell.x && p.y === cell.y));
  return cell;
};

const Snake: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [gridSize, setGridSize] = useState(20);
  const randomCell = useRandomCell(gridSize);
  const startPoint = { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) };
  const [snake, setSnake] = useState<Point[]>([startPoint]);
  const [direction, setDirection] = useState<Point>({ x: 0, y: -1 });
  const dirQueue = useRef<Point[]>([]);

  const [food, setFood] = useState<Point>(() => randomCell([startPoint]));
  const [obstacles, setObstacles] = useState<Point[]>([]);

  const [mode, setMode] = useState<Mode>('walls');
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(BASE_SPEED);
  const speedRef = useRef(BASE_SPEED);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [theme, setTheme] = useState<ThemeName>('classic');
  const historyRef = useRef<Point[]>([]);
  const replayDataRef = useRef<Point[]>([]);
  const [replaying, setReplaying] = useState(false);
  const segmentPool = useRef<Point[]>([]);
  const acquire = useCallback((): Point => segmentPool.current.pop() || { x: 0, y: 0 }, []);
  const release = useCallback((p: Point) => segmentPool.current.push(p), []);

  const audioCtx = useRef<AudioContext | null>(null);
  const playSound = useCallback((type: 'eat' | 'die') => {
    if (typeof window === 'undefined') return;
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = type === 'eat' ? 600 : 200;
    osc.start();
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.stop(ctx.currentTime + 0.2);
  }, []);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('snakeHighScore') : null;
    if (stored) setHighScore(parseInt(stored, 10));
    fetch('/api/snake/scores')
      .then((r) => r.json())
      .then((d) => setHighScore((s) => Math.max(s, d.scores?.[0] ?? 0)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('snakeHighScore', highScore.toString());
    }
  }, [highScore]);

  const enqueue = useCallback(
    (dir: Point) => {
      if (replaying) return;
      const last = dirQueue.current.length ? dirQueue.current[dirQueue.current.length - 1] : direction;
      if (last.x + dir.x === 0 && last.y + dir.y === 0) return;
      dirQueue.current.push(dir);
    },
    [direction, replaying]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') enqueue({ x: 0, y: -1 });
      if (e.key === 'ArrowDown') enqueue({ x: 0, y: 1 });
      if (e.key === 'ArrowLeft') enqueue({ x: -1, y: 0 });
      if (e.key === 'ArrowRight') enqueue({ x: 1, y: 0 });
      if (e.key === ' ') setPaused((p) => !p);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enqueue]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof window !== 'undefined' && 'OffscreenCanvas' in window && typeof Worker !== 'undefined') {
      try {
        const off = canvas.transferControlToOffscreen();
        const worker = new Worker(new URL('./renderer.ts', import.meta.url));
        workerRef.current = worker;
        worker.postMessage({ canvas: off }, [off]);
        return () => worker.terminate();
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    let raf: number;
    const prev = { up: false, down: false, left: false, right: false };
    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = pads && pads[0];
      if (gp) {
        const [axX, axY] = gp.axes;
        const b = gp.buttons;
        const up = b[12]?.pressed || axY < -0.5;
        const down = b[13]?.pressed || axY > 0.5;
        const left = b[14]?.pressed || axX < -0.5;
        const right = b[15]?.pressed || axX > 0.5;
        if (up && !prev.up) enqueue({ x: 0, y: -1 });
        else if (down && !prev.down) enqueue({ x: 0, y: 1 });
        else if (left && !prev.left) enqueue({ x: -1, y: 0 });
        else if (right && !prev.right) enqueue({ x: 1, y: 0 });
        prev.up = up;
        prev.down = down;
        prev.left = left;
        prev.right = right;
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [enqueue]);

  useEffect(() => {
    let sx = 0;
    let sy = 0;
    const start = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const end = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) enqueue({ x: 1, y: 0 });
        else if (dx < -30) enqueue({ x: -1, y: 0 });
      } else {
        if (dy > 30) enqueue({ x: 0, y: 1 });
        else if (dy < -30) enqueue({ x: 0, y: -1 });
      }
    };
    window.addEventListener('touchstart', start);
    window.addEventListener('touchend', end);
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchend', end);
    };
  }, [enqueue]);

  const step = useCallback(() => {
    setSnake((prev) => {
      let dir = direction;
      if (dirQueue.current.length) {
        dir = dirQueue.current.shift()!;
        setDirection(dir);
      }
      historyRef.current.push(dir);
      const head = acquire();
      head.x = prev[0].x + dir.x;
      head.y = prev[0].y + dir.y;
      const wrap = mode === 'portals';
      if (wrap) {
        head.x = (head.x + gridSize) % gridSize;
        head.y = (head.y + gridSize) % gridSize;
      }
      const hitWall = head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize;
      const hitSelf = prev.some((p) => p.x === head.x && p.y === head.y);
      const hitObstacle = obstacles.some((o) => o.x === head.x && o.y === head.y);
      if ((!wrap && hitWall) || hitSelf || hitObstacle) {
        setGameOver(true);
        playSound('die');
        release(head);
        return prev;
      }
      const newSnake = [head, ...prev];
      if (head.x === food.x && head.y === food.y) {
        const occupied = [...newSnake, ...obstacles];
        setFood(randomCell(occupied));
        setScore((s) => s + 1);
        if (mode === 'speed') {
          speedRef.current = Math.max(MIN_SPEED, speedRef.current - 10);
          setSpeed(speedRef.current);
        }
        playSound('eat');
      } else {
        const tail = newSnake.pop();
        if (tail) release(tail);
      }
      return newSnake;
    });
  }, [direction, food, obstacles, mode, playSound, gridSize, randomCell, acquire, release]);

  useEffect(() => {
    let frame: number;
    let last = performance.now();
    let acc = 0;
    const loop = (time: number) => {
      if (!paused && !gameOver) {
        acc += time - last;
        const interval = speedRef.current;
        while (acc >= interval) {
          step();
          acc -= interval;
        }
      }
      last = time;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [step, paused, gameOver]);

  useEffect(() => {
    const worker = workerRef.current;
    const t = themes[theme];
    if (worker) {
      worker.postMessage({ snake, food, obstacles, colors: t, gridSize, cellSize: CELL_SIZE });
      return;
    }
    if (!bufferRef.current) {
      bufferRef.current = document.createElement('canvas');
    }
    const buffer = bufferRef.current;
    buffer.width = gridSize * CELL_SIZE;
    buffer.height = gridSize * CELL_SIZE;
    const bctx = buffer.getContext('2d');
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!bctx || !ctx) return;
    bctx.fillStyle = t.bg;
    bctx.fillRect(0, 0, gridSize * CELL_SIZE, gridSize * CELL_SIZE);
    bctx.fillStyle = t.obstacle;
    obstacles.forEach((o) => bctx.fillRect(o.x * CELL_SIZE, o.y * CELL_SIZE, CELL_SIZE, CELL_SIZE));
    bctx.fillStyle = t.food;
    bctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    bctx.fillStyle = t.snake;
    snake.forEach((s) => bctx.fillRect(s.x * CELL_SIZE, s.y * CELL_SIZE, CELL_SIZE, CELL_SIZE));
    ctx.clearRect(0, 0, gridSize * CELL_SIZE, gridSize * CELL_SIZE);
    ctx.drawImage(buffer, 0, 0);
  }, [snake, food, obstacles, theme, gridSize]);

  const reset = (m: Mode = mode, size = gridSize) => {
    setGridSize(size);
    dirQueue.current = [];
    historyRef.current = [];
    const start = { x: Math.floor(size / 2), y: Math.floor(size / 2) };
    setSnake([start]);
    setDirection({ x: 0, y: -1 });
    setFood(randomCellFor([start], size));
    if (m === 'obstacles') {
      setObstacles(() => {
        const obs: Point[] = [];
        while (obs.length < OBSTACLE_COUNT) obs.push(randomCellFor([...obs, start], size));
        return obs;
      });
    } else {
      setObstacles([]);
    }
    setScore(0);
    speedRef.current = BASE_SPEED;
    setSpeed(BASE_SPEED);
    setGameOver(false);
    setPaused(false);
    setMode(m);
  };

  const startReplay = () => {
    if (!gameOver || replayDataRef.current.length === 0) return;
    reset(mode, gridSize);
    dirQueue.current = [...replayDataRef.current];
    setReplaying(true);
  };

  useEffect(() => {
    if (gameOver) {
      if (!replaying) replayDataRef.current = [...historyRef.current];
      if (replaying) setReplaying(false);
      if (score > highScore) {
        fetch('/api/snake/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score }),
        })
          .then((r) => r.json())
          .then((d) => setHighScore(d.scores?.[0] ?? score))
          .catch(() => {});
      }
    }
  }, [gameOver, score, highScore, replaying]);

  return (
    <div className="p-4 flex flex-col items-center text-white space-y-2 select-none">
      <canvas
        ref={canvasRef}
        width={gridSize * CELL_SIZE}
        height={gridSize * CELL_SIZE}
        className="border border-gray-600"
      />
      <div className="space-x-2">
        <span>Score: {score}</span>
        <span>High: {highScore}</span>
        <button className="ml-2 px-2 py-1 bg-gray-700 rounded" onClick={() => setPaused((p) => !p)}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="ml-2 px-2 py-1 bg-gray-700 rounded" onClick={() => reset()}>
          Reset
        </button>
        <button className="ml-2 px-2 py-1 bg-gray-700 rounded" onClick={startReplay} disabled={!gameOver}>
          Replay
        </button>
        <select
          className="ml-2 bg-gray-700 rounded"
          value={mode}
          onChange={(e) => reset(e.target.value as Mode)}
        >
          <option value="walls">walls</option>
          <option value="portals">portals</option>
          <option value="obstacles">obstacles</option>
          <option value="speed">speed-up</option>
        </select>
        <select
          className="ml-2 bg-gray-700 rounded"
          value={gridSize}
          onChange={(e) => reset(mode, parseInt(e.target.value, 10))}
        >
          {[20, 30, 40].map((s) => (
            <option key={s} value={s}>
              {s}x{s}
            </option>
          ))}
        </select>
        <select
          className="ml-2 bg-gray-700 rounded"
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeName)}
        >
          {Object.keys(themes).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-1 sm:hidden">
        <div></div>
        <button onTouchStart={() => enqueue({ x: 0, y: -1 })} className="p-2 bg-gray-700 rounded">
          ↑
        </button>
        <div></div>
        <button onTouchStart={() => enqueue({ x: -1, y: 0 })} className="p-2 bg-gray-700 rounded">
          ←
        </button>
        <div></div>
        <button onTouchStart={() => enqueue({ x: 1, y: 0 })} className="p-2 bg-gray-700 rounded">
          →
        </button>
        <div></div>
        <button onTouchStart={() => enqueue({ x: 0, y: 1 })} className="p-2 bg-gray-700 rounded">
          ↓
        </button>
        <div></div>
      </div>
      {gameOver && <div className="text-red-400">Game Over</div>}
    </div>
  );
};

export default Snake;

