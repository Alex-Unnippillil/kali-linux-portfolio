import React, { useRef, useEffect, useState, useCallback } from 'react';
import GameLayout from './GameLayout';
import useGameControls from './useGameControls';
import useGameHaptics from '../../hooks/useGameHaptics';
import usePersistentState from '../../hooks/usePersistentState';
import useCanvasResize from '../../hooks/useCanvasResize';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

const GRID_SIZE = 20;
const CELL_SIZE = 16; // pixels
const SPEED = 120; // ms per move

/**
 * Generate a random food position that does not overlap the snake.
 * @param {Array<{x:number,y:number}>} snake current snake segments
 */
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
  const canvasRef = useCanvasResize(GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
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
  const haptics = useGameHaptics();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [running, setRunning] = useState(true);
  const [wrap, setWrap] = useState(false);
  const [sound, setSound] = useState(true);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = usePersistentState(
    'snake_highscore',
    0,
    (v) => typeof v === 'number',
  );

  useEffect(() => {
    const handleBlur = () => setRunning(false);
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  /**
   * Play a short tone if sound is enabled.
   * @param {number} freq frequency in Hz
   */
  const beep = useCallback(
    (freq) => {
      if (!sound) return;
      try {
        const ctx =
          audioCtx.current ||
          new (window.AudioContext || window.webkitAudioContext)();
        audioCtx.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + 0.15,
        );
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch {
        // ignore audio errors
      }
    },
    [sound],
  );

  /** Render the current game state to the canvas. */
  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

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

  /** Advance the game state by one step. */
  const update = useCallback(() => {
    const snake = snakeRef.current;
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
      haptics.danger();
      setGameOver(true);
      setRunning(false);
      beep(120);
      return;
    }

    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      haptics.danger();
      setGameOver(true);
      setRunning(false);
      beep(120);
      return;
    }

    snake.unshift(head);
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      setScore((s) => s + 1);
      haptics.score();
      beep(440);
      foodRef.current = randomFood(snake);
      if (!prefersReducedMotion) head.scale = 0;
    } else {
      snake.pop();
    }
  }, [wrap, beep]);

  /** Main animation loop driven by requestAnimationFrame. */
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
    }
  }, [gameOver, score, highScore, setHighScore]);

  useEffect(() => {
    if (gameOver) haptics.gameOver();
  }, [gameOver, haptics]);

  /** Reset the game to its initial state. */
  const reset = useCallback(() => {
    snakeRef.current = [
      { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2), scale: 1 },
    ];
    dirRef.current = { x: 1, y: 0 };
    foodRef.current = randomFood(snakeRef.current);
    moveQueueRef.current = [];
    setScore(0);
    setGameOver(false);
    setRunning(true);
    draw();
  }, [draw]);

  return (
    <GameLayout gameId="snake" score={score} highScore={highScore}>
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="bg-gray-800 border border-gray-700 w-full h-full"
            tabIndex={0}
            aria-label="Snake game board"
          />
          {gameOver && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"
              role="alert"
              aria-live="assertive"
            >
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
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={haptics.toggle}
          >
            {haptics.enabled ? 'Haptics On' : 'Haptics Off'}
          </button>
        </div>
      </div>
    </GameLayout>
  );
};

export default Snake;
