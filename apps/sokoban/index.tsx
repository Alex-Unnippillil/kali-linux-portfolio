import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logEvent, logGameStart, logGameEnd, logGameError } from '../../utils/analytics';
import { consumeGameKey, shouldHandleGameKey } from '../../utils/gameInput';
import { LEVEL_PACKS, LevelPack, parseLevels } from './levels';
import {
  loadLevel,
  move,
  undo as undoMove,
  redo as redoMove,
  reset as resetLevel,
  reachable,
  isSolved,
  State,
  directionKeys,
  findHint,
  findMinPushes,
  findSolution,
  wouldDeadlock,
  isDeadlockPosition,
  Position,
  DirectionKey,
} from './engine';

const CELL = 32;

const LEVEL_THUMB_CELL = 8;

const LevelThumb: React.FC<{ level: string[] }> = ({ level }) => {
  const width = Math.max(...level.map((r) => r.length));
  const height = level.length;
  const tileStyle = { width: LEVEL_THUMB_CELL, height: LEVEL_THUMB_CELL } as React.CSSProperties;
  return (
    <div
      className="relative rounded border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] shadow-md"
      style={{ width: width * LEVEL_THUMB_CELL, height: height * LEVEL_THUMB_CELL }}
    >
      {level.map((row, y) =>
        row.split('').map((cell, x) => {
          const k = `${x},${y}`;
          const isWall = cell === '#';
          const isTarget = cell === '.' || cell === '+' || cell === '*';
          return (
            <div
              key={`t-${k}`}
              className={`absolute border ${
                isWall
                  ? 'border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)]'
                  : 'border-[color:color-mix(in_srgb,var(--kali-control)_20%,transparent)] bg-[color:var(--kali-control-surface)]'
              } ${
                isTarget
                  ? 'ring-1 ring-[color:color-mix(in_srgb,var(--kali-control)_70%,transparent)]'
                  : ''
              } shadow-inner`}
              style={{ ...tileStyle, left: x * LEVEL_THUMB_CELL, top: y * LEVEL_THUMB_CELL }}
            />
          );
        })
      )}
      {level.map((row, y) =>
        row.split('').map((cell, x) => {
          const k = `${x},${y}`;
          if (cell === '$' || cell === '*') {
            return (
              <div
                key={`b-${k}`}
                className="absolute bg-[color:var(--color-warning)]"
                style={{ ...tileStyle, left: x * LEVEL_THUMB_CELL, top: y * LEVEL_THUMB_CELL }}
              />
            );
          }
          if (cell === '@' || cell === '+') {
            return (
              <div
                key={`p-${k}`}
                className="absolute bg-[color:var(--kali-control)]"
                style={{ ...tileStyle, left: x * LEVEL_THUMB_CELL, top: y * LEVEL_THUMB_CELL }}
              />
            );
          }
          return null;
        })
      )}
    </div>
  );
};

interface SokobanProps {
  getDailySeed?: () => Promise<string>;
  windowMeta?: { isFocused?: boolean };
}

type ProgressEntry = {
  player: Position;
  boxes: string[];
  moves: number;
  pushes: number;
};

type StoredProgress = {
  player: Position;
  boxes: string[];
  moves: number;
  pushes: number;
  history: ProgressEntry[];
  future: ProgressEntry[];
};

const progressKey = (pack: number, level: number) => `sokoban-progress-${pack}-${level}`;

const isProgressEntry = (value: unknown): value is ProgressEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as ProgressEntry;
  return (
    entry.player !== undefined &&
    typeof entry.player.x === 'number' &&
    typeof entry.player.y === 'number' &&
    Array.isArray(entry.boxes) &&
    entry.boxes.every((b) => typeof b === 'string') &&
    typeof entry.moves === 'number' &&
    typeof entry.pushes === 'number'
  );
};

const isValidProgress = (value: unknown): value is StoredProgress => {
  if (!value || typeof value !== 'object') return false;
  const data = value as StoredProgress;
  return (
    data.player !== undefined &&
    typeof data.player.x === 'number' &&
    typeof data.player.y === 'number' &&
    Array.isArray(data.boxes) &&
    data.boxes.every((b) => typeof b === 'string') &&
    typeof data.moves === 'number' &&
    typeof data.pushes === 'number' &&
    Array.isArray(data.history) &&
    data.history.every(isProgressEntry) &&
    Array.isArray(data.future) &&
    data.future.every(isProgressEntry)
  );
};

const serializeProgress = (state: State): StoredProgress => ({
  player: state.player,
  boxes: Array.from(state.boxes),
  moves: state.moves,
  pushes: state.pushes,
  history: state.history.map((entry) => ({
    player: entry.player,
    boxes: entry.boxes,
    moves: entry.moves,
    pushes: entry.pushes,
  })),
  future: state.future.map((entry) => ({
    player: entry.player,
    boxes: entry.boxes,
    moves: entry.moves,
    pushes: entry.pushes,
  })),
});

const restoreProgress = (base: State, data: StoredProgress): State => {
  const restored: State = {
    ...base,
    player: { ...data.player },
    boxes: new Set(data.boxes),
    moves: data.moves,
    pushes: data.pushes,
    history: data.history.map((entry) => ({
      player: { ...entry.player },
      boxes: [...entry.boxes],
      moves: entry.moves,
      pushes: entry.pushes,
    })),
    future: data.future.map((entry) => ({
      player: { ...entry.player },
      boxes: [...entry.boxes],
      moves: entry.moves,
      pushes: entry.pushes,
    })),
    deadlocks: new Set(),
  };
  const deadlocks = new Set<string>();
  restored.boxes.forEach((b) => {
    const [x, y] = b.split(',').map(Number);
    if (isDeadlockPosition(restored, { x, y })) deadlocks.add(b);
  });
  restored.deadlocks = deadlocks;
  return restored;
};

const Sokoban: React.FC<SokobanProps> = ({ getDailySeed, windowMeta }) => {
  void getDailySeed;
  const isFocused = windowMeta?.isFocused ?? true;
  const [packs, setPacks] = useState<LevelPack[]>(LEVEL_PACKS);
  const [packIndex, setPackIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const currentPack = packs[packIndex];
  const [state, setState] = useState<State>(() => loadLevel(currentPack.levels[0]));
  const [reach, setReach] = useState<Set<string>>(reachable(loadLevel(currentPack.levels[0])));
  const [best, setBest] = useState<number | null>(null);
  const [hint, setHint] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [ghost, setGhost] = useState<Set<string>>(new Set());
  const [solutionPath, setSolutionPath] = useState<Set<string>>(new Set());
  const [puffs, setPuffs] = useState<{ id: number; x: number; y: number }[]>([]);
  const puffId = React.useRef(0);
  const [lastPush, setLastPush] = useState<string | null>(null);
  const [showLevels, setShowLevels] = useState(false);
  const [minPushes, setMinPushes] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<{ moves: number; pushes: number }>({
    moves: 0,
    pushes: 0,
  });
  const [autoMode, setAutoMode] = useState<'walk' | 'solve' | null>(null);
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);
  const initRef = useRef(false);
  const stateRef = useRef(state);
  const packIndexRef = useRef(packIndex);
  const indexRef = useRef(index);
  const packsRef = useRef(packs);
  const warnDirRef = useRef<DirectionKey | null>(null);
  const autoplayRef = useRef<{
    mode: 'walk' | 'solve';
    moves: DirectionKey[];
    index: number;
    timer: number | null;
  } | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    packIndexRef.current = packIndex;
  }, [packIndex]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    packsRef.current = packs;
  }, [packs]);

  const clearAutoplay = useCallback(() => {
    const active = autoplayRef.current;
    if (!active) return false;
    if (active.timer) {
      window.clearTimeout(active.timer);
    }
    autoplayRef.current = null;
    setAutoMode(null);
    setStatus('');
    return true;
  }, []);

  const loadProgressState = useCallback(
    (levelIndex: number, packIdx: number, packData: LevelPack[] = packsRef.current) => {
      const pack = packData[packIdx];
      const base = loadLevel(pack.levels[levelIndex]);
      try {
        const stored = localStorage.getItem(progressKey(packIdx, levelIndex));
        if (stored) {
          const parsed = JSON.parse(stored);
          if (isValidProgress(parsed)) {
            return restoreProgress(base, parsed);
          }
        }
      } catch {
        // ignore storage errors
      }
      return base;
    },
    []
  );

  const persistProgress = useCallback((nextState: State) => {
    if (isSolved(nextState)) return;
    try {
      const key = progressKey(packIndexRef.current, indexRef.current);
      localStorage.setItem(key, JSON.stringify(serializeProgress(nextState)));
    } catch {
      // ignore storage errors
    }
  }, []);

  const clearProgress = useCallback(() => {
    try {
      const key = progressKey(packIndexRef.current, indexRef.current);
      localStorage.removeItem(key);
    } catch {
      // ignore storage errors
    }
  }, []);

  const registerPushEffects = useCallback((prevState: State, nextState: State) => {
    if (nextState.pushes <= prevState.pushes) return;
    const from = Array.from(prevState.boxes).find((b) => !nextState.boxes.has(b));
    const to = Array.from(nextState.boxes).find((b) => !prevState.boxes.has(b));
    if (from) {
      const [fx, fy] = from.split(',').map(Number);
      const id = puffId.current++;
      setPuffs((p) => [...p, { id, x: fx, y: fy }]);
      setTimeout(() => setPuffs((p) => p.filter((pp) => pp.id !== id)), 300);
    }
    if (to) {
      setLastPush(to);
      setTimeout(() => setLastPush(null), 200);
    }
    logEvent({ category: 'sokoban', action: 'push' });
  }, []);

  const handleSolved = useCallback(
    (nextState: State) => {
      logGameEnd('sokoban', `level_complete`);
      logEvent({
        category: 'sokoban',
        action: 'level_complete',
        value: nextState.pushes,
      });
      const bestKey = `sokoban-best-${packIndexRef.current}-${indexRef.current}`;
      const prevBest = localStorage.getItem(bestKey);
      if (!prevBest || nextState.pushes < Number(prevBest)) {
        localStorage.setItem(bestKey, String(nextState.pushes));
        setBest(nextState.pushes);
      }
      clearProgress();
      setStats({ moves: nextState.moves, pushes: nextState.pushes });
      setShowStats(true);
      clearAutoplay();
    },
    [clearAutoplay, clearProgress]
  );

  const applyNextState = useCallback(
    (prevState: State, nextState: State) => {
      setState(nextState);
      setReach(reachable(nextState));
      setHint('');
      setStatus(nextState.deadlocks.size ? 'Deadlock!' : '');
      setGhost(new Set());
      setSolutionPath(new Set());
      setShowStats(false);
      warnDirRef.current = null;
      registerPushEffects(prevState, nextState);
      if (isSolved(nextState)) {
        setStatus('');
        handleSolved(nextState);
      }
    },
    [handleSolved, registerPushEffects]
  );

  const resetCurrentLevel = useCallback(() => {
    clearAutoplay();
    const pack = packsRef.current[packIndexRef.current];
    const lvl = indexRef.current;
    const st = resetLevel(pack.levels[lvl]);
    setState(st);
    setReach(reachable(st));
    setHint('');
    setStatus('');
    setGhost(new Set());
    setSolutionPath(new Set());
    setShowStats(false);
    setMinPushes(null);
    setTimeout(() => setMinPushes(findMinPushes(st)), 0);
    warnDirRef.current = null;
  }, [clearAutoplay]);

  const undoCurrentMove = useCallback(() => {
    clearAutoplay();
    const current = stateRef.current;
    const st = undoMove(current);
    if (st !== current) {
      setState(st);
      setReach(reachable(st));
      setHint('');
      setStatus(st.deadlocks.size ? 'Deadlock!' : '');
      setGhost(new Set());
      setSolutionPath(new Set());
      setShowStats(false);
      warnDirRef.current = null;
      logEvent({ category: 'sokoban', action: 'undo' });
    }
  }, [clearAutoplay]);

  const redoCurrentMove = useCallback(() => {
    clearAutoplay();
    const current = stateRef.current;
    const st = redoMove(current);
    if (st !== current) {
      setState(st);
      setReach(reachable(st));
      setHint('');
      setStatus(st.deadlocks.size ? 'Deadlock!' : '');
      setGhost(new Set());
      setSolutionPath(new Set());
      setShowStats(false);
      warnDirRef.current = null;
      logEvent({ category: 'sokoban', action: 'redo' });
    }
  }, [clearAutoplay]);

  const handleDirectionalInput = useCallback(
    (dir: DirectionKey, { suppressWarning = false } = {}) => {
      const current = stateRef.current;
      if (!suppressWarning) {
        if (warnDirRef.current && warnDirRef.current !== dir) {
          warnDirRef.current = null;
          setStatus('');
        }
        if (warnDirRef.current === dir) {
          warnDirRef.current = null;
          setStatus('');
        } else if (wouldDeadlock(current, dir)) {
          setStatus('Deadlock ahead! Press again to confirm.');
          warnDirRef.current = dir;
          return;
        }
      } else {
        warnDirRef.current = null;
      }
      const nextState = move(current, dir);
      if (nextState === current) return;
      applyNextState(current, nextState);
    },
    [applyNextState]
  );

  const directionFromDelta = useCallback((dx: number, dy: number): DirectionKey | null => {
    if (dx === 0 && dy === -1) return 'ArrowUp';
    if (dx === 0 && dy === 1) return 'ArrowDown';
    if (dx === -1 && dy === 0) return 'ArrowLeft';
    if (dx === 1 && dy === 0) return 'ArrowRight';
    return null;
  }, []);

  const startAutoplay = useCallback(
    (moves: DirectionKey[], mode: 'walk' | 'solve') => {
      clearAutoplay();
      if (!moves.length) return;
      autoplayRef.current = {
        mode,
        moves,
        index: 0,
        timer: null,
      };
      setAutoMode(mode);
      setStatus(mode === 'solve' ? 'Solving...' : 'Walking...');
      const step = () => {
        const active = autoplayRef.current;
        if (!active) return;
        const current = stateRef.current;
        const dir = active.moves[active.index];
        if (!dir) {
          clearAutoplay();
          return;
        }
        const nextState = move(current, dir);
        if (nextState === current) {
          clearAutoplay();
          return;
        }
        if (active.mode === 'walk' && nextState.pushes > current.pushes) {
          clearAutoplay();
          return;
        }
        applyNextState(current, nextState);
        if (!autoplayRef.current) return;
        active.index += 1;
        if (active.index >= active.moves.length) {
          clearAutoplay();
          return;
        }
        active.timer = window.setTimeout(step, 60);
      };
      step();
    },
    [applyNextState, clearAutoplay]
  );

  const selectLevel = useCallback(
    (i: number, pIdx: number = packIndex, pData: LevelPack[] = packs) => {
      const pack = pData[pIdx];
      clearAutoplay();
      const st = loadProgressState(i, pIdx, pData);
      setPackIndex(pIdx);
      setIndex(i);
      setState(st);
      setReach(reachable(st));
      setHint('');
      setStatus('');
      setGhost(new Set());
      setSolutionPath(new Set());
      setShowStats(false);
      setMinPushes(null);
      setTimeout(() => setMinPushes(findMinPushes(st)), 0);
      warnDirRef.current = null;
      logGameStart('sokoban');
      logEvent({ category: 'sokoban', action: 'level_select', value: i });
    },
    [clearAutoplay, loadProgressState, packIndex, packs]
  );

  const selectPack = useCallback(
    (pIdx: number) => {
      selectLevel(0, pIdx);
    },
    [selectLevel]
  );

  const handleUndo = useCallback(() => {
    undoCurrentMove();
  }, [undoCurrentMove]);

  const handleRedo = useCallback(() => {
    redoCurrentMove();
  }, [redoCurrentMove]);

  const handleReset = useCallback(() => {
    resetCurrentLevel();
  }, [resetCurrentLevel]);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        const file = e.target.files?.[0];
        if (!file) return;
        clearAutoplay();
        const text = await file.text();
        const lvl = parseLevels(text);
        if (lvl.length) {
          const customPack: LevelPack = {
            name: file.name || 'Custom',
            difficulty: 'Custom',
            levels: lvl,
          };
          const newPacks = [...LEVEL_PACKS, customPack];
          setPacks(newPacks);
          selectLevel(0, newPacks.length - 1, newPacks);
        }
      } catch (err: unknown) {
        logGameError('sokoban', err instanceof Error ? err.message : String(err));
      }
    },
    [clearAutoplay, selectLevel]
  );

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    logGameStart('sokoban');
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        let text = decodeURIComponent(code);
        let parsed = parseLevels(text);
        if (!parsed.length) {
          try {
            parsed = parseLevels(atob(text));
          } catch {
            parsed = [];
          }
        }
        if (parsed.length) {
          const customPack: LevelPack = { name: 'Custom', difficulty: 'Custom', levels: parsed };
          const newPacks = [...LEVEL_PACKS, customPack];
          setPacks(newPacks);
          const st = loadProgressState(0, newPacks.length - 1, newPacks);
          setPackIndex(newPacks.length - 1);
          setIndex(0);
          setState(st);
          setReach(reachable(st));
          setMinPushes(null);
          setTimeout(() => setMinPushes(findMinPushes(st)), 0);
        }
      }
      if (!code) {
        const st = loadProgressState(indexRef.current, packIndexRef.current);
        setState(st);
        setReach(reachable(st));
        setMinPushes(null);
        setTimeout(() => setMinPushes(findMinPushes(st)), 0);
      }
    } catch (err: unknown) {
      logGameError('sokoban', err instanceof Error ? err.message : String(err));
    }
  }, [loadProgressState]);

  useEffect(() => {
    const k = `sokoban-best-${packIndex}-${index}`;
    const b = localStorage.getItem(k);
    setBest(b ? Number(b) : null);
  }, [index, packIndex]);

  useEffect(() => {
    persistProgress(state);
  }, [persistProgress, state]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!shouldHandleGameKey(e, { isFocused })) return;
      if (e.key === 'Escape') {
        if (clearAutoplay()) {
          consumeGameKey(e);
        }
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        consumeGameKey(e);
        handleReset();
        return;
      }
      if (['u', 'U', 'z', 'Z', 'Backspace'].includes(e.key)) {
        consumeGameKey(e);
        handleUndo();
        return;
      }
      if (['y', 'Y'].includes(e.key)) {
        consumeGameKey(e);
        handleRedo();
        return;
      }
      if (['h', 'H'].includes(e.key)) {
        consumeGameKey(e);
        handleHint();
        return;
      }
      if (['p', 'P'].includes(e.key)) {
        consumeGameKey(e);
        handlePreview();
        return;
      }
      if (!directionKeys.includes(e.key as DirectionKey)) return;
      consumeGameKey(e);
      clearAutoplay();
      handleDirectionalInput(e.key as DirectionKey);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    clearAutoplay,
    handleDirectionalInput,
    handleHint,
    handlePreview,
    handleRedo,
    handleReset,
    handleUndo,
    isFocused,
  ]);

  const handleHint = useCallback(() => {
    clearAutoplay();
    setHint('...');
    setTimeout(() => {
      const dir = findHint(stateRef.current);
      setHint(dir ? dir.replace('Arrow', '') : 'No hint');
    }, 0);
  }, [clearAutoplay]);
  
  const keyPos = useCallback((p: Position) => `${p.x},${p.y}`, []);

  const handlePreview = useCallback(() => {
    clearAutoplay();
    setSolutionPath(new Set());
    setStatus('...');
    setTimeout(() => {
      const sol = findSolution(stateRef.current);
      if (!sol) {
        setStatus('No solution');
        return;
      }
      const positions: string[] = [];
      let st = stateRef.current;
      sol.forEach((dir) => {
        st = move(st, dir);
        positions.push(keyPos(st.player));
      });
      setSolutionPath(new Set(positions));
      setStatus('');
    }, 0);
  }, [clearAutoplay, keyPos]);

  const handleSolve = useCallback(() => {
    clearAutoplay();
    setSolutionPath(new Set());
    const sol = findSolution(stateRef.current);
    if (!sol || !sol.length) {
      setStatus('No solution');
      return;
    }
    startAutoplay(sol, 'solve');
  }, [clearAutoplay, startAutoplay]);

  const cellStyle = useMemo(
    () => ({ width: CELL, height: CELL } as React.CSSProperties),
    []
  );

  useEffect(() => {
    if (!boardWrapperRef.current) return;

    const updateScale = () => {
      const el = boardWrapperRef.current;
      if (!el) return;
      const baseWidth = state.width * CELL;
      const baseHeight = state.height * CELL;
      if (!baseWidth || !baseHeight) {
        setBoardScale(1);
        return;
      }
      const availableWidth = el.clientWidth;
      let nextScale = availableWidth ? Math.min(1, availableWidth / baseWidth) : 1;
      if (typeof window !== 'undefined') {
        const rect = el.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 160;
        if (availableHeight > 0) {
          nextScale = Math.min(nextScale, availableHeight / baseHeight);
        }
      }
      setBoardScale(nextScale > 0 && Number.isFinite(nextScale) ? nextScale : 1);
    };

    updateScale();
    const Observer = typeof ResizeObserver !== 'undefined' ? ResizeObserver : null;
    const observer = Observer ? new Observer(updateScale) : null;
    if (observer && boardWrapperRef.current) {
      observer.observe(boardWrapperRef.current);
    }
    const handleResize = () => updateScale();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }
    return () => {
      observer?.disconnect();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [state.width, state.height]);

  const findPath = useCallback((target: Position, current: State): string[] => {
    const start = current.player;
    const q: Position[] = [start];
    const prev = new Map<string, string | null>();
    prev.set(keyPos(start), null);
    while (q.length) {
      const cur = q.shift()!;
      if (cur.x === target.x && cur.y === target.y) {
        const path: string[] = [];
        let k = keyPos(cur);
        while (prev.get(k)) {
          path.push(k);
          k = prev.get(k)!;
        }
        return path.reverse();
      }
      const dirs = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
      ];
      for (const d of dirs) {
        const n = { x: cur.x + d.x, y: cur.y + d.y };
        const k = keyPos(n);
        if (prev.has(k)) continue;
        if (
          n.x < 0 ||
          n.y < 0 ||
          n.x >= current.width ||
          n.y >= current.height ||
          current.walls.has(k) ||
          current.boxes.has(k)
        )
          continue;
        prev.set(k, keyPos(cur));
        q.push(n);
      }
    }
    return [];
  }, [keyPos]);

  const handleHover = useCallback(
    (x: number, y: number) => {
      const k = `${x},${y}`;
      if (!reach.has(k) || state.walls.has(k) || state.boxes.has(k)) {
        setGhost(new Set());
        return;
      }
      const path = findPath({ x, y }, state);
      setGhost(new Set(path));
    },
    [findPath, reach, state]
  );

  const handleTileClick = useCallback(
    (x: number, y: number) => {
      const current = stateRef.current;
      const k = `${x},${y}`;
      if (!reach.has(k) || current.walls.has(k) || current.boxes.has(k)) {
        return;
      }
      const path = findPath({ x, y }, current);
      if (!path.length) return;
      const directions: DirectionKey[] = [];
      let prev = current.player;
      path.forEach((pos) => {
        const [px, py] = pos.split(',').map(Number);
        const dir = directionFromDelta(px - prev.x, py - prev.y);
        if (dir) directions.push(dir);
        prev = { x: px, y: py };
      });
      if (!directions.length) return;
      startAutoplay(directions, 'walk');
    },
    [directionFromDelta, findPath, reach, startAutoplay]
  );

  const baseBoardWidth = state.width * CELL;
  const baseBoardHeight = state.height * CELL;
  const scaledBoardWidth = Math.round(baseBoardWidth * boardScale);
  const scaledBoardHeight = Math.round(baseBoardHeight * boardScale);

  const packSelectId = React.useId();
  const levelSelectId = React.useId();
  const importInputId = React.useId();

  return (
    <div className="select-none space-y-4 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <label
            htmlFor={packSelectId}
            className="flex flex-col text-xs text-[color:color-mix(in_srgb,var(--kali-text)_72%,transparent)]"
          >
            <span className="font-semibold uppercase tracking-wide text-[color:var(--kali-text)]">Pack</span>
            <select
              id={packSelectId}
              value={packIndex}
              onChange={(e) => selectPack(Number(e.target.value))}
              className="mt-1 rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-surface)] px-2 py-1 text-sm text-[color:var(--kali-text)] shadow-sm transition focus:border-[color:var(--kali-control)] focus:outline-none focus:ring-2 focus:ring-[color:var(--kali-control)] focus:ring-offset-2 focus:ring-offset-[var(--kali-bg)]"
            >
              {packs.map((p, i) => (
                <option key={p.name} value={i}>{`${p.name} (${p.difficulty})`}</option>
              ))}
            </select>
          </label>
          <label
            htmlFor={levelSelectId}
            className="flex flex-col text-xs text-[color:color-mix(in_srgb,var(--kali-text)_72%,transparent)]"
          >
            <span className="font-semibold uppercase tracking-wide text-[color:var(--kali-text)]">Level</span>
            <select
              id={levelSelectId}
              value={index}
              onChange={(e) => selectLevel(Number(e.target.value))}
              className="mt-1 rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-surface)] px-2 py-1 text-sm text-[color:var(--kali-text)] shadow-sm transition focus:border-[color:var(--kali-control)] focus:outline-none focus:ring-2 focus:ring-[color:var(--kali-control)] focus:ring-offset-2 focus:ring-offset-[var(--kali-bg)]"
            >
              {currentPack.levels.map((_, i) => (
                <option key={i} value={i}>{`Level ${i + 1}`}</option>
              ))}
            </select>
          </label>
          <label
            htmlFor={importInputId}
            className="flex flex-col text-xs text-[color:color-mix(in_srgb,var(--kali-text)_72%,transparent)]"
          >
            <span className="font-semibold uppercase tracking-wide text-[color:var(--kali-text)]">Import</span>
            <input
              id={importInputId}
              type="file"
              accept=".txt,.sas"
              onChange={handleFile}
              aria-label="Import custom levels"
              className="mt-1 cursor-pointer text-sm text-[color:color-mix(in_srgb,var(--kali-text)_85%,transparent)]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowLevels(true)}
              className="rounded bg-kali-control px-3 py-1 text-sm font-semibold text-slate-900 shadow transition hover:bg-[color:color-mix(in_srgb,var(--color-control-accent)_85%,#000000)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
            >
              Levels
            </button>
            <button
              type="button"
              onClick={handleHint}
              aria-label="Hint"
              className="rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-control-overlay)] px-3 py-1 text-sm font-semibold text-[color:var(--kali-control)] shadow transition hover:bg-[color:var(--kali-control-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
            >
              Hint
            </button>
            <button
              type="button"
              onClick={handlePreview}
              aria-label="Preview solution path"
              className="rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-control-overlay)] px-3 py-1 text-sm font-semibold text-[color:var(--kali-control)] shadow transition hover:bg-[color:var(--kali-control-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={handleSolve}
              aria-label="Solve level"
              disabled={autoMode === 'solve'}
              className={`rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-control-overlay)] px-3 py-1 text-sm font-semibold text-[color:var(--kali-control)] shadow transition hover:bg-[color:var(--kali-control-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
                autoMode === 'solve' ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              {autoMode === 'solve' ? 'Solving...' : 'Solve'}
            </button>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 text-sm text-[color:var(--kali-text)]">
          <div className="flex flex-wrap gap-2">
            <span className="rounded border border-[color:var(--kali-panel-border)]/60 bg-[color:color-mix(in_srgb,var(--kali-panel)_70%,transparent)] px-3 py-1 shadow-sm">
              Moves: {state.moves}
            </span>
            <span className="rounded border border-[color:var(--kali-panel-border)]/60 bg-[color:color-mix(in_srgb,var(--kali-panel)_70%,transparent)] px-3 py-1 shadow-sm">
              Pushes: {state.pushes}
            </span>
            <span className="rounded border border-[color:var(--kali-panel-border)]/60 bg-[color:color-mix(in_srgb,var(--kali-panel)_70%,transparent)] px-3 py-1 shadow-sm">
              Best: {best ?? '-'}
            </span>
            <span className="rounded border border-[color:var(--kali-panel-border)]/60 bg-[color:color-mix(in_srgb,var(--kali-panel)_70%,transparent)] px-3 py-1 shadow-sm">
              Min: {minPushes ?? '-'}
            </span>
          </div>
          {hint && <div className="text-xs text-[color:var(--color-info)]">Hint: {hint}</div>}
          {status && <div className="text-xs text-[color:var(--color-error)]">{status}</div>}
        </div>
      </div>
      <div ref={boardWrapperRef} className="w-full">
        <div className="mx-auto flex justify-center">
          <div className="relative" style={{ width: scaledBoardWidth, height: scaledBoardHeight }}>
            <div
              className="relative rounded-md border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
              style={{
                width: baseBoardWidth,
                height: baseBoardHeight,
                transform: `scale(${boardScale})`,
                transformOrigin: 'top left',
              }}
              tabIndex={0}
              onMouseLeave={() => setGhost(new Set())}
            >
              {Array.from({ length: state.height }).map((_, y) =>
                Array.from({ length: state.width }).map((_, x) => {
                  const k = `${x},${y}`;
                  const isWall = state.walls.has(k);
                  const isTarget = state.targets.has(k);
                  const isBoxOnTarget = isTarget && state.boxes.has(k);
                  const isReach = reach.has(k);
                  const inGhost = ghost.has(k);
                  const inSolution = solutionPath.has(k);
                  const tileClasses = [
                    'absolute border shadow-inner transition-colors duration-150',
                    isWall
                      ? 'border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)]'
                      : 'border-[color:color-mix(in_srgb,var(--kali-control)_22%,transparent)] bg-[color:var(--kali-control-surface)]',
                  ];
                  if (isTarget) {
                    tileClasses.push(
                      isBoxOnTarget
                        ? 'bg-[color:color-mix(in_srgb,var(--color-success)_18%,var(--kali-control-surface))] ring-2 ring-[color:var(--color-success)]'
                        : 'bg-[color:color-mix(in_srgb,var(--kali-control)_24%,var(--kali-control-surface))] ring-2 ring-[color:var(--kali-control)]'
                    );
                  }
                  return (
                    <React.Fragment key={k}>
                      <div
                        className={tileClasses.join(' ')}
                        style={{ ...cellStyle, left: x * CELL, top: y * CELL }}
                        onMouseEnter={() => handleHover(x, y)}
                        onClick={() => handleTileClick(x, y)}
                      />
                      {isReach && !isWall && (
                        <div
                          className="absolute bg-[color:color-mix(in_srgb,var(--kali-control)_30%,transparent)]"
                          style={{ ...cellStyle, left: x * CELL, top: y * CELL }}
                        />
                      )}
                      {inGhost && (
                        <div
                          className="absolute bg-[color:color-mix(in_srgb,var(--color-info)_38%,transparent)]"
                          style={{ ...cellStyle, left: x * CELL, top: y * CELL }}
                        />
                      )}
                      {inSolution && (
                        <div
                          className="absolute bg-[color:color-mix(in_srgb,var(--color-accent)_38%,transparent)]"
                          style={{ ...cellStyle, left: x * CELL, top: y * CELL }}
                        />
                      )}
                    </React.Fragment>
                  );
                })
              )}
              {Array.from(state.boxes).map((b) => {
                const [x, y] = b.split(',').map(Number);
                const dead = state.deadlocks.has(b);
                const onTarget = state.targets.has(b);
                return (
                  <div
                    key={b}
                    className={`absolute transition-transform duration-100 ${
                      dead
                        ? 'bg-[color:var(--color-severity-critical)]'
                        : onTarget
                        ? 'bg-[color:var(--color-success)] ring-2 ring-[color:color-mix(in_srgb,var(--color-success)_65%,transparent)]'
                        : 'bg-[color:var(--kali-control)]'
                    } shadow-lg`}
                    style={{
                      ...cellStyle,
                      transform: `translate(${x * CELL}px, ${y * CELL}px) scale(${b === lastPush ? 1.1 : 1})`,
                    }}
                  />
                );
              })}
              {puffs.map((p) => (
                <div
                  key={p.id}
                  className="absolute h-4 w-4 animate-ping rounded-full bg-[color:var(--kali-text)]/70"
                  style={{ left: p.x * CELL + CELL / 2 - 8, top: p.y * CELL + CELL / 2 - 8 }}
                />
              ))}
              <div
                className="absolute bg-[color:var(--kali-control)] transition-transform duration-100"
                style={{
                  ...cellStyle,
                  transform: `translate(${state.player.x * CELL}px, ${state.player.y * CELL}px)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={handleUndo}
          aria-label="Undo move"
          className="rounded bg-kali-control px-3 py-1 text-sm font-semibold text-slate-900 shadow transition hover:bg-[color:color-mix(in_srgb,var(--color-control-accent)_85%,#000000)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={handleRedo}
          aria-label="Redo move"
          className="rounded bg-kali-control px-3 py-1 text-sm font-semibold text-slate-900 shadow transition hover:bg-[color:color-mix(in_srgb,var(--color-control-accent)_85%,#000000)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
        >
          Redo
        </button>
        <button
          type="button"
          onClick={handleReset}
          aria-label="Reset level"
          className="rounded bg-kali-control px-3 py-1 text-sm font-semibold text-slate-900 shadow transition hover:bg-[color:color-mix(in_srgb,var(--color-control-accent)_85%,#000000)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
        >
          Reset
        </button>
      </div>
      <details className="mx-auto w-full max-w-xl rounded border border-[color:var(--kali-panel-border)]/70 bg-[color:color-mix(in_srgb,var(--kali-panel)_70%,transparent)] px-3 py-2 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
        <summary className="cursor-pointer text-sm font-semibold text-[color:var(--kali-text)]">
          Help & controls
        </summary>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          <span>Arrow keys: Move/push</span>
          <span>Z: Undo</span>
          <span>Y: Redo</span>
          <span>R: Reset</span>
          <span>H: Hint</span>
          <span>P: Preview</span>
          <span>Esc: Cancel autoplay/solve</span>
        </div>
      </details>
      {showStats && (
        <div
          className="fixed inset-0 flex bg-[color:var(--kali-overlay)]/85 backdrop-blur-sm"
          onClick={() => setShowStats(false)}
        >
          <div
            className="space-y-2 rounded-xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-surface)]/95 p-4 text-[color:var(--kali-text)] shadow-kali-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold">Level Complete!</div>
            <div>Moves: {stats.moves}</div>
            <div>Pushes: {stats.pushes}</div>
            {minPushes !== null && <div>Minimal pushes: {minPushes}</div>}
            <button
              type="button"
              onClick={() => setShowStats(false)}
              className="rounded bg-kali-control px-2 py-1 text-sm font-semibold text-slate-900 transition hover:bg-[color:color-mix(in_srgb,var(--color-control-accent)_85%,#000000)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {showLevels && (
        <div
          className="fixed inset-0 flex bg-[color:var(--kali-overlay)]/85 backdrop-blur-sm"
          onClick={() => setShowLevels(false)}
        >
          <div
            className="w-[640px] max-w-full space-y-4 rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-surface)]/95 p-4 text-[color:var(--kali-text)] shadow-kali-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-[color:var(--kali-text)]">Choose a level</h2>
              <div className="text-sm text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
                Pack: <span className="font-medium text-[color:var(--kali-text)]">{packs[packIndex].name}</span>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
              <div className="sm:w-1/3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
                  Packs
                </h3>
                <div className="max-h-80 overflow-y-auto rounded border border-[color:var(--kali-panel-border)]/70">
                  {packs.map((p, i) => (
                    <button
                      key={p.name}
                      type="button"
                      className={`flex w-full justify-between gap-2 px-3 py-2 text-left text-sm ${
                        i === packIndex
                          ? 'bg-[color:var(--kali-control-surface)] font-semibold text-[color:var(--kali-text)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--kali-control)_45%,transparent)]'
                          : 'bg-[color:var(--kali-surface)] text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)] hover:bg-[color:var(--kali-control-overlay)]'
                      }`}
                      onClick={() => selectPack(i)}
                    >
                      <span>{p.name}</span>
                      <span className="text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)]">
                        {p.difficulty}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
                  Levels in {packs[packIndex].name}
                </h3>
                <div className="max-h-80 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {packs[packIndex].levels.map((lvl, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`flex flex-col items-center gap-2 rounded border px-2 py-2 transition-colors ${
                          i === index
                            ? 'border-[color:var(--kali-control)] bg-[color:var(--kali-control-surface)]'
                            : 'border-transparent bg-[color:var(--kali-surface)] hover:border-[color:var(--kali-control)]/40 hover:bg-[color:var(--kali-control-overlay)]'
                        }`}
                        onClick={() => {
                          selectLevel(i);
                          setShowLevels(false);
                        }}
                      >
                        <LevelThumb level={lvl} />
                        <span className="text-xs font-medium text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)]">
                          Level {i + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sokoban;
