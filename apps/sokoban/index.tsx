import React, { useEffect, useState } from 'react';
import ReactGA from 'react-ga4';
import { defaultLevels, parseLevels } from './levels';
import {
  loadLevel,
  move,
  undo as undoMove,
  reset as resetLevel,
  reachable,
  isSolved,
  State,
  directionKeys,
} from './engine';

const CELL = 32;

const Sokoban: React.FC = () => {
  const [levels, setLevels] = useState<string[][]>(defaultLevels);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<State>(() => loadLevel(defaultLevels[0]));
  const [reach, setReach] = useState<Set<string>>(reachable(loadLevel(defaultLevels[0])));
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    const k = `sokoban-best-${index}`;
    const b = localStorage.getItem(k);
    setBest(b ? Number(b) : null);
  }, [index]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!directionKeys.includes(e.key as any)) return;
      e.preventDefault();
      const newState = move(state, e.key as any);
      if (newState === state) return;
      setState(newState);
      setReach(reachable(newState));
      if (newState.pushes > state.pushes) {
        ReactGA.event('push');
      }
      if (isSolved(newState)) {
        ReactGA.event('level_complete', { moves: newState.pushes });
        const bestKey = `sokoban-best-${index}`;
        const prevBest = localStorage.getItem(bestKey);
        if (!prevBest || newState.pushes < Number(prevBest)) {
          localStorage.setItem(bestKey, String(newState.pushes));
          setBest(newState.pushes);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, index]);

  const selectLevel = (i: number) => {
    const st = loadLevel(levels[i]);
    setIndex(i);
    setState(st);
    setReach(reachable(st));
    ReactGA.event('level_select', { level: i });
  };

  const handleUndo = () => {
    const st = undoMove(state);
    if (st !== state) {
      setState(st);
      setReach(reachable(st));
      ReactGA.event('undo');
    }
  };

  const handleReset = () => {
    const st = resetLevel(levels[index]);
    setState(st);
    setReach(reachable(st));
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lvl = parseLevels(text);
    if (lvl.length) {
      setLevels(lvl);
      selectLevel(0);
    }
  };

  const cellStyle = {
    width: CELL,
    height: CELL,
  } as React.CSSProperties;

  return (
    <div className="p-4 space-y-2 select-none">
      <div className="flex space-x-2 mb-2">
        <select value={index} onChange={(e) => selectLevel(Number(e.target.value))}>
          {levels.map((_, i) => (
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
        <div className="ml-4">Pushes: {state.pushes}</div>
        <div>Best: {best ?? '-'}</div>
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
        {[...state.boxes].map((b) => {
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
