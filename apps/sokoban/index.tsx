import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logEvent, logGameStart, logGameEnd, logGameError } from '../../utils/analytics';
import { LEVEL_PACKS, type LevelPack, parseLevels } from './levels';
import {
  loadLevel,
  move,
  undo as undoMove,
  redo as redoMove,
  reset as resetLevel,
  reachable,
  isSolved,
  type State,
  directionKeys,
  findHint,
  findMinPushes,
  findSolution,
  wouldDeadlock,
  type Position,
  type DirectionKey,
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

  return (
    <div className="p-4 space-y-2 select-none">
      <div className="flex flex-wrap space-x-2 mb-2 items-center">
        <select value={packIndex} onChange={(e) => selectPack(Number(e.target.value))}>
          {packs.map((p, i) => (
            <option key={p.name} value={i}>{`${p.name} (${p.difficulty})`}</option>
          ))}
        </select>
        <select value={index} onChange={(e) => selectLevel(Number(e.target.value))}>
          {currentPack.levels.map((_, i) => (
            <option key={i} value={i}>{`Level ${i + 1}`}</option>
          ))}
        </select>
        <input type="file" accept=".txt,.sas" onChange={handleFile} />
        <button
          type="button"
          onClick={() => setShowLevels(true)}
          className="px-2 py-1 bg-gray-300 rounded"
        >
          Levels
        </button>
        <button type="button" onClick={handleHint} className="px-2 py-1 bg-gray-300 rounded">
          Hint
        </button>
        <button type="button" onClick={handlePreview} className="px-2 py-1 bg-gray-300 rounded">
          Preview
        </button>
        <div className="ml-4">Moves: {state.moves}</div>
        <div>Pushes: {state.pushes}</div>
        <div>Best: {best ?? '-'}</div>
        <div>Min: {minPushes ?? '-'}</div>
        {hint && <div className="ml-4">Hint: {hint}</div>}
        {status && <div className="ml-4 text-red-500">{status}</div>}
      </div>
      <div
        className="relative bg-gray-700 shadow-lg"
        style={{ width: state.width * CELL, height: state.height * CELL }}
        onMouseLeave={() => setGhost(new Set())}
      >
        {Array.from({ length: state.height }).map((_, y) =>
          Array.from({ length: state.width }).map((_, x) => {
            const k = `${x},${y}`;
            const isWall = state.walls.has(k);
            const isTarget = state.targets.has(k);
            const isReach = reach.has(k);
            const inGhost = ghost.has(k);
            const inSolution = solutionPath.has(k);
            return (
              <React.Fragment key={k}>
                <div
                  className={`absolute shadow-inner ${isWall ? 'bg-gray-800' : 'bg-gray-600'} ${
                    isTarget ? 'ring-2 ring-yellow-400' : ''
                  }`}
                  style={{ ...cellStyle, left: x * CELL, top: y * CELL }}
                  onMouseEnter={() => handleHover(x, y)}
                />
                {isReach && !isWall && (
                  <div
                    className="absolute bg-green-400 opacity-30"
                    style={{ ...cellStyle, left: x * CELL, top: y * CELL }}
                  />
                )}
                {inGhost && (
                  <div
                    className="absolute bg-blue-300 opacity-40"
                    style={{ ...cellStyle, left: x * CELL, top: y * CELL }}
                  />
                )}
                {inSolution && (
                  <div
                    className="absolute bg-purple-300 opacity-40"
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
          return (
            <div
              key={b}
              className={`absolute transition-transform duration-100 ${
                dead ? 'bg-red-500' : 'bg-orange-400'
              } shadow-md`}
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
            className="absolute pointer-events-none w-4 h-4 bg-gray-200 opacity-70 rounded-full animate-ping"
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
      <div className="flex justify-center space-x-4 mt-2">
        <button
          type="button"
          onClick={handleUndo}
          className="px-3 py-1 bg-gray-300 rounded shadow"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={handleRedo}
          className="px-3 py-1 bg-gray-300 rounded shadow"
        >
          Redo
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1 bg-gray-300 rounded shadow"
        >
          Reset
        </button>
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
            className="bg-white p-4 w-[600px] max-w-full flex space-x-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-1/4 overflow-y-auto max-h-96">
              {packs.map((p, i) => (
                <div
                  key={p.name}
                  className={`p-2 cursor-pointer ${i === packIndex ? 'bg-blue-200' : ''}`}
                  onClick={() => selectPack(i)}
                >
                  {p.name}
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto max-h-96">
              <div className="grid grid-cols-3 gap-2">
                {packs[packIndex].levels.map((lvl, i) => (
                  <div
                    key={i}
                    className={`p-1 border cursor-pointer ${
                      i === index ? 'border-blue-500' : 'border-transparent'
                    }`}
                    onClick={() => {
                      selectLevel(i);
                      setShowLevels(false);
                    }}
                  >
                    <LevelThumb level={lvl} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sokoban;
