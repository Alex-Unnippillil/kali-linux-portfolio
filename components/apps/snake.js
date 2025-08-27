import React, { useRef, useEffect, useState, useCallback } from 'react';
import useGameControls from './useGameControls';

const GRID_SIZE = 20;
const CELL_SIZE = 16; // pixels
const SPEED = 120; // ms per move

const randomFood = (snake) => {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
};

const Snake = () => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const snakeRef = useRef([
    { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2), scale: 1 },
  ]);
  const dirRef = useRef({ x: 1, y: 0 });
  const foodRef = useRef(randomFood(snakeRef.current));
  const moveQueueRef = useRef([]);

  const rafRef = useRef();
  const lastRef = useRef(0);
  const runningRef = useRef(true);
  const audioCtx = useRef(null);
  const prefersReducedMotion = useRef(false);

  const scoreRef = useRef(0);
  const prevRef = useRef(null);
  const sparkleRef = useRef(null);
  const portalAngleRef = useRef(0);

  const [running, setRunning] = useState(true);
  const [wrap, setWrap] = useState(false);
  const [sound, setSound] = useState(true);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [lives, setLives] = useState(1);
  const [scoring, setScoring] = useState(true);
  const [highScore, setHighScore] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = window.localStorage.getItem('snake_highscore');
    return stored ? parseInt(stored, 10) : 0;
  });

  const beep = useCallback((freq) => {
    if (!sound) return;
    const ctx = audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }, [sound]);

  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

    if (wrap) {
      const angle = portalAngleRef.current;
      const mid = Math.floor(GRID_SIZE / 2);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      const drawPortal = (x, y) => {
        ctx.save();
        ctx.translate(
          x * CELL_SIZE + CELL_SIZE / 2,
          y * CELL_SIZE + CELL_SIZE / 2,
        );
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.arc(0, 0, CELL_SIZE / 2, 0, Math.PI * 1.5);
        ctx.stroke();
        ctx.restore();
      };
      drawPortal(0, mid);
      drawPortal(GRID_SIZE - 1, mid);
      drawPortal(mid, 0);
      drawPortal(mid, GRID_SIZE - 1);
      if (!prefersReducedMotion.current) {
        portalAngleRef.current = angle + 0.1;
      }
    }

    // Ghost path preview
    const ghost = [];
    let gx = snakeRef.current[0].x;
    let gy = snakeRef.current[0].y;
    let gdir = dirRef.current;
    const moves = moveQueueRef.current;
    for (let i = 0; i < 5; i += 1) {
      if (moves[i]) gdir = moves[i];
      gx += gdir.x;
      gy += gdir.y;
      if (wrap) {
        gx = (gx + GRID_SIZE) % GRID_SIZE;
        gy = (gy + GRID_SIZE) % GRID_SIZE;
      } else if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) {
        break;
      }
      ghost.push({ x: gx, y: gy });
    }
    if (ghost.length) {
      ctx.fillStyle = 'rgba(74,222,128,0.5)';
      ghost.forEach((g) => {
        ctx.fillRect(g.x * CELL_SIZE, g.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      });
    }

    // Food
    ctx.fillStyle = '#ef4444';
    const food = foodRef.current;
    ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    if (sparkleRef.current && !prefersReducedMotion.current) {
      const { x, y, frame } = sparkleRef.current;
      const cx = x * CELL_SIZE + CELL_SIZE / 2;
      const cy = y * CELL_SIZE + CELL_SIZE / 2;
      const radius = (frame / 10) * (CELL_SIZE / 2);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.stroke();
      sparkleRef.current.frame += 1;
      if (sparkleRef.current.frame > 10) sparkleRef.current = null;
    }

    // Snake segments
    ctx.fillStyle = '#22c55e';
    snakeRef.current.forEach((seg) => {
      const scale = seg.scale ?? 1;
      const size = CELL_SIZE * scale;
      const offset = (CELL_SIZE - size) / 2;
      ctx.fillRect(seg.x * CELL_SIZE + offset, seg.y * CELL_SIZE + offset, size, size);
      if (scale < 1) {
        seg.scale = Math.min(1, scale + 0.1);
      }
    });
  }, [wrap]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    ctxRef.current = ctx;
    draw();
  }, [draw]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReducedMotion.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
    }
  }, []);

  const update = useCallback(() => {
    const snake = snakeRef.current;
    prevRef.current = {
      snake: snake.map((s) => ({ ...s })),
      dir: { ...dirRef.current },
      food: { ...foodRef.current },
      score: scoreRef.current,
    };
    if (moveQueueRef.current.length) {
      const next = moveQueueRef.current.shift();
      if (
        next &&
        (dirRef.current.x + next.x !== 0 || dirRef.current.y + next.y !== 0)
      ) {
        dirRef.current = next;
      }
    }
    const dir = dirRef.current;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y, scale: 1 };

    if (wrap) {
      head.x = (head.x + GRID_SIZE) % GRID_SIZE;
      head.y = (head.y + GRID_SIZE) % GRID_SIZE;
    } else if (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= GRID_SIZE ||
      head.y >= GRID_SIZE
    ) {
      setGameOver(true);
      setRunning(false);
      beep(120);
      return;
    }

    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      setGameOver(true);
      setRunning(false);
      beep(120);
      return;
    }

    snake.unshift(head);
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      if (scoring) {
        setScore((s) => {
          const ns = s + 1;
          scoreRef.current = ns;
          return ns;
        });
      }
      beep(440);
      foodRef.current = randomFood(snake);
      sparkleRef.current = {
        x: foodRef.current.x,
        y: foodRef.current.y,
        frame: 0,
      };
      if (!prefersReducedMotion.current) head.scale = 0;
    } else {
      snake.pop();
    }
  }, [wrap, beep, scoring]);

  const loop = useCallback(
    (time) => {
      rafRef.current = requestAnimationFrame(loop);
      if (runningRef.current && time - lastRef.current > SPEED) {
        lastRef.current = time;
        update();
      }
      draw();
    },
    [update, draw]
  );

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  useGameControls(({ x, y }) => {
    const queue = moveQueueRef.current;
    const curr = queue.length ? queue[queue.length - 1] : dirRef.current;
    if (curr.x + x === 0 && curr.y + y === 0) return;
    queue.push({ x, y });
  });

  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('snake_highscore', score.toString());
      }
    }
  }, [gameOver, score, highScore]);

  const rewind = useCallback(() => {
    const prev = prevRef.current;
    if (!prev || lives <= 0) return;
    snakeRef.current = prev.snake.map((s) => ({ ...s }));
    dirRef.current = { ...prev.dir };
    foodRef.current = { ...prev.food };
    moveQueueRef.current = [];
    setScore(prev.score);
    scoreRef.current = prev.score;
    setGameOver(false);
    setRunning(true);
    setLives((l) => l - 1);
    setScoring(false);
    draw();
  }, [lives, draw]);

  const reset = useCallback(() => {
    snakeRef.current = [
      { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2), scale: 1 },
    ];
    dirRef.current = { x: 1, y: 0 };
    foodRef.current = randomFood(snakeRef.current);
    moveQueueRef.current = [];
    sparkleRef.current = {
      x: foodRef.current.x,
      y: foodRef.current.y,
      frame: 0,
    };
    scoreRef.current = 0;
    prevRef.current = null;
    portalAngleRef.current = 0;
    setScore(0);
    setGameOver(false);
    setRunning(true);
    setLives(1);
    setScoring(true);
    draw();
  }, [draw]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          className="bg-gray-800 border border-gray-700"
        />
        <div
          className="absolute top-2 left-2 text-sm"
          aria-live="polite"
          role="status"
          aria-atomic="true"
        >
          Score: {score} | High: {highScore} | Lives: {lives}
        </div>
        {gameOver && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"
            role="alert"
            aria-live="assertive"
          >
            <div className="text-center">
              Game Over
              {lives > 0 && (
                <div className="mt-2">
                  <button
                    className="px-2 py-1 bg-gray-700 rounded"
                    onClick={rewind}
                  >
                    Rewind
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 space-x-2">
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={reset}
        >
          Reset
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? 'Pause' : 'Resume'}
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => setWrap((w) => !w)}
        >
          {wrap ? 'Wrap' : 'No Wrap'}
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => setSound((s) => !s)}
        >
          {sound ? 'Sound On' : 'Sound Off'}
        </button>
      </div>
    </div>
  );
};

export default Snake;
