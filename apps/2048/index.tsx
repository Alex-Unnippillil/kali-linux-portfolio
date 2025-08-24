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
  moveBoard,
  spawnTile,
  Rng,
  Board,
} from './engine';

const dailySeed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));

const Tile: React.FC<{ value: number; index: number; size: number; ghost?: boolean }> = ({
  value,
  index,
  size,
  ghost = false,
}) => {
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
      className={`absolute flex items-center justify-center rounded text-xl font-bold ${
        ghost ? 'bg-blue-200 opacity-50' : 'bg-orange-200'
      } ${value ? 'opacity-100' : 'opacity-0'}`}
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
  const rngRef = useRef<Rng>(createRng(seed));
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
  const [ghostPreview, setGhostPreview] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('2048_ghost') === '1';
    }
    return false;
  });
  const [ghostBoard, setGhostBoard] = useState<Board | null>(null);
  const [depth, setDepth] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('2048_depth') || '4', 10);
    }
    return 4;
  });
  const [auto, setAuto] = useState(false);
  const [nextDir, setNextDir] = useState<Direction | null>(null);
  const stateRef = useRef(state);
  const autoRef = useRef(auto);
  const depthRef = useRef(depth);
  const modeRef = useRef<'auto' | 'preview' | 'step' | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);
  useEffect(() => {
    depthRef.current = depth;
  }, [depth]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./solver.worker.ts', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const dir = e.data as Direction;
      if (modeRef.current === 'auto') {
        setState((s) => {
          const ns = move(s, dir, rngRef.current);
          if (!isGameOver(ns.board) && autoRef.current) {
            modeRef.current = 'auto';
            workerRef.current?.postMessage({
              board: ns.board,
              depth: depthRef.current,
              timeout: 200,
            });
          } else {
            autoRef.current = false;
            setAuto(false);
          }
          return ns;
        });
      } else if (modeRef.current === 'step') {
        setState((s) => move(s, dir, rngRef.current));
      } else if (modeRef.current === 'preview') {
        setNextDir(dir);
        const clone = createRng(rngRef.current.state());
        const { board: moved } = moveBoard(stateRef.current.board, dir);
        setGhostBoard(spawnTile(moved, clone));
      }
      modeRef.current = null;
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

  useEffect(() => {
    if (ghostPreview && !auto) {
      modeRef.current = 'preview';
      workerRef.current?.postMessage({
        board: state.board,
        depth: depthRef.current,
        timeout: 200,
      });
    } else {
      setGhostBoard(null);
      setNextDir(null);
    }
  }, [state.board, ghostPreview, auto, depth]);

  useEffect(() => {
    if (auto) {
      modeRef.current = 'auto';
      workerRef.current?.postMessage({
        board: state.board,
        depth: depthRef.current,
        timeout: 200,
      });
    }
  }, [auto, state.board, depth]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('2048_depth', String(depth));
      localStorage.setItem('2048_ghost', ghostPreview ? '1' : '0');
    }
  }, [depth, ghostPreview]);

  const handleMove = (dir: Direction) => {
    setState((s) => move(s, dir, rngRef.current));
    if (ghostPreview) setGhostBoard(null);
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
    modeRef.current = 'step';
    workerRef.current?.postMessage({
      board: state.board,
      depth: depthRef.current,
      timeout: 200,
    });
  };

  const reset = (n: number) => {
    const newSeed = dailySeed;
    setSeed(newSeed);
    rngRef.current = createRng(newSeed);
    setState(initialState(rngRef.current, n));
    setGhostBoard(null);
    setAuto(false);
  };

  const changeSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const n = parseInt(e.target.value, 10);
    setSize(n);
    reset(n);
  };

  const changeDepth = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDepth(parseInt(e.target.value, 10));
  };

  const toggleAuto = () => {
    setAuto((a) => {
      const na = !a;
      if (na) {
        setGhostPreview(false);
        setGhostBoard(null);
      }
      return na;
    });
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
      <div className="mb-2 flex flex-wrap gap-2">
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
        <label>
          Depth
          <select value={depth} onChange={changeDepth} className="ml-2 border p-1">
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={ghostPreview}
            onChange={(e) => setGhostPreview(e.target.checked)}
          />
          Ghost
        </label>
        <button className="rounded bg-purple-500 px-2 py-1 text-white" onClick={toggleAuto}>
          {auto ? 'Pause' : 'Auto'}
        </button>
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
        {ghostPreview && ghostBoard &&
          ghostBoard.map((v, i) => (
            <Tile key={`g${i}`} value={v} index={i} size={size} ghost />
          ))}
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
      {ghostPreview && nextDir && <div className="mt-2 text-sm">Next: {nextDir}</div>}
      {achievements.length > 0 && (
        <div className="mt-2 text-sm">Achieved: {achievements.join(', ')}</div>
      )}
      {isGameOver(state.board) && <div className="mt-2 text-red-500">Game Over</div>}
    </div>
  );
};

export default Game2048;
