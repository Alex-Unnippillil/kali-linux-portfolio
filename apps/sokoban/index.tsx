import React, { useCallback, useEffect, useState } from 'react';
import { logEvent, logGameStart, logGameEnd, logGameError } from '../../utils/analytics';
import { LEVEL_PACKS, LevelPack, parseLevels } from './levels';
import {
  loadLevel,
  move,
  undo as undoMove,
  reset as resetLevel,
  reachable,
  isSolved,
  State,
  directionKeys,
  findHint,
  wouldDeadlock,
  Position,
} from './engine';

const CELL = 32;

const Sokoban: React.FC = () => {
  const [packs, setPacks] = useState<LevelPack[]>(LEVEL_PACKS);
  const [packIndex, setPackIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const currentPack = packs[packIndex];
  const [state, setState] = useState<State>(() => loadLevel(currentPack.levels[0]));
  const [reach, setReach] = useState<Set<string>>(reachable(loadLevel(currentPack.levels[0])));
  const [best, setBest] = useState<number | null>(null);
  const [hint, setHint] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [warnDir, setWarnDir] = useState<(typeof directionKeys)[number] | null>(null);
  const [ghost, setGhost] = useState<Set<string>>(new Set());
  const [puffs, setPuffs] = useState<{ id: number; x: number; y: number }[]>([]);
  const puffId = React.useRef(0);

  const selectLevel = (i: number, pIdx: number = packIndex, pData: LevelPack[] = packs) => {
    const pack = pData[pIdx];
    const st = loadLevel(pack.levels[i]);
    setPackIndex(pIdx);
    setIndex(i);
    setState(st);
    setReach(reachable(st));
    setHint('');
    setStatus('');
    logGameStart('sokoban');
    logEvent({ category: 'sokoban', action: 'level_select', value: i });
  };

  const selectPack = (pIdx: number) => {
    selectLevel(0, pIdx);
  };

  const handleUndo = useCallback(() => {
    const st = undoMove(state);
    if (st !== state) {
      setState(st);
      setReach(reachable(st));
      setHint('');
      setStatus('');
      setGhost(new Set());
      logEvent({ category: 'sokoban', action: 'undo' });
    }
  }, [state]);

  const handleReset = useCallback(() => {
    const st = resetLevel(currentPack.levels[index]);
    setState(st);
    setReach(reachable(st));
    setHint('');
    setStatus('');
    setGhost(new Set());
  }, [currentPack, index]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const lvl = parseLevels(text);
      if (lvl.length) {
        const customPack: LevelPack = { name: file.name || 'Custom', difficulty: 'Custom', levels: lvl };
        const newPacks = [...LEVEL_PACKS, customPack];
        setPacks(newPacks);
        selectLevel(0, newPacks.length - 1, newPacks);
      }
    } catch (err: any) {
      logGameError('sokoban', err?.message || String(err));
    }
  };

  useEffect(() => {
    logGameStart('sokoban');
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        const text = decodeURIComponent(code);
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
        }
      }
    } catch (err: any) {
      logGameError('sokoban', err?.message || String(err));
    }
  }, []);

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
      if (!directionKeys.includes(e.key as any)) return;
      e.preventDefault();
      const dir = e.key as (typeof directionKeys)[number];
      if (warnDir) {
        if (warnDir === dir) {
          const newState = move(state, dir);
          if (newState !== state) {
            setState(newState);
            setReach(reachable(newState));
            setHint('');
            setStatus(newState.deadlocks.size ? 'Deadlock!' : '');
            setGhost(new Set());
            if (newState.pushes > state.pushes) {
              const from = Array.from(state.boxes).find((b) => !newState.boxes.has(b));
              if (from) {
                const [fx, fy] = from.split(',').map(Number);
                const id = puffId.current++;
                setPuffs((p) => [...p, { id, x: fx, y: fy }]);
                setTimeout(() => setPuffs((p) => p.filter((pp) => pp.id !== id)), 300);
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
      if (newState.pushes > state.pushes) {
        const from = Array.from(state.boxes).find((b) => !newState.boxes.has(b));
        if (from) {
          const [fx, fy] = from.split(',').map(Number);
          const id = puffId.current++;
          setPuffs((p) => [...p, { id, x: fx, y: fy }]);
          setTimeout(() => setPuffs((p) => p.filter((pp) => pp.id !== id)), 300);
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
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, index, packIndex, warnDir, handleReset, handleUndo]);

  const handleHint = () => {
    setHint('...');
    setTimeout(() => {
      const dir = findHint(state);
      setHint(dir ? dir.replace('Arrow', '') : 'No hint');
    }, 0);
  };

  const cellStyle = {
    width: CELL,
    height: CELL,
  } as React.CSSProperties;

  const keyPos = (p: Position) => `${p.x},${p.y}`;

  const findPath = (target: Position): string[] => {
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
  };

  const handleHover = (x: number, y: number) => {
    const k = `${x},${y}`;
    if (!reach.has(k) || state.walls.has(k) || state.boxes.has(k)) {
      setGhost(new Set());
      return;
    }
    const path = findPath({ x, y });
    setGhost(new Set(path));
  };

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
        <button type="button" onClick={handleUndo} className="px-2 py-1 bg-gray-300 rounded">
          Undo
        </button>
        <button type="button" onClick={handleReset} className="px-2 py-1 bg-gray-300 rounded">
          Reset
        </button>
        <button type="button" onClick={handleHint} className="px-2 py-1 bg-gray-300 rounded">
          Hint
        </button>
        <div className="ml-4">Pushes: {state.pushes}</div>
        <div>Best: {best ?? '-'}</div>
        {hint && <div className="ml-4">Hint: {hint}</div>}
        {status && <div className="ml-4 text-red-500">{status}</div>}
      </div>
      <div
        className="relative bg-gray-700"
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
            return (
              <React.Fragment key={k}>
                <div
                  className={`absolute ${isWall ? 'bg-gray-800' : 'bg-gray-600'} ${
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
              }`}
              style={{
                ...cellStyle,
                transform: `translate(${x * CELL}px, ${y * CELL}px)`,
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
    </div>
  );
};

export default Sokoban;
