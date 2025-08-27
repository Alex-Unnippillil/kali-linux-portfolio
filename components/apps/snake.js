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
  const snakeRef = useRef([{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }]);
  const dirRef = useRef({ x: 1, y: 0 });
  const foodRef = useRef(randomFood(snakeRef.current));

  const rafRef = useRef();
  const lastRef = useRef(0);
  const runningRef = useRef(true);
  const audioCtx = useRef(null);

  const [running, setRunning] = useState(true);
  const [wrap, setWrap] = useState(false);
  const [sound, setSound] = useState(true);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
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
    ctx.fillStyle = '#ef4444';
    const food = foodRef.current;
    ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.fillStyle = '#22c55e';
    snakeRef.current.forEach((seg) => {
      ctx.fillRect(seg.x * CELL_SIZE, seg.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    ctxRef.current = ctx;
    draw();
  }, [draw]);

  const update = useCallback(() => {
    const snake = snakeRef.current;
    const dir = dirRef.current;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

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
      setScore((s) => s + 1);
      beep(440);
      foodRef.current = randomFood(snake);
    } else {
      snake.pop();
    }
    draw();
  }, [wrap, draw, beep]);

  const loop = useCallback((time) => {
    rafRef.current = requestAnimationFrame(loop);
    if (!runningRef.current) return;
    if (time - lastRef.current > SPEED) {
      lastRef.current = time;
      update();
    }
  }, [update]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  useGameControls(({ x, y }) => {
    const curr = dirRef.current;
    if (curr.x + x === 0 && curr.y + y === 0) return;
    dirRef.current = { x, y };
  });

  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('snake_highscore', score.toString());
      }
    }
  }, [gameOver, score, highScore]);

  const reset = useCallback(() => {
    snakeRef.current = [{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }];
    dirRef.current = { x: 1, y: 0 };
    foodRef.current = randomFood(snakeRef.current);
    setScore(0);
    setGameOver(false);
    setRunning(true);
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
        <div className="absolute top-2 left-2 text-sm">
          Score: {score} | High: {highScore}
        </div>
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            Game Over
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
