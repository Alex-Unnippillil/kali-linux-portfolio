import React, { useCallback, useEffect, useRef, useState } from 'react';

type Point = { x: number; y: number };
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const OBSTACLE_COUNT = 5;
const BASE_SPEED = 200; // ms per step
const MIN_SPEED = 50;

const themes = {
  classic: { bg: '#000000', snake: '#00ff00', food: '#ff0000', obstacle: '#555555' },
  neon: { bg: '#222222', snake: '#0fffff', food: '#ff00ff', obstacle: '#ffff00' },
  dark: { bg: '#111111', snake: '#ffffff', food: '#ff6600', obstacle: '#666666' },
};

type ThemeName = keyof typeof themes;
type Mode = 'classic' | 'wrap' | 'obstacles' | 'speed';

const randomCell = (occupied: Point[]): Point => {
  let cell: Point;
  do {
    cell = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
  } while (occupied.some((p) => p.x === cell.x && p.y === cell.y));
  return cell;
};

const Snake: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState<Point>({ x: 0, y: -1 });
  const dirQueue = useRef<Point[]>([]);

  const [food, setFood] = useState<Point>(() => randomCell([{ x: 10, y: 10 }]));
  const [obstacles, setObstacles] = useState<Point[]>([]);

  const [mode, setMode] = useState<Mode>('classic');
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(BASE_SPEED);
  const speedRef = useRef(BASE_SPEED);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [theme, setTheme] = useState<ThemeName>('classic');

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
    fetch('/api/snake/scores')
      .then((r) => r.json())
      .then((d) => setHighScore(d.scores?.[0] ?? 0))
      .catch(() => {});
  }, []);

  const enqueue = useCallback(
    (dir: Point) => {
      const last = dirQueue.current.length ? dirQueue.current[dirQueue.current.length - 1] : direction;
      if (last.x + dir.x === 0 && last.y + dir.y === 0) return;
      dirQueue.current.push(dir);
    },
    [direction]
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
      let head = { x: prev[0].x + dir.x, y: prev[0].y + dir.y };
      const wrap = mode === 'wrap';
      if (wrap) {
        head.x = (head.x + GRID_SIZE) % GRID_SIZE;
        head.y = (head.y + GRID_SIZE) % GRID_SIZE;
      }
      const hitWall = head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;
      const hitSelf = prev.some((p) => p.x === head.x && p.y === head.y);
      const hitObstacle = obstacles.some((o) => o.x === head.x && o.y === head.y);
      if ((!wrap && hitWall) || hitSelf || hitObstacle) {
        setGameOver(true);
        playSound('die');
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
        newSnake.pop();
      }
      return newSnake;
    });
  }, [direction, food, obstacles, mode, playSound]);

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
    if (!bufferRef.current) {
      bufferRef.current = document.createElement('canvas');
      bufferRef.current.width = GRID_SIZE * CELL_SIZE;
      bufferRef.current.height = GRID_SIZE * CELL_SIZE;
    }
    const buffer = bufferRef.current;
    const bctx = buffer?.getContext('2d');
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!bctx || !ctx) return;
    const t = themes[theme];
    bctx.fillStyle = t.bg;
    bctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
    bctx.fillStyle = t.obstacle;
    obstacles.forEach((o) => bctx.fillRect(o.x * CELL_SIZE, o.y * CELL_SIZE, CELL_SIZE, CELL_SIZE));
    bctx.fillStyle = t.food;
    bctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    bctx.fillStyle = t.snake;
    snake.forEach((s) => bctx.fillRect(s.x * CELL_SIZE, s.y * CELL_SIZE, CELL_SIZE, CELL_SIZE));
    ctx.clearRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
    ctx.drawImage(buffer, 0, 0);
  }, [snake, food, obstacles, theme]);

  const reset = (m: Mode = mode) => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 0, y: -1 });
    dirQueue.current = [];
    const start: Point[] = [{ x: 10, y: 10 }];
    setFood(randomCell(start));
    if (m === 'obstacles') {
      setObstacles(() => {
        const obs: Point[] = [];
        while (obs.length < OBSTACLE_COUNT) obs.push(randomCell([...start, ...obs]));
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

  useEffect(() => {
    if (gameOver && score > highScore) {
      fetch('/api/snake/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      })
        .then((r) => r.json())
        .then((d) => setHighScore(d.scores?.[0] ?? score))
        .catch(() => {});
    }
  }, [gameOver, score, highScore]);

  return (
    <div className="p-4 flex flex-col items-center text-white space-y-2 select-none">
      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL_SIZE}
        height={GRID_SIZE * CELL_SIZE}
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
        <select
          className="ml-2 bg-gray-700 rounded"
          value={mode}
          onChange={(e) => reset(e.target.value as Mode)}
        >
          <option value="classic">classic</option>
          <option value="wrap">wraparound</option>
          <option value="obstacles">obstacles</option>
          <option value="speed">speed-up</option>
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
      {gameOver && <div className="text-red-400">Game Over</div>}
    </div>
  );
};

export default Snake;

