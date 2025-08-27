import React, { useRef, useState, useEffect, useCallback } from 'react';
import GameLayout from './GameLayout';
import usePersistentState from '../../hooks/usePersistentState';

const SIZE = 4;
const TILE = 80;
const ANIM = 200;

const COLORS = {
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
};

const createEmptyGrid = () =>
  Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

const addRandomTile = (grid) => {
  const empty = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
};

const initialGrid = () => {
  const g = createEmptyGrid();
  addRandomTile(g);
  addRandomTile(g);
  return g;
};

const lerp = (a, b, t) => a + (b - a) * t;

const drawEmpty = (ctx, x, y) => {
  ctx.fillStyle = '#3b3b3b';
  ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
};

const drawTile = (ctx, x, y, value) => {
  ctx.fillStyle = COLORS[value] || '#3c3a32';
  ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
  ctx.fillStyle = value <= 4 ? '#776e65' : '#f9f6f2';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), x + TILE / 2, y + TILE / 2);
};

const rotateGrid = (grid) => {
  const res = createEmptyGrid();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      res[c][SIZE - 1 - r] = grid[r][c];
    }
  }
  return res;
};

const rotateCoords = (x, y) => ({ x: y, y: SIZE - 1 - x });

function move(grid, dir) {
  const rotations = { left: 0, up: 1, right: 2, down: 3 }[dir];
  let g = grid.map((row) => row.slice());
  for (let i = 0; i < rotations; i++) g = rotateGrid(g);
  const newGrid = createEmptyGrid();
  let moved = false;
  let gain = 0;
  const animations = [];
  for (let r = 0; r < SIZE; r++) {
    let target = 0;
    let lastMerge = -1;
    for (let c = 0; c < SIZE; c++) {
      const val = g[r][c];
      if (!val) continue;
      if (target > 0 && newGrid[r][target - 1] === val && lastMerge !== target - 1) {
        newGrid[r][target - 1] = val * 2;
        gain += val * 2;
        lastMerge = target - 1;
        animations.push({ fromX: c, fromY: r, toX: target - 1, toY: r, value: val * 2 });
        if (c !== target - 1) moved = true;
      } else {
        newGrid[r][target] = val;
        animations.push({ fromX: c, fromY: r, toX: target, toY: r, value: val });
        if (c !== target) moved = true;
        target++;
      }
    }
  }
  let result = newGrid;
  for (let i = 0; i < (4 - rotations) % 4; i++) result = rotateGrid(result);
  const rotatedAnimations = animations.map((a) => {
    let { fromX, fromY } = a;
    let { toX, toY } = a;
    for (let i = 0; i < (4 - rotations) % 4; i++) {
      ({ x: fromX, y: fromY } = rotateCoords(fromX, fromY));
      ({ x: toX, y: toY } = rotateCoords(toX, toY));
    }
    return { fromX, fromY, toX, toY, value: a.value };
  });
  return { grid: result, animations: rotatedAnimations, score: gain, moved };
}

const Game2048 = () => {
  const canvasRef = useRef(null);
  const [grid, setGrid] = useState(initialGrid);
  const gridRef = useRef(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  const [score, setScore] = useState(0);
  const [best, setBest] = usePersistentState('2048-best', 0, (v) => typeof v === 'number');
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const animationsRef = useRef([]);
  const audioCtxRef = useRef(null);

  const playSound = useCallback(() => {
    if (!sound) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 300;
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // ignore
    }
  }, [sound]);

  const reset = useCallback(() => {
    const g = initialGrid();
    setGrid(g);
    gridRef.current = g;
    setScore(0);
    setPaused(false);
    animationsRef.current = [];
  }, []);

  const handleMove = useCallback(
    (dir) => {
      if (paused) return;
      const { grid: g, animations, score: gain, moved } = move(gridRef.current, dir);
      if (!moved) return;
      addRandomTile(g);
      animationsRef.current.push(
        ...animations.map((a) => ({ ...a, start: performance.now() }))
      );
      setGrid(g.map((row) => row.slice()));
      if (gain > 0) {
        playSound();
        setScore((s) => {
          const n = s + gain;
          if (n > best) setBest(n);
          return n;
        });
      }
    },
    [paused, playSound, best, setBest]
  );

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') handleMove('left');
      else if (e.key === 'ArrowRight') handleMove('right');
      else if (e.key === 'ArrowUp') handleMove('up');
      else if (e.key === 'ArrowDown') handleMove('down');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleMove]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = TILE * SIZE;
    canvas.width = size;
    canvas.height = size;

    const render = (time) => {
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, size, size);

      const animTargets = new Set(
        animationsRef.current.map((a) => `${a.toX}-${a.toY}`)
      );
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const val = gridRef.current[r][c];
          if (val && !animTargets.has(`${c}-${r}`))
            drawTile(ctx, c * TILE, r * TILE, val);
          else drawEmpty(ctx, c * TILE, r * TILE);
        }
      }

      if (!paused) {
        animationsRef.current = animationsRef.current.filter((a) => {
          const progress = Math.min(1, (time - a.start) / ANIM);
          const x = lerp(a.fromX, a.toX, progress) * TILE;
          const y = lerp(a.fromY, a.toY, progress) * TILE;
          drawTile(ctx, x, y, a.value);
          return progress < 1;
        });
      } else {
        animationsRef.current.forEach((a) =>
          drawTile(ctx, a.toX * TILE, a.toY * TILE, a.value)
        );
      }

      requestAnimationFrame(render);
    };
    let frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [paused]);

  return (
    <GameLayout gameId="2048">
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none">
        <div className="mb-2 flex space-x-2 items-center">
          <span>Score: {score}</span>
          <span>Best: {best}</span>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={reset}
          >
            Reset
          </button>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={() => setSound((s) => !s)}
          >
            {sound ? 'Sound Off' : 'Sound On'}
          </button>
        </div>
        <canvas ref={canvasRef} className="bg-gray-900" />
      </div>
    </GameLayout>
  );
};

export default Game2048;

