'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactGA from 'react-ga4';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { getDailySeed } from '../../utils/dailySeed';

const SIZE = 4;

const createMulberry32 = (seed: number) => {
  let state = seed;
  return {
    next: () => {
      let t = (state += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    getState: () => state,
    setState: (value: number) => {
      state = value;
    },
  };
};

const hashSeed = (str: string): number => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return h >>> 0;
};

type Direction = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

type TileState = {
  id: number;
  value: number;
  row: number;
  col: number;
  prevRow: number;
  prevCol: number;
  mergeKey?: string | null;
  mergeResult?: number;
  isNew?: boolean;
};

type UndoSnapshot = {
  tiles: TileState[];
  moves: string[];
  highest: number;
  won: boolean;
  lost: boolean;
  timer: number;
  rngState: number;
};

type Vector = { row: number; col: number };

type PendingFinalize = {
  tilesAfterMerge: TileState[];
  mergedTiles: TileState[];
  newTile: TileState | null;
  finalBoard: number[][];
  mergeKeys: string[];
  direction: Direction;
  spawnKey: string | null;
};

const directionVectors: Record<Direction, Vector> = {
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
};

const withinBounds = (row: number, col: number) => row >= 0 && row < SIZE && col >= 0 && col < SIZE;

const buildGridFromTiles = (tiles: TileState[]): (TileState | null)[][] => {
  const grid: (TileState | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  tiles.forEach((tile) => {
    if (withinBounds(tile.row, tile.col)) {
      grid[tile.row][tile.col] = tile;
    }
  });
  return grid;
};

const buildTraversals = (vector: Vector) => {
  const rows = [...Array(SIZE).keys()];
  const cols = [...Array(SIZE).keys()];
  if (vector.row === 1) rows.reverse();
  if (vector.col === 1) cols.reverse();
  return { rows, cols };
};

const findFarthestPosition = (
  start: { row: number; col: number },
  vector: Vector,
  grid: (TileState | null)[][]
) => {
  let previous = start;
  let next = { row: start.row + vector.row, col: start.col + vector.col };
  while (withinBounds(next.row, next.col) && !grid[next.row][next.col]) {
    previous = next;
    next = { row: next.row + vector.row, col: next.col + vector.col };
  }
  return { farthest: previous, next };
};

const tilesToBoard = (tiles: TileState[]): number[][] => {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  tiles.forEach((tile) => {
    if (withinBounds(tile.row, tile.col)) {
      board[tile.row][tile.col] = tile.value;
    }
  });
  return board;
};

const hasMoves = (board: number[][]) => {
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === 0) return true;
      if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
};

const checkHighest = (board: number[][]) => {
  let m = 0;
  board.forEach((row) =>
    row.forEach((value) => {
      if (value > m) m = value;
    })
  );
  return m;
};

const tileColors: Record<number, string> = {
  2: 'bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,var(--kali-control)_8%)] text-[var(--kali-text)]',
  4: 'bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,var(--kali-control)_12%)] text-[var(--kali-text)]',
  8: 'bg-[color:color-mix(in_srgb,var(--color-warning)_45%,var(--kali-panel))] text-[var(--kali-text)]',
  16: 'bg-[color:color-mix(in_srgb,var(--color-warning)_55%,var(--kali-panel))] text-[var(--kali-text)]',
  32: 'bg-[color:color-mix(in_srgb,var(--color-warning)_65%,var(--kali-panel))] text-[var(--kali-text)]',
  64: 'bg-[color:color-mix(in_srgb,var(--color-warning)_75%,var(--kali-panel))] text-[var(--kali-text)]',
  128: 'bg-[color:color-mix(in_srgb,var(--color-info)_55%,var(--kali-panel))] text-[var(--kali-text)]',
  256: 'bg-[color:color-mix(in_srgb,var(--color-info)_65%,var(--kali-panel))] text-[var(--kali-text)]',
  512: 'bg-[color:color-mix(in_srgb,var(--color-info)_75%,var(--kali-panel))] text-[var(--kali-text)]',
  1024: 'bg-[color:color-mix(in_srgb,var(--game-color-success)_60%,var(--kali-panel))] text-[var(--kali-text)]',
  2048: 'bg-[color:color-mix(in_srgb,var(--game-color-success)_72%,var(--kali-panel))] text-[var(--kali-text)]',
  4096: 'bg-[color:color-mix(in_srgb,var(--color-control-accent)_75%,var(--kali-panel))] text-[var(--kali-text)]',
};

const DB_NAME = '2048';
const STORE_NAME = 'replays';

const saveReplay = (replay: any) => {
  if (typeof indexedDB === 'undefined') return;
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    }
  };
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(replay);
  };
};

const Page2048 = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [moves, setMoves] = useState<string[]>([]);
  const [highest, setHighest] = useState(0);
  const [boardType, setBoardType] = useState<'classic' | 'hex'>('classic');
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [hard, setHard] = useState(false);
  const [timer, setTimer] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mergeHighlights, setMergeHighlights] = useState<string[]>([]);
  const mergeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [spawnHighlight, setSpawnHighlight] = useState<string | null>(null);
  const spawnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rngRef = useRef(createMulberry32(0));
  const seedRef = useRef(0);
  const tileIdRef = useRef(0);
  const [animationProgress, setAnimationProgress] = useState(1);
  const animationFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const pendingFinalizeRef = useRef<PendingFinalize | null>(null);
  const [undoState, setUndoState] = useState<UndoSnapshot | null>(null);
  const [highScore, setHighScore] = useState(0);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState({ size: 0, gap: 0, step: 0 });

  const updateMetrics = useCallback(() => {
    if (typeof window === 'undefined') return;
    const container = boardRef.current;
    if (!container) return;
    const styles = window.getComputedStyle(container);
    const gapValue = styles.columnGap || styles.gap || '0';
    const gap = parseFloat(gapValue) || 0;
    const width = container.clientWidth;
    const size = width > 0 ? (width - gap * (SIZE - 1)) / SIZE : 0;
    const step = size + gap;
    setMetrics((prev) => {
      if (Math.abs(prev.size - size) < 0.5 && Math.abs(prev.gap - gap) < 0.5) {
        return prev;
      }
      return { size, gap, step };
    });
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    updateMetrics();
    const handleResize = () => updateMetrics();
    window.addEventListener('resize', handleResize);
    let observer: ResizeObserver | null = null;
    if ('ResizeObserver' in window && boardRef.current) {
      observer = new ResizeObserver(() => updateMetrics());
      observer.observe(boardRef.current);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, [updateMetrics]);

  const cancelAnimationFrameIfNeeded = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const seedStr = await getDailySeed('2048');
      const seed = hashSeed(seedStr);
      const rand = createMulberry32(seed);
      const first = (() => {
        const value = rand.next() < 0.9 ? 2 : 4;
        const row = Math.floor(rand.next() * SIZE);
        const col = Math.floor(rand.next() * SIZE);
        return { value, row, col };
      })();
      const taken = new Set<string>();
      const spawnFromSet = () => {
        const empty: [number, number][] = [];
        for (let r = 0; r < SIZE; r += 1) {
          for (let c = 0; c < SIZE; c += 1) {
            const key = `${r}-${c}`;
            if (!taken.has(key)) empty.push([r, c]);
          }
        }
        if (!empty.length) return null;
        const [row, col] = empty[Math.floor(rand.next() * empty.length)];
        taken.add(`${row}-${col}`);
        return { row, col, value: rand.next() < 0.9 ? 2 : 4 };
      };
      taken.add(`${first.row}-${first.col}`);
      const second = spawnFromSet();
      const startingTiles = [first, second].filter(Boolean) as { row: number; col: number; value: number }[];
      const preparedTiles = startingTiles.map((tile) => ({
        id: tileIdRef.current++,
        value: tile.value,
        row: tile.row,
        col: tile.col,
        prevRow: tile.row,
        prevCol: tile.col,
        isNew: true,
      }));
      if (!mounted) return;
      setTiles(preparedTiles);
      const board = tilesToBoard(preparedTiles);
      setHighest(checkHighest(board));
      rngRef.current = rand;
      seedRef.current = seed;
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('2048-high-score');
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (!Number.isNaN(parsed)) setHighScore(parsed);
    }
  }, []);

  useEffect(() => () => cancelAnimationFrameIfNeeded(), [cancelAnimationFrameIfNeeded]);

  const resetTimer = useCallback(() => {
    if (!hard) return;
    setTimer(3);
  }, [hard]);

  useEffect(() => {
    if (!hard) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((value) => {
        if (value <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setLost(true);
          saveReplay({ date: new Date().toISOString(), moves, boardType, hard });
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hard, moves, boardType]);

  useEffect(() => {
    if (mergeTimeoutRef.current) clearTimeout(mergeTimeoutRef.current);
    if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
    return () => {
      if (mergeTimeoutRef.current) clearTimeout(mergeTimeoutRef.current);
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
    };
  }, []);

  const startAnimation = useCallback(
    (onComplete: () => void) => {
      if (prefersReducedMotion) {
        setAnimationProgress(1);
        onComplete();
        return;
      }
      cancelAnimationFrameIfNeeded();
      const duration = 160;
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        setAnimationProgress(progress);
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(step);
        } else {
          animationFrameRef.current = null;
          onComplete();
        }
      };
      setAnimationProgress(0);
      animationFrameRef.current = requestAnimationFrame(step);
    },
    [prefersReducedMotion, cancelAnimationFrameIfNeeded]
  );

  const finalizeMove = useCallback(() => {
    const pending = pendingFinalizeRef.current;
    if (!pending) {
      isAnimatingRef.current = false;
      return;
    }
    const { tilesAfterMerge, mergedTiles, newTile, finalBoard, mergeKeys, direction, spawnKey } = pending;
    let nextTiles = [
      ...tilesAfterMerge.map((tile) => ({
        ...tile,
        prevRow: tile.row,
        prevCol: tile.col,
        mergeKey: null,
        mergeResult: undefined,
        isNew: tile.isNew,
      })),
      ...mergedTiles.map((tile) => ({
        ...tile,
        prevRow: tile.row,
        prevCol: tile.col,
        mergeKey: null,
        mergeResult: undefined,
        isNew: false,
      })),
    ];
    if (newTile) {
      nextTiles = [
        ...nextTiles,
        {
          ...newTile,
          prevRow: newTile.row,
          prevCol: newTile.col,
          mergeKey: null,
          mergeResult: undefined,
          isNew: true,
        },
      ];
    }
    setTiles(nextTiles);
    setAnimationProgress(1);
    setMoves((m) => [...m, direction]);
    const newHighest = checkHighest(finalBoard);
    setHighest((prev) => (newHighest > prev ? newHighest : prev));
    const finalScore = finalBoard.flat().reduce((sum, value) => sum + value, 0);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('2048-high-score', String(finalScore));
      }
    }
    if (mergeKeys.length) {
      setMergeHighlights(mergeKeys);
      if (mergeTimeoutRef.current) clearTimeout(mergeTimeoutRef.current);
      mergeTimeoutRef.current = setTimeout(() => setMergeHighlights([]), prefersReducedMotion ? 600 : 350);
    }
    if (spawnKey) {
      setSpawnHighlight(spawnKey);
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
      spawnTimeoutRef.current = setTimeout(() => setSpawnHighlight(null), prefersReducedMotion ? 600 : 350);
    }
    if (!won && (newHighest === 2048 || newHighest === 4096)) {
      ReactGA.event('post_score', { score: newHighest, board: boardType });
    }
    if (newHighest >= 2048) {
      setWon(true);
      setLost(false);
    } else if (!hasMoves(finalBoard)) {
      setLost(true);
    } else {
      setLost(false);
    }
    resetTimer();
    isAnimatingRef.current = false;
    pendingFinalizeRef.current = null;
  }, [boardType, highScore, prefersReducedMotion, resetTimer, won]);

  const spawnRandomTile = useCallback(
    (tilesForSpawn: TileState[]) => {
      const occupied = new Set<string>();
      tilesForSpawn.forEach((tile) => occupied.add(`${tile.row}-${tile.col}`));
      const empty: [number, number][] = [];
      for (let r = 0; r < SIZE; r += 1) {
        for (let c = 0; c < SIZE; c += 1) {
          const key = `${r}-${c}`;
          if (!occupied.has(key)) empty.push([r, c]);
        }
      }
      if (!empty.length) return null;
      const [row, col] = empty[Math.floor(rngRef.current.next() * empty.length)];
      const value = rngRef.current.next() < 0.9 ? 2 : 4;
      return {
        id: tileIdRef.current++,
        value,
        row,
        col,
        prevRow: row,
        prevCol: col,
        mergeKey: null,
        mergeResult: undefined,
        isNew: true,
      } satisfies TileState;
    },
    []
  );

  const createUndoSnapshot = useCallback((): UndoSnapshot => ({
    tiles: tiles.map((tile) => ({
      ...tile,
      prevRow: tile.row,
      prevCol: tile.col,
      mergeKey: null,
      mergeResult: undefined,
      isNew: tile.isNew,
    })),
    moves: [...moves],
    highest,
    won,
    lost,
    timer,
    rngState: rngRef.current.getState(),
  }), [tiles, moves, highest, won, lost, timer]);

  const handleMove = useCallback(
    (direction: Direction) => {
      if (won || lost || isAnimatingRef.current || !tiles.length) return;
      const vector = directionVectors[direction];
      const workingTiles = tiles.map((tile) => ({
        ...tile,
        prevRow: tile.row,
        prevCol: tile.col,
        mergeKey: null,
        mergeResult: undefined,
        isNew: false,
      }));
      const grid = buildGridFromTiles(workingTiles);
      const traversals = buildTraversals(vector);
      const removalIds = new Set<number>();
      const mergeInfos: { key: string; value: number }[] = [];
      let moved = false;

      traversals.rows.forEach((row) => {
        traversals.cols.forEach((col) => {
          const tile = grid[row][col];
          if (!tile) return;
          if (tile.mergeKey) return;
          const { farthest, next } = findFarthestPosition({ row, col }, vector, grid);
          const nextTile = withinBounds(next.row, next.col) ? grid[next.row][next.col] : null;

          if (nextTile && nextTile.value === tile.value && !nextTile.mergeKey) {
            const key = `${next.row}-${next.col}`;
            tile.row = next.row;
            tile.col = next.col;
            tile.mergeKey = key;
            tile.mergeResult = tile.value * 2;
            nextTile.mergeKey = key;
            nextTile.mergeResult = tile.value * 2;
            removalIds.add(tile.id);
            removalIds.add(nextTile.id);
            grid[row][col] = null;
            grid[next.row][next.col] = tile;
            mergeInfos.push({ key, value: tile.value * 2 });
          } else {
            grid[row][col] = null;
            grid[farthest.row][farthest.col] = tile;
            tile.row = farthest.row;
            tile.col = farthest.col;
          }

          if (tile.row !== tile.prevRow || tile.col !== tile.prevCol) moved = true;
        });
      });

      if (!moved) return;

      const undoSnapshot = createUndoSnapshot();
      setUndoState(undoSnapshot);

      if (mergeTimeoutRef.current) {
        clearTimeout(mergeTimeoutRef.current);
        mergeTimeoutRef.current = null;
      }
      if (spawnTimeoutRef.current) {
        clearTimeout(spawnTimeoutRef.current);
        spawnTimeoutRef.current = null;
      }
      setMergeHighlights([]);
      setSpawnHighlight(null);

      setTiles(workingTiles);
      isAnimatingRef.current = true;

      const tilesAfterMerge = workingTiles
        .filter((tile) => !removalIds.has(tile.id))
        .map((tile) => ({
          ...tile,
          prevRow: tile.row,
          prevCol: tile.col,
          mergeKey: null,
          mergeResult: undefined,
        }));

      const mergedTiles = mergeInfos.map((info) => {
        const [row, col] = info.key.split('-').map(Number);
        return {
          id: tileIdRef.current++,
          value: info.value,
          row,
          col,
          prevRow: row,
          prevCol: col,
          mergeKey: null,
          mergeResult: undefined,
          isNew: false,
        } satisfies TileState;
      });

      const tilesForSpawn = [...tilesAfterMerge, ...mergedTiles];
      const newTile = spawnRandomTile(tilesForSpawn);
      if (newTile) tilesForSpawn.push(newTile);
      const finalBoard = tilesToBoard(tilesForSpawn);

      pendingFinalizeRef.current = {
        tilesAfterMerge,
        mergedTiles,
        newTile: newTile || null,
        finalBoard,
        mergeKeys: mergeInfos.map((info) => info.key),
        direction,
        spawnKey: newTile ? `${newTile.row}-${newTile.col}` : null,
      };

      startAnimation(finalizeMove);
    },
    [tiles, won, lost, createUndoSnapshot, spawnRandomTile, finalizeMove, startAnimation]
  );

  const handleUndo = useCallback(() => {
    if (!undoState || isAnimatingRef.current) return;
    cancelAnimationFrameIfNeeded();
    isAnimatingRef.current = false;
    setAnimationProgress(1);
    if (mergeTimeoutRef.current) {
      clearTimeout(mergeTimeoutRef.current);
      mergeTimeoutRef.current = null;
    }
    if (spawnTimeoutRef.current) {
      clearTimeout(spawnTimeoutRef.current);
      spawnTimeoutRef.current = null;
    }
    setMergeHighlights([]);
    setSpawnHighlight(null);
    pendingFinalizeRef.current = null;
    setTiles(
      undoState.tiles.map((tile) => ({
        ...tile,
        prevRow: tile.row,
        prevCol: tile.col,
        mergeKey: null,
        mergeResult: undefined,
      }))
    );
    setMoves(undoState.moves);
    setHighest(undoState.highest);
    setWon(undoState.won);
    setLost(undoState.lost);
    setTimer(undoState.timer);
    rngRef.current.setState(undoState.rngState);
    setUndoState(null);
  }, [undoState, cancelAnimationFrameIfNeeded]);

  const restart = useCallback(() => {
    cancelAnimationFrameIfNeeded();
    isAnimatingRef.current = false;
    const rand = createMulberry32(seedRef.current);
    rngRef.current = rand;
    const freshTiles: TileState[] = [];
    const spawn = () => {
      const occupied = new Set<string>();
      freshTiles.forEach((tile) => occupied.add(`${tile.row}-${tile.col}`));
      const empty: [number, number][] = [];
      for (let r = 0; r < SIZE; r += 1) {
        for (let c = 0; c < SIZE; c += 1) {
          const key = `${r}-${c}`;
          if (!occupied.has(key)) empty.push([r, c]);
        }
      }
      if (!empty.length) return;
      const [row, col] = empty[Math.floor(rand.next() * empty.length)];
      const value = rand.next() < 0.9 ? 2 : 4;
      freshTiles.push({
        id: tileIdRef.current++,
        value,
        row,
        col,
        prevRow: row,
        prevCol: col,
        mergeKey: null,
        mergeResult: undefined,
        isNew: true,
      });
    };
    spawn();
    spawn();
    setTiles(freshTiles);
    setMoves([]);
    setUndoState(null);
    setWon(false);
    setLost(false);
    setHighest(checkHighest(tilesToBoard(freshTiles)));
    setAnimationProgress(1);
    setMergeHighlights([]);
    setSpawnHighlight(null);
    if (mergeTimeoutRef.current) clearTimeout(mergeTimeoutRef.current);
    if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
    pendingFinalizeRef.current = null;
    setTimer(3);
    resetTimer();
  }, [resetTimer, cancelAnimationFrameIfNeeded]);

  useEffect(() => {
    if (won || lost) {
      saveReplay({ date: new Date().toISOString(), moves, boardType, hard });
      fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: '2048',
          username: 'Anonymous',
          score: highest,
        }),
      }).catch(() => {
        // ignore network errors
      });
    }
  }, [won, lost, moves, boardType, hard, highest]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        handleMove(event.key as Direction);
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        restart();
        return;
      }
      if (['u', 'U', 'Backspace'].includes(event.key)) {
        event.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleMove, restart, handleUndo]);

  const close = () => {
    if (typeof document !== 'undefined') {
      document.getElementById('close-2048')?.click();
    }
  };

  const displayCell = (value: number) => {
    if (boardType === 'hex') return value.toString(16).toUpperCase();
    return value;
  };

  const renderTileStyles = (key: string, tileValue: number, isNew?: boolean) => {
    const isMerged = mergeHighlights.includes(key);
    const isSpawned = spawnHighlight === key || isNew;
    const emphasisBase = isMerged
      ? 'ring-2 ring-[color:color-mix(in_srgb,var(--color-warning)_70%,transparent)] ring-offset-2 ring-offset-[color:var(--kali-bg)]'
      : isSpawned
        ? 'ring-2 ring-[color:color-mix(in_srgb,var(--color-control-accent)_70%,transparent)] ring-offset-2 ring-offset-[color:var(--kali-bg)]'
        : '';
    const motionStyles = prefersReducedMotion
      ? ''
      : isMerged
        ? 'scale-105'
        : isSpawned
          ? 'scale-110'
          : '';
    return [
      'absolute rounded-lg font-semibold flex items-center justify-center text-2xl md:text-3xl transition-colors will-change-transform',
      prefersReducedMotion ? '' : 'transition-transform duration-200 ease-out',
      emphasisBase,
      motionStyles,
      tileValue ? '' : 'text-[color:color-mix(in_srgb,var(--kali-text)_45%,transparent)]',
    ]
      .filter(Boolean)
      .join(' ');
  };

  const currentScore = useMemo(() => tiles.reduce((sum, tile) => sum + tile.value, 0), [tiles]);

  return (
    <div className="h-full w-full overflow-auto bg-[var(--kali-bg)] text-[var(--kali-text)]">
      <main className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--kali-text)]">2048</h1>
            <p className="text-sm text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
              Merge tiles to hit 2048. Hard mode adds a countdown after each move.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] px-3 py-2 text-right">
              <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">Best Tile</div>
              <div className="text-lg font-semibold text-[var(--kali-text)]">{highest || 0}</div>
            </div>
            <div className="rounded-lg bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] px-3 py-2 text-right">
              <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">Score</div>
              <div className="text-lg font-semibold text-[var(--kali-text)]">{currentScore}</div>
            </div>
            <div className="rounded-lg bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] px-3 py-2 text-right">
              <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">High Score</div>
              <div className="text-lg font-semibold text-[var(--kali-text)]">{highScore}</div>
            </div>
            <div className="rounded-lg bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] px-3 py-2 text-right">
              <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">Moves</div>
              <div className="text-lg font-semibold text-[var(--kali-text)]">{moves.length}</div>
            </div>
            {hard && (
              <div className="rounded-lg bg-[color:color-mix(in_srgb,var(--color-warning)_35%,var(--kali-panel))] px-3 py-2 text-right">
                <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--color-warning)_70%,var(--kali-text))]">Countdown</div>
                <div className="text-lg font-semibold text-[color:color-mix(in_srgb,var(--color-warning)_80%,var(--kali-text))]">{timer}</div>
              </div>
            )}
          </div>
        </header>
        <section aria-label="Game controls" className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-[color:color-mix(in_srgb,var(--kali-control)_24%,var(--kali-panel))] px-4 py-2 text-sm font-medium text-[var(--kali-text)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--kali-control)_32%,var(--kali-panel))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            onClick={restart}
          >
            Restart
          </button>
          <button
            className="rounded-md bg-[color:color-mix(in_srgb,var(--kali-control)_24%,var(--kali-panel))] px-4 py-2 text-sm font-medium text-[var(--kali-text)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--kali-control)_32%,var(--kali-panel))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            onClick={handleUndo}
          >
            Undo
          </button>
          <div className="flex items-center gap-2 rounded-md bg-[color:color-mix(in_srgb,var(--kali-panel)_80%,transparent)] px-3 py-2 text-sm text-[var(--kali-text)]">
            <input
              type="checkbox"
              checked={hard}
              onChange={(event) => {
                setHard(event.target.checked);
                setTimer(3);
              }}
              className="h-4 w-4 rounded border-[color:color-mix(in_srgb,var(--kali-control)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_65%,transparent)] text-[color:var(--color-control-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
              id="hard-mode-toggle"
              aria-label="Enable hard mode"
            />
            <label htmlFor="hard-mode-toggle" className="cursor-pointer select-none">
              Hard mode
            </label>
          </div>
          <select
            className="rounded-md border border-[color:color-mix(in_srgb,var(--kali-control)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,transparent)] px-3 py-2 text-sm font-medium text-[var(--kali-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            value={boardType}
            onChange={(event) => setBoardType(event.target.value as 'classic' | 'hex')}
            aria-label="Tile notation"
          >
            <option value="classic">Classic</option>
            <option value="hex">Hex 2048</option>
          </select>
          <button
            className="rounded-md bg-[color:color-mix(in_srgb,var(--kali-control)_24%,var(--kali-panel))] px-4 py-2 text-sm font-medium text-[var(--kali-text)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--kali-control)_32%,var(--kali-panel))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            onClick={close}
          >
            Close
          </button>
        </section>
        <section
          aria-label="2048 board"
          className="mx-auto w-full max-w-lg rounded-2xl bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] p-3 shadow-inner"
        >
          <div className="relative">
            <div ref={boardRef} className="grid grid-cols-4 gap-3">
              {Array.from({ length: SIZE * SIZE }).map((_, index) => (
                <div
                  key={`cell-${index}`}
                  className="aspect-square w-full rounded-xl bg-[color:color-mix(in_srgb,var(--kali-panel)_55%,transparent)]"
                />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-3">
              {tiles.map((tile) => {
                if (tile.value === 0) return null;
                const key = `${tile.row}-${tile.col}`;
                const className = renderTileStyles(key, tile.value, tile.isNew);
                const { size, step } = metrics;
                const tileSize = size || 0;
                const stepSize = step || 0;
                const top = stepSize ? tile.row * stepSize : 0;
                const left = stepSize ? tile.col * stepSize : 0;
                const deltaRow = tile.prevRow - tile.row;
                const deltaCol = tile.prevCol - tile.col;
                const translateY = stepSize * deltaRow * (1 - animationProgress);
                const translateX = stepSize * deltaCol * (1 - animationProgress);
                return (
                  <div
                    key={tile.id}
                    className={`${className} ${
                      tileColors[tile.value] ||
                      'bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,var(--kali-control)_18%)] text-[var(--kali-text)]'
                    }`}
                    style={{
                      width: tileSize || '100%',
                      height: tileSize || '100%',
                      top,
                      left,
                      transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
                    }}
                  >
                    {displayCell(tile.value)}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        {(won || lost) && (
          <div
            className={`rounded-xl border px-4 py-3 text-base font-semibold shadow-lg ${
              won
                ? 'border-[color:color-mix(in_srgb,var(--game-color-success)_65%,transparent)] bg-[color:color-mix(in_srgb,var(--game-color-success)_22%,var(--kali-panel))] text-[color:color-mix(in_srgb,var(--game-color-success)_75%,var(--kali-text))]'
                : 'border-[color:color-mix(in_srgb,var(--game-color-danger)_65%,transparent)] bg-[color:color-mix(in_srgb,var(--game-color-danger)_22%,var(--kali-panel))] text-[color:color-mix(in_srgb,var(--game-color-danger)_75%,var(--kali-text))]'
            }`}
            role="status"
            aria-live="polite"
          >
            {won
              ? 'You win! Keep playing to chase a higher tile.'
              : 'Game over. Restart to try the daily board again.'}
          </div>
        )}
      </main>
    </div>
  );
};

export default Page2048;
