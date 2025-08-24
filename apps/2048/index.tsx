// PixiJS-driven 2048 implementation with keyboard/swipe queue,
// score persistence, variable board size and worker based AI.
// The component relies on dynamic import (handled by createDynamicApp)
// so it only runs on the client.

'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import {
  initialState,
  isGameOver,
  createRng,
  Direction,
  GameState,
  Board,
  Rng,
} from './engine';

// colour mapping for tiles
const TILE_COLORS: Record<number, number> = {
  2: 0xeee4da,
  4: 0xede0c8,
  8: 0xf2b179,
  16: 0xf59563,
  32: 0xf67c5f,
  64: 0xf65e3b,
  128: 0xedcf72,
  256: 0xedcc61,
  512: 0xedc850,
  1024: 0xedc53f,
  2048: 0xedc22e,
};

interface MoveAnim {
  sprite: PIXI.Container;
  from: number;
  to: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  duration: number;
  merge: boolean;
  newValue?: number;
}

interface ScaleAnim {
  sprite: PIXI.Container;
  progress: number;
  duration: number;
  from: number;
  to: number;
}

// slide a row to the left while tracking tile movements
const slideTrack = (
  line: number[],
  row: number,
  size: number,
): { line: number[]; gained: number; mapping: { from: number; to: number; value: number; merge: boolean; newValue?: number }[] } => {
  const filtered = line
    .map((v, i) => ({ value: v, pos: row * size + i }))
    .filter((t) => t.value !== 0);
  const res = new Array(line.length).fill(0);
  const mapping: {
    from: number;
    to: number;
    value: number;
    merge: boolean;
    newValue?: number;
  }[] = [];
  let gained = 0;
  let target = 0;
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i].value === filtered[i + 1].value) {
      const merged = filtered[i].value * 2;
      gained += merged;
      res[target] = merged;
      mapping.push({
        from: filtered[i].pos,
        to: row * size + target,
        value: filtered[i].value,
        merge: true,
        newValue: merged,
      });
      mapping.push({
        from: filtered[i + 1].pos,
        to: row * size + target,
        value: filtered[i + 1].value,
        merge: true,
        newValue: merged,
      });
      i++;
    } else {
      res[target] = filtered[i].value;
      mapping.push({
        from: filtered[i].pos,
        to: row * size + target,
        value: filtered[i].value,
        merge: false,
      });
    }
    target++;
  }
  return { line: res, gained, mapping };
};

// compute board movement with animation mapping
const moveBoardTracked = (
  board: Board,
  dir: Direction,
): { board: Board; gained: number; mapping: MoveAnim[] } => {
  const size = Math.sqrt(board.length);
  let b = board.slice();
  const mapping: MoveAnim[] = [];
  let gained = 0;

  const rotations: Record<Direction, number> = { left: 0, up: 1, right: 2, down: 3 };
  const rotate = (bd: Board): Board => {
    const res = new Array(bd.length).fill(0);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        res[c * size + (size - 1 - r)] = bd[r * size + c];
      }
    }
    return res;
  };
  const rotateIdx = (idx: number): number => {
    const r = Math.floor(idx / size);
    const c = idx % size;
    return c * size + (size - 1 - r);
  };

  const times = rotations[dir];
  for (let i = 0; i < times; i++) b = rotate(b);

  for (let r = 0; r < size; r++) {
    const sliceStart = r * size;
    const { line, gained: g, mapping: map } = slideTrack(b.slice(sliceStart, sliceStart + size), r, size);
    b.splice(sliceStart, size, ...line);
    gained += g;
    map.forEach((m) =>
      mapping.push({
        sprite: undefined as unknown as PIXI.Container, // placeholder, filled later
        from: m.from,
        to: m.to,
        fromX: 0,
        fromY: 0,
        toX: 0,
        toY: 0,
        progress: 0,
        duration: 0,
        merge: m.merge,
        newValue: m.newValue,
      }),
    );
  }

  for (let i = 0; i < (4 - times) % 4; i++) b = rotate(b);
  const rotateIdxTimes = (idx: number, t: number): number => {
    let res = idx;
    for (let i = 0; i < t; i++) res = rotateIdx(res);
    return res;
  };
  mapping.forEach((m) => {
    m.from = rotateIdxTimes(m.from, 4 - times);
    m.to = rotateIdxTimes(m.to, 4 - times);
  });
  return { board: b, gained, mapping };
};

// spawn tile returning position
const spawnTileTracked = (
  board: Board,
  rng: Rng,
): { board: Board; index: number; value: number } => {
  const empty: number[] = [];
  board.forEach((v, i) => v === 0 && empty.push(i));
  if (!empty.length) return { board: board.slice(), index: -1, value: 0 };
  const idx = empty[Math.floor(rng() * empty.length)];
  const value = rng() < 0.9 ? 2 : 4;
  const newBoard = board.slice();
  newBoard[idx] = value;
  return { board: newBoard, index: idx, value };
};

const createTile = (value: number, x: number, y: number, size: number): PIXI.Container => {
  const cont = new PIXI.Container();
  const g = new PIXI.Graphics();
  g.roundRect(0, 0, size - 10, size - 10, 8).fill(TILE_COLORS[value] || 0xcdc1b4);
  const txt = new PIXI.Text(String(value), {
    fontFamily: 'sans-serif',
    fontSize: size / 3,
    fill: value <= 4 ? 0x776e65 : 0xf9f6f2,
    align: 'center',
  });
  txt.anchor.set(0.5);
  txt.position.set((size - 10) / 2, (size - 10) / 2);
  cont.addChild(g, txt);
  cont.position.set(x + 5, y + 5);
  return cont;
};

const Game2048: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application>();
  const tilesRef = useRef<PIXI.Container>();
  const spritesRef = useRef<Map<number, PIXI.Container>>(new Map());
  const moveAnims = useRef<MoveAnim[]>([]);
  const scaleAnims = useRef<ScaleAnim[]>([]);
  const spawnRef = useRef<{ index: number; value: number } | null>(null);
  const mergeTargets = useRef<Record<number, number>>({});
  const phaseRef = useRef<'idle' | 'moving' | 'scaling'>('idle');
  const inputRef = useRef<Direction[]>([]);
  const workerRef = useRef<Worker>();
  const aiPendingRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const [size, setSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('2048_size') || '4', 10);
    }
    return 4;
  });
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
    const rng = createRng(Date.now());
    return initialState(rng, size);
  });
  const [best, setBest] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('2048_best') || '0', 10);
    }
    return 0;
  });
  const [depth, setDepth] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('2048_depth') || '4', 10);
    }
    return 4;
  });
  const [speed, setSpeed] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('2048_speed') || '200', 10);
    }
    return 200;
  });
  const [auto, setAuto] = useState(false);
  const [announce, setAnnounce] = useState('');

  const rngRef = useRef<Rng>(createRng(Date.now()));

  useEffect(() => {
    rngRef.current = createRng(Date.now());
  }, []);

  // persist
  useEffect(() => {
    localStorage.setItem('2048_board', JSON.stringify(state.board));
    localStorage.setItem('2048_score', String(state.score));
    localStorage.setItem('2048_best', String(best));
    localStorage.setItem('2048_size', String(size));
  }, [state.board, state.score, best, size]);
  useEffect(() => {
    localStorage.setItem('2048_depth', String(depth));
    localStorage.setItem('2048_speed', String(speed));
  }, [depth, speed]);

  const cellSize = 100;

  // create pixi application on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const app = new PIXI.Application({
      width: size * cellSize,
      height: size * cellSize,
      background: 0xbbada0,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    });
    app.view.style.width = '100%';
    app.view.style.height = '100%';
    containerRef.current.appendChild(app.view as HTMLCanvasElement);
    const tiles = new PIXI.Container();
    app.stage.addChild(tiles);
    appRef.current = app;
    tilesRef.current = tiles;

    // initial render
    state.board.forEach((v, i) => {
      if (!v) return;
      const x = (i % size) * cellSize;
      const y = Math.floor(i / size) * cellSize;
      const tile = createTile(v, x, y, cellSize);
      tiles.addChild(tile);
      spritesRef.current.set(i, tile);
    });

    // ticker with fixed step
    let accumulator = 0;
    const step = 1000 / 60;
    const update = (delta: number) => {
      accumulator += delta;
      while (accumulator >= step) {
        gameStep(step);
        accumulator -= step;
      }
    };
    app.ticker.add((t) => update(t.deltaMS));

    return () => {
      app.destroy(true, { children: true });
      spritesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // handle size changes (reset)
  const reset = (n: number) => {
    setAuto(false);
    const rng = createRng(Date.now());
    rngRef.current = rng;
    const st = initialState(rng, n);
    setState(st);
    setBest((b) => Math.max(b, st.score));
    spritesRef.current.forEach((s) => s.destroy());
    spritesRef.current.clear();
    if (tilesRef.current) {
      tilesRef.current.removeChildren();
      st.board.forEach((v, i) => {
        if (!v) return;
        const x = (i % n) * cellSize;
        const y = Math.floor(i / n) * cellSize;
        const tile = createTile(v, x, y, cellSize);
        tilesRef.current!.addChild(tile);
        spritesRef.current.set(i, tile);
      });
    }
    appRef.current?.renderer.resize(n * cellSize, n * cellSize);
    phaseRef.current = 'idle';
    inputRef.current = [];
  };

  // AI worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./solver.worker.ts', import.meta.url));
    workerRef.current.onmessage = (e) => {
      aiPendingRef.current = false;
      inputRef.current.push(e.data as Direction);
    };
    return () => workerRef.current?.terminate();
  }, []);

  const requestAI = () => {
    if (aiPendingRef.current) return;
    aiPendingRef.current = true;
    workerRef.current?.postMessage({ board: state.board, depth, timeout: speed });
  };

  // keyboard / swipe
  useEffect(() => {
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
        inputRef.current.push(d);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = startRef.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > Math.abs(dy)) inputRef.current.push(dx > 0 ? 'right' : 'left');
    else inputRef.current.push(dy > 0 ? 'down' : 'up');
    startRef.current = null;
  };

  // main game step called at fixed rate
  const gameStep = (_dt: number) => {
    if (phaseRef.current === 'moving') {
      // update move animations
      moveAnims.current.forEach((a) => {
        a.progress += _dt;
        const p = Math.min(a.progress / a.duration, 1);
        a.sprite.position.set(
          a.fromX + (a.toX - a.fromX) * p,
          a.fromY + (a.toY - a.fromY) * p,
        );
      });
      const done = moveAnims.current.every((a) => a.progress >= a.duration);
      if (done) {
        // cleanup
        moveAnims.current.forEach((a) => {
          if (a.merge) {
            tilesRef.current?.removeChild(a.sprite);
            spritesRef.current.delete(a.from);
          } else {
            spritesRef.current.delete(a.from);
            spritesRef.current.set(a.to, a.sprite);
          }
        });
        moveAnims.current = [];

        // create merged sprites
        Object.entries(mergeTargets.current).forEach(([idx, val]) => {
          const index = Number(idx);
          const x = (index % size) * cellSize;
          const y = Math.floor(index / size) * cellSize;
          const sp = createTile(val, x, y, cellSize);
          sp.scale.set(0);
          tilesRef.current?.addChild(sp);
          spritesRef.current.set(index, sp);
          scaleAnims.current.push({ sprite: sp, progress: 0, duration: 100, from: 0, to: 1 });
        });
        mergeTargets.current = {};

        // spawn new tile
        if (spawnRef.current) {
          const { index, value } = spawnRef.current;
          const x = (index % size) * cellSize;
          const y = Math.floor(index / size) * cellSize;
          const sp = createTile(value, x, y, cellSize);
          sp.scale.set(0);
          tilesRef.current?.addChild(sp);
          spritesRef.current.set(index, sp);
          scaleAnims.current.push({ sprite: sp, progress: 0, duration: 100, from: 0, to: 1 });
          spawnRef.current = null;
        }
        phaseRef.current = 'scaling';
      }
    } else if (phaseRef.current === 'scaling') {
      scaleAnims.current.forEach((s) => {
        s.progress += _dt;
        const p = Math.min(s.progress / s.duration, 1);
        const val = s.from + (s.to - s.from) * p;
        s.sprite.scale.set(val);
      });
      const done = scaleAnims.current.every((s) => s.progress >= s.duration);
      if (done) {
        scaleAnims.current = [];
        phaseRef.current = 'idle';
      }
    } else if (phaseRef.current === 'idle') {
      if (inputRef.current.length) {
        const dir = inputRef.current.shift()!;
        performMove(dir);
      } else if (auto) {
        requestAI();
      }
    }
  };

  const performMove = (dir: Direction) => {
    const { board: moved, gained, mapping } = moveBoardTracked(state.board, dir);
    if (moved.every((v, i) => v === state.board[i])) return; // no change
    const { board: spawned, index, value } = spawnTileTracked(moved, rngRef.current);
    setState((s) => ({ ...s, board: spawned, score: s.score + gained }));
    if (state.score + gained > best) setBest(state.score + gained);
    if (gained > 0) setAnnounce(`+${gained}`);
    spawnRef.current = { index, value };
    const anims: MoveAnim[] = [];
    const merges: Record<number, number> = {};
    mapping.forEach((m) => {
      const sprite = spritesRef.current.get(m.from);
      if (!sprite) return;
      const fromX = sprite.x;
      const fromY = sprite.y;
      const toX = (m.to % size) * cellSize + 5;
      const toY = Math.floor(m.to / size) * cellSize + 5;
      anims.push({
        sprite,
        from: m.from,
        to: m.to,
        fromX,
        fromY,
        toX,
        toY,
        progress: 0,
        duration: 100,
        merge: m.merge,
        newValue: m.newValue,
      });
      if (m.merge && m.newValue) {
        merges[m.to] = m.newValue;
      }
    });
    mergeTargets.current = merges;
    moveAnims.current = anims;
    phaseRef.current = 'moving';
  };

  const changeSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const n = parseInt(e.target.value, 10);
    setSize(n);
    reset(n);
  };
  const changeDepth = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDepth(parseInt(e.target.value, 10));
  };
  const changeSpeed = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSpeed(parseInt(e.target.value, 10));
  };

  return (
    <div className="p-2 select-none">
      <div className="mb-2 flex justify-between">
        <div>Score: {state.score}</div>
        <div>Best: {best}</div>
      </div>
      <div className="mb-2 flex flex-wrap gap-2 text-sm">
        <label>
          Size
          <select value={size} onChange={changeSize} className="ml-2 border p-1">
            {[4, 5, 6].map((n) => (
              <option key={n} value={n}>{`${n}x${n}`}</option>
            ))}
          </select>
        </label>
        <label>
          Depth
          <select value={depth} onChange={changeDepth} className="ml-2 border p-1">
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Speed
          <select value={speed} onChange={changeSpeed} className="ml-2 border p-1">
            {[100, 200, 400].map((n) => (
              <option key={n} value={n}>{n}ms</option>
            ))}
          </select>
        </label>
        <button
          className="rounded bg-purple-500 px-2 py-1 text-white"
          onClick={() => setAuto((a) => !a)}
        >
          {auto ? 'Pause' : 'Auto'}
        </button>
      </div>
      <div
        ref={containerRef}
        className="mx-auto"
        style={{ width: '100%', maxWidth: size * cellSize, aspectRatio: '1 / 1' }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      />
      {isGameOver(state.board) && (
        <div className="mt-2 text-red-500">Game Over</div>
      )}
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </div>
  );
};

export default Game2048;

