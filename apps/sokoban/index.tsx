import React, { useEffect, useState } from 'react';
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

  const handleUndo = () => {
    const st = undoMove(state);
    if (st !== state) {
      setState(st);
      setReach(reachable(st));
      setHint('');
      setStatus('');
      logEvent({ category: 'sokoban', action: 'undo' });
    }
  };

  const handleReset = () => {
    const st = resetLevel(currentPack.levels[index]);
    setState(st);
    setReach(reachable(st));
    setHint('');
    setStatus('');
  };

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
      const newState = move(state, e.key as any);
      if (newState === state) return;
      setState(newState);
      setReach(reachable(newState));
      setHint('');
      setStatus(newState.deadlocks.size ? 'Deadlock!' : '');
      if (newState.pushes > state.pushes) {
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
  }, [state, index, packIndex]);

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
      >
        {Array.from({ length: state.height }).map((_, y) =>
          Array.from({ length: state.width }).map((_, x) => {
            const k = `${x},${y}`;
            const isWall = state.walls.has(k);
            const isTarget = state.targets.has(k);
            const isReach = reach.has(k);
            return (
              <React.Fragment key={k}>
                <div
                  className={`absolute ${isWall ? 'bg-gray-800' : 'bg-gray-600'} ${
                    isTarget ? 'ring-2 ring-yellow-400' : ''
                  }`}
                  style={{ ...cellStyle, left: x * CELL, top: y * CELL }}
                />
                {isReach && !isWall && (
                  <div
                    className="absolute bg-green-400 opacity-30"
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
