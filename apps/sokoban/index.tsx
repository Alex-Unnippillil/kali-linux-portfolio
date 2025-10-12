import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logEvent, logGameStart, logGameEnd, logGameError } from '../../utils/analytics';
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
      className="relative bg-gray-700 shadow-md"
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
              className={`absolute ${isWall ? 'bg-gray-800' : 'bg-gray-600'} ${
                isTarget ? 'ring-1 ring-yellow-400' : ''
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
                className="absolute bg-orange-400"
                style={{ ...tileStyle, left: x * LEVEL_THUMB_CELL, top: y * LEVEL_THUMB_CELL }}
              />
            );
          }
          if (cell === '@' || cell === '+') {
            return (
              <div
                key={`p-${k}`}
                className="absolute bg-blue-400"
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
}

const Sokoban: React.FC<SokobanProps> = ({ getDailySeed }) => {
  void getDailySeed;
  const [packs, setPacks] = useState<LevelPack[]>(LEVEL_PACKS);
  const [packIndex, setPackIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const currentPack = packs[packIndex];
  const [state, setState] = useState<State>(() => loadLevel(currentPack.levels[0]));
  const [reach, setReach] = useState<Set<string>>(reachable(loadLevel(currentPack.levels[0])));
  const [best, setBest] = useState<number | null>(null);
  const [hint, setHint] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [warnDir, setWarnDir] = useState<DirectionKey | null>(null);
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
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);
  const initRef = useRef(false);

  const selectLevel = useCallback(
    (i: number, pIdx: number = packIndex, pData: LevelPack[] = packs) => {
      const pack = pData[pIdx];
      const st = loadLevel(pack.levels[i]);
      setPackIndex(pIdx);
      setIndex(i);
      setState(st);
      setReach(reachable(st));
      setHint('');
      setStatus('');
      setSolutionPath(new Set());
      setShowStats(false);
      setMinPushes(null);
      setTimeout(() => setMinPushes(findMinPushes(st)), 0);
      logGameStart('sokoban');
      logEvent({ category: 'sokoban', action: 'level_select', value: i });
    },
    [packIndex, packs]
  );

  const selectPack = useCallback(
    (pIdx: number) => {
      selectLevel(0, pIdx);
    },
    [selectLevel]
  );

  const handleUndo = useCallback(() => {
    const st = undoMove(state);
    if (st !== state) {
      setState(st);
      setReach(reachable(st));
      setHint('');
      setStatus('');
      setGhost(new Set());
      setSolutionPath(new Set());
      setShowStats(false);
      logEvent({ category: 'sokoban', action: 'undo' });
    }
  }, [state]);

  const handleRedo = useCallback(() => {
    const st = redoMove(state);
    if (st !== state) {
      setState(st);
      setReach(reachable(st));
      setHint('');
      setStatus('');
      setGhost(new Set());
      setSolutionPath(new Set());
      setShowStats(false);
      logEvent({ category: 'sokoban', action: 'redo' });
    }
  }, [state]);

  const handleReset = useCallback(() => {
    const st = resetLevel(currentPack.levels[index]);
    setState(st);
    setReach(reachable(st));
      setHint('');
      setStatus('');
      setGhost(new Set());
      setSolutionPath(new Set());
      setShowStats(false);
      setMinPushes(null);
    setTimeout(() => setMinPushes(findMinPushes(st)), 0);
  }, [currentPack, index]);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        const file = e.target.files?.[0];
        if (!file) return;
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
    [selectLevel]
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
          const st = loadLevel(parsed[0]);
          setPackIndex(newPacks.length - 1);
          setIndex(0);
          setState(st);
          setReach(reachable(st));
          setMinPushes(null);
          setTimeout(() => setMinPushes(findMinPushes(st)), 0);
        }
      }
      if (!code) {
        setMinPushes(null);
        setTimeout(() => setMinPushes(findMinPushes(state)), 0);
      }
    } catch (err: unknown) {
      logGameError('sokoban', err instanceof Error ? err.message : String(err));
    }
  }, [state]);

  useEffect(() => {
    const k = `sokoban-best-${packIndex}-${index}`;
    const b = localStorage.getItem(k);
    setBest(b ? Number(b) : null);
  }, [index, packIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
        return;
      }
      if (['u', 'U', 'z', 'Z', 'Backspace'].includes(e.key)) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (['y', 'Y'].includes(e.key)) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (!directionKeys.includes(e.key as DirectionKey)) return;
      e.preventDefault();
      const dir = e.key as DirectionKey;
      if (warnDir) {
        if (warnDir === dir) {
          const newState = move(state, dir);
          if (newState !== state) {
            setState(newState);
            setReach(reachable(newState));
            setHint('');
            setStatus(newState.deadlocks.size ? 'Deadlock!' : '');
            setGhost(new Set());
            setSolutionPath(new Set());
            if (newState.pushes > state.pushes) {
              const from = Array.from(state.boxes).find((b) => !newState.boxes.has(b));
              const to = Array.from(newState.boxes).find((b) => !state.boxes.has(b));
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
            }
            if (isSolved(newState)) {
              logGameEnd('sokoban', `level_complete`);
              logEvent({
                category: 'sokoban',
                action: 'level_complete',
                value: newState.pushes,
              });
              const bestKey = `sokoban-best-${packIndex}-${index}`;
              const prevBest = localStorage.getItem(bestKey);
              if (!prevBest || newState.pushes < Number(prevBest)) {
                localStorage.setItem(bestKey, String(newState.pushes));
                setBest(newState.pushes);
              }
              setStats({ moves: newState.moves, pushes: newState.pushes });
              setShowStats(true);
            }
          }
          setWarnDir(null);
          return;
        }
        setWarnDir(null);
      }
      if (wouldDeadlock(state, dir)) {
        setStatus('Deadlock ahead! Press again to confirm.');
        setWarnDir(dir);
        return;
      }
      const newState = move(state, dir);
      if (newState === state) return;
      setState(newState);
      setReach(reachable(newState));
      setHint('');
      setStatus(newState.deadlocks.size ? 'Deadlock!' : '');
      setGhost(new Set());
      setSolutionPath(new Set());
      if (newState.pushes > state.pushes) {
        const from = Array.from(state.boxes).find((b) => !newState.boxes.has(b));
        const to = Array.from(newState.boxes).find((b) => !state.boxes.has(b));
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
      }
      if (isSolved(newState)) {
        logGameEnd('sokoban', `level_complete`);
        logEvent({
          category: 'sokoban',
          action: 'level_complete',
          value: newState.pushes,
        });
        const bestKey = `sokoban-best-${packIndex}-${index}`;
        const prevBest = localStorage.getItem(bestKey);
        if (!prevBest || newState.pushes < Number(prevBest)) {
          localStorage.setItem(bestKey, String(newState.pushes));
          setBest(newState.pushes);
        }
        setStats({ moves: newState.moves, pushes: newState.pushes });
        setShowStats(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, index, packIndex, warnDir, handleReset, handleUndo, handleRedo]);

  const handleHint = useCallback(() => {
    setHint('...');
    setTimeout(() => {
      const dir = findHint(state);
      setHint(dir ? dir.replace('Arrow', '') : 'No hint');
    }, 0);
  }, [state]);
  
  const keyPos = useCallback((p: Position) => `${p.x},${p.y}`, []);

  const handlePreview = useCallback(() => {
    setSolutionPath(new Set());
    setStatus('...');
    setTimeout(() => {
      const sol = findSolution(state);
      if (!sol) {
        setStatus('No solution');
        return;
      }
      const positions: string[] = [];
      let st = state;
      sol.forEach((dir) => {
        st = move(st, dir);
        positions.push(keyPos(st.player));
      });
      setSolutionPath(new Set(positions));
      setStatus('');
    }, 0);
  }, [state, keyPos]);

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

  const findPath = useCallback((target: Position): string[] => {
    const start = state.player;
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
          n.x >= state.width ||
          n.y >= state.height ||
          state.walls.has(k) ||
          state.boxes.has(k)
        )
          continue;
        prev.set(k, keyPos(cur));
        q.push(n);
      }
    }
    return [];
  }, [keyPos, state]);

  const handleHover = useCallback(
    (x: number, y: number) => {
      const k = `${x},${y}`;
      if (!reach.has(k) || state.walls.has(k) || state.boxes.has(k)) {
        setGhost(new Set());
        return;
      }
      const path = findPath({ x, y });
      setGhost(new Set(path));
    },
    [findPath, reach, state]
  );

  const baseBoardWidth = state.width * CELL;
  const baseBoardHeight = state.height * CELL;
  const scaledBoardWidth = Math.round(baseBoardWidth * boardScale);
  const scaledBoardHeight = Math.round(baseBoardHeight * boardScale);

  const packSelectId = React.useId();
  const levelSelectId = React.useId();
  const importInputId = React.useId();

  return (
    <div className="p-4 space-y-4 select-none">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <label htmlFor={packSelectId} className="flex flex-col text-xs text-gray-300">
            <span className="font-semibold uppercase tracking-wide">Pack</span>
            <select
              id={packSelectId}
              value={packIndex}
              onChange={(e) => selectPack(Number(e.target.value))}
              className="mt-1 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-gray-100 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {packs.map((p, i) => (
                <option key={p.name} value={i}>{`${p.name} (${p.difficulty})`}</option>
              ))}
            </select>
          </label>
          <label htmlFor={levelSelectId} className="flex flex-col text-xs text-gray-300">
            <span className="font-semibold uppercase tracking-wide">Level</span>
            <select
              id={levelSelectId}
              value={index}
              onChange={(e) => selectLevel(Number(e.target.value))}
              className="mt-1 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-gray-100 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {currentPack.levels.map((_, i) => (
                <option key={i} value={i}>{`Level ${i + 1}`}</option>
              ))}
            </select>
          </label>
          <label htmlFor={importInputId} className="flex flex-col text-xs text-gray-300">
            <span className="font-semibold uppercase tracking-wide">Import</span>
            <input
              id={importInputId}
              type="file"
              accept=".txt,.sas"
              onChange={handleFile}
              aria-label="Import custom levels"
              className="mt-1 cursor-pointer text-sm text-gray-100"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowLevels(true)}
              className="rounded bg-gray-200/80 px-3 py-1 text-sm font-medium text-gray-900 shadow hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              Levels
            </button>
            <button
              type="button"
              onClick={handleHint}
              className="rounded bg-amber-400/30 px-3 py-1 text-sm font-medium text-amber-100 shadow hover:bg-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              Hint
            </button>
            <button
              type="button"
              onClick={handlePreview}
              className="rounded bg-amber-400/30 px-3 py-1 text-sm font-medium text-amber-100 shadow hover:bg-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              Preview
            </button>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 text-sm text-gray-100">
          <div className="flex flex-wrap gap-2">
            <span className="rounded bg-gray-900/60 px-3 py-1 shadow-sm">Moves: {state.moves}</span>
            <span className="rounded bg-gray-900/60 px-3 py-1 shadow-sm">Pushes: {state.pushes}</span>
            <span className="rounded bg-gray-900/60 px-3 py-1 shadow-sm">Best: {best ?? '-'}</span>
            <span className="rounded bg-gray-900/60 px-3 py-1 shadow-sm">Min: {minPushes ?? '-'}</span>
          </div>
          {hint && <div className="text-xs text-amber-200">Hint: {hint}</div>}
          {status && <div className="text-xs text-red-400">{status}</div>}
        </div>
      </div>
      <div ref={boardWrapperRef} className="w-full">
        <div className="mx-auto flex justify-center">
          <div className="relative" style={{ width: scaledBoardWidth, height: scaledBoardHeight }}>
            <div
              className="relative rounded-md bg-gray-800 shadow-lg"
              style={{
                width: baseBoardWidth,
                height: baseBoardHeight,
                transform: `scale(${boardScale})`,
                transformOrigin: 'top left',
              }}
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
                    'absolute shadow-inner transition-colors duration-150',
                    isWall ? 'bg-gray-900' : 'bg-gray-700/90',
                  ];
                  if (isTarget) {
                    tileClasses.push(
                      isBoxOnTarget
                        ? 'bg-emerald-400/25 ring-2 ring-emerald-300'
                        : 'bg-amber-300/25 ring-2 ring-amber-300'
                    );
                  }
                  return (
                    <React.Fragment key={k}>
                      <div
                        className={tileClasses.join(' ')}
                        style={{ ...cellStyle, left: x * CELL, top: y * CELL }}
                        onMouseEnter={() => handleHover(x, y)}
                      />
                      {isReach && !isWall && (
                        <div
                          className="absolute bg-sky-400/25"
                          style={{ ...cellStyle, left: x * CELL, top: y * CELL }}
                        />
                      )}
                      {inGhost && (
                        <div
                          className="absolute bg-blue-300/40"
                          style={{ ...cellStyle, left: x * CELL, top: y * CELL }}
                        />
                      )}
                      {inSolution && (
                        <div
                          className="absolute bg-purple-300/40"
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
                        ? 'bg-red-500'
                        : onTarget
                        ? 'bg-emerald-400 ring-2 ring-emerald-200'
                        : 'bg-orange-400'
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
                  className="absolute pointer-events-none w-4 h-4 rounded-full bg-gray-200 opacity-70 animate-ping"
                  style={{ left: p.x * CELL + CELL / 2 - 8, top: p.y * CELL + CELL / 2 - 8 }}
                />
              ))}
              <div
                className="absolute bg-blue-400 transition-transform duration-100"
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
          className="rounded bg-gray-200/80 px-3 py-1 text-sm font-medium text-gray-900 shadow hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={handleRedo}
          className="rounded bg-gray-200/80 px-3 py-1 text-sm font-medium text-gray-900 shadow hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          Redo
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded bg-gray-200/80 px-3 py-1 text-sm font-medium text-gray-900 shadow hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          Reset
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-300">
        <span>Arrow keys: Move</span>
        <span>Z or U: Undo</span>
        <span>Y: Redo</span>
        <span>R: Reset</span>
      </div>
      {showStats && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex"
          onClick={() => setShowStats(false)}
        >
          <div
            className="bg-white p-4 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold">Level Complete!</div>
            <div>Moves: {stats.moves}</div>
            <div>Pushes: {stats.pushes}</div>
            {minPushes !== null && <div>Minimal pushes: {minPushes}</div>}
            <button
              type="button"
              onClick={() => setShowStats(false)}
              className="px-2 py-1 bg-gray-300 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {showLevels && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex"
          onClick={() => setShowLevels(false)}
        >
          <div
            className="w-[640px] max-w-full space-y-4 rounded bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Choose a level</h2>
              <div className="text-sm text-gray-500">
                Pack: <span className="font-medium text-gray-700">{packs[packIndex].name}</span>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
              <div className="sm:w-1/3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Packs</h3>
                <div className="max-h-80 overflow-y-auto rounded border border-gray-200">
                  {packs.map((p, i) => (
                    <button
                      key={p.name}
                      type="button"
                      className={`flex w-full justify-between gap-2 px-3 py-2 text-left text-sm ${
                        i === packIndex
                          ? 'bg-amber-100 font-semibold text-gray-900'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                      onClick={() => selectPack(i)}
                    >
                      <span>{p.name}</span>
                      <span className="text-xs uppercase tracking-wide text-gray-400">{p.difficulty}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Levels in {packs[packIndex].name}
                </h3>
                <div className="max-h-80 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {packs[packIndex].levels.map((lvl, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`flex flex-col items-center gap-2 rounded border px-2 py-2 transition-colors ${
                          i === index ? 'border-amber-500 bg-amber-50' : 'border-transparent bg-white hover:border-amber-200'
                        }`}
                        onClick={() => {
                          selectLevel(i);
                          setShowLevels(false);
                        }}
                      >
                        <LevelThumb level={lvl} />
                        <span className="text-xs font-medium text-gray-600">Level {i + 1}</span>
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
