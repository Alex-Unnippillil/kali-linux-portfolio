import React, { useEffect, useRef, useState } from 'react';
import {
  initialState,
  move,
  undo,
  redo,
  isGameOver,
  createRng,
  GameState,
  Direction,
} from './engine';

const dailySeed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));

const Tile: React.FC<{ value: number; index: number; size: number }> = ({ value, index, size }) => {
  const ref = useRef<HTMLDivElement>(null);
  const cell = 100;
  const x = (index % size) * cell;
  const y = Math.floor(index / size) * cell;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const startX = parseFloat(el.dataset.x || String(x));
    const startY = parseFloat(el.dataset.y || String(y));
    const dx = x - startX;
    const dy = y - startY;
    let start: number | null = null;
    const duration = 150;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      const cx = startX + dx * p;
      const cy = startY + dy * p;
      el.style.transform = `translate(${cx + 5}px, ${cy + 5}px)`;
      if (p < 1) requestAnimationFrame(step);
      else {
        el.dataset.x = String(x);
        el.dataset.y = String(y);
      }
    };
    requestAnimationFrame(step);
  }, [x, y]);
  return (
    <div
      ref={ref}
      className={`absolute flex items-center justify-center rounded bg-orange-200 text-xl font-bold ${
        value ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ width: 90, height: 90 }}
    >
      {value || ''}
    </div>
  );
};

const Game2048: React.FC = () => {
  const [size, setSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('2048_size') || '4', 10);
    }
    return 4;
  });
  const [seed, setSeed] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('2048_seed') || String(dailySeed), 10);
    }
    return dailySeed;
  });
  const rngRef = useRef(createRng(seed));
  const [state, setState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('2048_board');
        const score = parseInt(localStorage.getItem('2048_score') || '0', 10);
        if (saved) {
          return { board: JSON.parse(saved), score, history: [], future: [] };
        }
      } catch {
        /* ignore */
      }
    }
    return initialState(rngRef.current, size);
  });
  const [best, setBest] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('2048_best') || '0', 10);
    }
    return 0;
  });
  const [achievements, setAchievements] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('2048_achievements') || '[]');
      } catch {
        return [];
      }
    }
    return [];
  });
  const workerRef = useRef<Worker>();
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./solver.worker.ts', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const dir = e.data as Direction;
      setState((s) => move(s, dir, rngRef.current));
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('2048_board', JSON.stringify(state.board));
      localStorage.setItem('2048_score', String(state.score));
      localStorage.setItem('2048_best', String(best));
      localStorage.setItem('2048_size', String(size));
      localStorage.setItem('2048_seed', String(seed));
      localStorage.setItem('2048_achievements', JSON.stringify(achievements));
    }
  }, [state, best, size, seed, achievements]);

  useEffect(() => {
    if (state.score > best) setBest(state.score);
    const maxTile = Math.max(...state.board);
    const thresholds = [128, 256, 512, 1024, 2048, 4096];
    const newAch = thresholds.filter((t) => maxTile >= t && !achievements.includes(t));
    if (newAch.length) setAchievements((a) => [...a, ...newAch]);
  }, [state, best, achievements]);

  const handleMove = (dir: Direction) => {
    setState((s) => move(s, dir, rngRef.current));
  };

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    };
    const d = map[e.key];
    if (d) {
      e.preventDefault();
      handleMove(d);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = startRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
    startRef.current = null;
  };

  const solver = () => {
    workerRef.current?.postMessage({ board: state.board, depth: 4, timeout: 200 });
  };

  const reset = (n: number) => {
    const newSeed = dailySeed;
    setSeed(newSeed);
    rngRef.current = createRng(newSeed);
    setState(initialState(rngRef.current, n));
  };

  const changeSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const n = parseInt(e.target.value, 10);
    setSize(n);
    reset(n);
  };

  const share = () => {
    const data = {
      size,
      seed,
      moves: state.history.map((h) => h.move).filter(Boolean),
    };
    const encoded = btoa(JSON.stringify(data));
    navigator.clipboard?.writeText(encoded);
  };

  return (
    <div className="p-2 select-none">
      <div className="mb-2 flex justify-between">
        <div>Score: {state.score}</div>
        <div>Best: {best}</div>
      </div>
      <div className="mb-2 flex gap-2">
        <label>
          Size
          <select value={size} onChange={changeSize} className="ml-2 border p-1">
            {[3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}x{n}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded bg-green-500 px-2 py-1 text-white" onClick={share}>
          Share
        </button>
      </div>
      <div
        className="relative bg-gray-300"
        style={{ width: size * 100, height: size * 100 }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {state.board.map((v, i) => (
          <Tile key={i} value={v} index={i} size={size} />
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button className="rounded bg-blue-500 px-2 py-1 text-white" onClick={() => setState(undo)}>
          Undo
        </button>
        <button className="rounded bg-blue-500 px-2 py-1 text-white" onClick={() => setState(redo)}>
          Redo
        </button>
        <button className="rounded bg-green-500 px-2 py-1 text-white" onClick={solver}>
          Solver
        </button>
      </div>
      {achievements.length > 0 && (
        <div className="mt-2 text-sm">Achieved: {achievements.join(', ')}</div>
      )}
      {isGameOver(state.board) && <div className="mt-2 text-red-500">Game Over</div>}
    </div>
  );
};

export default Game2048;
