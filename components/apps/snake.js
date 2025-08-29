import React, { useRef, useEffect, useState, useCallback } from 'react';
import GameLayout from './GameLayout';
import useGameControls from './useGameControls';
import { useSaveSlots } from './Games/common';
import useGameHaptics from '../../hooks/useGameHaptics';
import usePersistentState from '../../hooks/usePersistentState';
import useCanvasResize from '../../hooks/useCanvasResize';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import {
  GRID_SIZE,
  randomFood,
  generateObstacles,
  randomObstacle,
} from '../../apps/games/snake';

const CELL_SIZE = 16; // pixels
const DEFAULT_SPEED = 120; // ms per move

const Snake = () => {
  const canvasRef = useCanvasResize(GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
  const ctxRef = useRef(null);
  const snakeRef = useRef([
    { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2), scale: 1 },
  ]);
  const dirRef = useRef({ x: 1, y: 0 });
  const [obstaclePack] = usePersistentState(
    'snake:obstacles',
    [],
    (v) => Array.isArray(v),
  );
  const obstaclesRef = useRef(
    obstaclePack.length ? obstaclePack : [],
  );
  const foodRef = useRef(randomFood(snakeRef.current, obstaclesRef.current));
  if (obstaclesRef.current.length === 0) {
    obstaclesRef.current = generateObstacles(
      5,
      snakeRef.current,
      foodRef.current,
    );
  }
  const moveQueueRef = useRef([]);

  const rafRef = useRef();
  const lastRef = useRef(0);
  const runningRef = useRef(true);
  const audioCtx = useRef(null);
  const haptics = useGameHaptics();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [running, setRunning] = useState(true);
  const [wrap, setWrap] = usePersistentState(
    'snake_wrap',
    false,
    (v) => typeof v === 'boolean',
  );
  const [sound, setSound] = useState(true);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = usePersistentState(
    'snake_highscore',
    0,
    (v) => typeof v === 'number',
  );
  const speedRef = useRef(DEFAULT_SPEED);
  const {
    save: saveReplay,
    load: loadReplay,
    list: listReplays,
    remove: removeReplay,
  } = useSaveSlots('snake-replay');
  const [selectedReplay, setSelectedReplay] = useState('');
  const playingRef = useRef(false);
  const playbackRef = useRef([]);
  const playbackIndexRef = useRef(0);
  const recordingRef = useRef([]);

  useEffect(() => {
    const handleBlur = () => setRunning(false);
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    recordingRef.current = [
      {
        snake: snakeRef.current.map((s) => ({
          x: s.x,
          y: s.y,
          scale: s.scale,
        })),
        food: { ...foodRef.current },
        obstacles: obstaclesRef.current.map((o) => ({ ...o })),
        score: 0,
      },
    ];
  }, []);

  // Respect prefers-reduced-motion by pausing automatic movement
  useEffect(() => {
    if (prefersReducedMotion) setRunning(false);
  }, [prefersReducedMotion]);

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

    // Obstacles
    ctx.fillStyle = '#6b7280';
    obstaclesRef.current.forEach((o) => {
      ctx.fillRect(o.x * CELL_SIZE, o.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });

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
  }, [draw, canvasRef]);

  /** Advance the game state by one step. */
  const update = useCallback(() => {
    if (playingRef.current) {
      const frames = playbackRef.current;
      const idx = playbackIndexRef.current;
      if (!frames || idx >= frames.length) {
        playingRef.current = false;
        setRunning(false);
        return;
      }
      const frame = frames[idx];
      playbackIndexRef.current += 1;
      snakeRef.current = frame.snake.map((s) => ({ ...s }));
      foodRef.current = { ...frame.food };
      obstaclesRef.current = frame.obstacles.map((o) => ({ ...o }));
      setScore(frame.score || 0);
      return;
    }

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
    let headX = snake[0].x + dir.x;
    let headY = snake[0].y + dir.y;
    headX = Math.round(headX);
    headY = Math.round(headY);

    if (wrap) {
      headX = (headX + GRID_SIZE) % GRID_SIZE;
      headY = (headY + GRID_SIZE) % GRID_SIZE;
    } else if (
      headX < 0 ||
      headY < 0 ||
      headX >= GRID_SIZE ||
      headY >= GRID_SIZE
    ) {
      haptics.danger();
      setGameOver(true);
      setRunning(false);
      beep(120);
      return;
    }

    const grow = headX === foodRef.current.x && headY === foodRef.current.y;
    const body = grow ? snake : snake.slice(0, snake.length - 1);
    if (
      body.some((s) => s.x === headX && s.y === headY) ||
      obstaclesRef.current.some((o) => o.x === headX && o.y === headY)
    ) {
      haptics.danger();
      setGameOver(true);
      setRunning(false);
      beep(120);
      return;
    }

    const head = { x: headX, y: headY, scale: 1 };
    snake.unshift(head);
    if (grow) {
      setScore((s) => s + 1);
      haptics.score();
      beep(440);
      foodRef.current = randomFood(snake, obstaclesRef.current);
      obstaclesRef.current.push(
        randomObstacle(snake, foodRef.current, obstaclesRef.current),
      );
      if (!prefersReducedMotion) head.scale = 0;
      setSpeed((s) => Math.max(50, s * 0.95));
    } else {
      snake.pop();
    }

    recordingRef.current.push({
      snake: snake.map((seg) => ({ x: seg.x, y: seg.y, scale: seg.scale })),
      food: { ...foodRef.current },
      obstacles: obstaclesRef.current.map((o) => ({ ...o })),
      score: snake.length - 1,
    });
  }, [wrap, beep, haptics, prefersReducedMotion]);

  /** Main animation loop driven by requestAnimationFrame. */
  const loop = useCallback(
    (time) => {
      rafRef.current = requestAnimationFrame(loop);
      if (runningRef.current && time - lastRef.current > speedRef.current) {
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
    if (playingRef.current) return;
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

  useEffect(() => {
    if (gameOver && recordingRef.current.length) {
      const name = `replay-${Date.now()}`;
      saveReplay(name, { frames: recordingRef.current, wrap });
    }
  }, [gameOver, saveReplay, wrap]);

  /** Reset the game to its initial state. */
  const reset = useCallback(() => {
    snakeRef.current = [
      { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2), scale: 1 },
    ];
    dirRef.current = { x: 1, y: 0 };
    moveQueueRef.current = [];
    playingRef.current = false;
    playbackRef.current = [];
    playbackIndexRef.current = 0;
    obstaclesRef.current = obstaclePack.length ? obstaclePack : [];
    foodRef.current = randomFood(snakeRef.current, obstaclesRef.current);
    if (!obstaclePack.length) {
      obstaclesRef.current = generateObstacles(
        5,
        snakeRef.current,
        foodRef.current,
      );
    }
    setScore(0);
    setGameOver(false);
    setRunning(true);
    setSpeed(DEFAULT_SPEED);
    speedRef.current = DEFAULT_SPEED;
    recordingRef.current = [
      {
        snake: snakeRef.current.map((s) => ({
          x: s.x,
          y: s.y,
          scale: s.scale,
        })),
        food: { ...foodRef.current },
        obstacles: obstaclesRef.current.map((o) => ({ ...o })),
        score: 0,
      },
    ];
    draw();
  }, [draw, obstaclePack]);

  const startReplay = useCallback(
    (name) => {
      const data = loadReplay(name);
      if (!data) return;
      playbackRef.current = data.frames || [];
      playbackIndexRef.current = 0;
      playingRef.current = true;
      setWrap(data.wrap ?? false);
      setRunning(true);
      setGameOver(false);
      if (data.frames?.length) {
        const first = data.frames[0];
        snakeRef.current = first.snake.map((s) => ({ ...s }));
        obstaclesRef.current = first.obstacles.map((o) => ({ ...o }));
        foodRef.current = { ...first.food };
        setScore(first.score || 0);
      }
    },
    [loadReplay, setWrap],
  );

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
        <div className="mt-2 flex items-center space-x-2">
          <label htmlFor="speed">Speed</label>
          <input
            id="speed"
            type="range"
            min="50"
            max="300"
            step="10"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
        </div>
        <div className="mt-2 flex items-center space-x-2">
          <label htmlFor="replay">Replay</label>
          <select
            id="replay"
            className="bg-gray-700 rounded"
            value={selectedReplay}
            onChange={(e) => setSelectedReplay(e.target.value)}
          >
            <option value="">Select</option>
            {listReplays().map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={() => startReplay(selectedReplay)}
            disabled={!selectedReplay}
          >
            Play
          </button>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={() => {
              removeReplay(selectedReplay);
              setSelectedReplay('');
            }}
            disabled={!selectedReplay}
          >
            Delete
          </button>
        </div>
      </div>
    </GameLayout>
  );
};

export default Snake;
