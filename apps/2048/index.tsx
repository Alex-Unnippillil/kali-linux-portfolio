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

const size = 4;
const positions = Array.from({ length: size * size }, (_, i) => ({
  x: (i % size) * 100,
  y: Math.floor(i / size) * 100,
}));

const Tile: React.FC<{ value: number; index: number }> = ({ value, index }) => {
  const { x, y } = positions[index];
  return (
    <div
      className={`absolute flex items-center justify-center rounded bg-orange-200 text-xl font-bold transition-transform duration-150 ease-out ${
        value ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        width: 90,
        height: 90,
        transform: `translate(${x + 5}px, ${y + 5}px)`,
      }}
    >
      {value || ''}
    </div>
  );
};

const Game2048: React.FC = () => {
  const rngRef = useRef(createRng(dailySeed));
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
    return initialState(rngRef.current);
  });
  const [best, setBest] = useState(() => {
    if (typeof window !== 'undefined') {
      const b = parseInt(localStorage.getItem('2048_best') || '0', 10);
      return b;
    }
    return 0;
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
      if (state.score > best) {
        setBest(state.score);
        localStorage.setItem('2048_best', String(state.score));
      }
    }
  }, [state, best]);

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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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

  return (
    <div className="p-2 select-none">
      <div className="mb-2 flex justify-between">
        <div>Score: {state.score}</div>
        <div>Best: {best}</div>
      </div>
      <div
        className="relative h-[400px] w-[400px] bg-gray-300"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {state.board.map((v, i) => (
          <Tile key={i} value={v} index={i} />
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
      {isGameOver(state.board) && <div className="mt-2 text-red-500">Game Over</div>}
    </div>
  );
};

export default Game2048;
