"use client";

import React, { useCallback, useEffect, useState } from 'react';
import GameShell from '../../components/games/GameShell';
import {
  Board,
  SIZE,
  HiddenTiles,
  addRandomTile,
  revealHidden,
  moveLeft,
  moveRight,
  moveUp,
  moveDown,
  boardsEqual,
} from './logic';
import { reset, serialize, deserialize } from '../../apps/games/rng';

// limit of undo operations per game
const UNDO_LIMIT = 5;

// tile skins
const SKINS: Record<string, Record<number, string>> = {
  classic: {
    2: 'bg-gray-300 text-gray-800',
    4: 'bg-gray-400 text-gray-800',
    8: 'bg-yellow-400 text-white',
    16: 'bg-yellow-500 text-white',
    32: 'bg-orange-500 text-white',
    64: 'bg-orange-600 text-white',
    128: 'bg-red-500 text-white',
    256: 'bg-red-600 text-white',
    512: 'bg-red-700 text-white',
    1024: 'bg-green-500 text-white',
    2048: 'bg-green-600 text-white',
  },
  neon: {
    2: 'bg-pink-500 text-white',
    4: 'bg-fuchsia-500 text-white',
    8: 'bg-purple-500 text-white',
    16: 'bg-indigo-500 text-white',
    32: 'bg-blue-500 text-white',
    64: 'bg-cyan-500 text-white',
    128: 'bg-teal-500 text-white',
    256: 'bg-lime-500 text-white',
    512: 'bg-yellow-500 text-white',
    1024: 'bg-orange-500 text-white',
    2048: 'bg-red-500 text-white',
  },
};

type HistoryEntry = { board: Board; rng: string; hidden: string[] };

const emptyBoard = (): Board => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

const highestTile = (b: Board) => Math.max(...b.flat());

let seed = '';
export const setSeed = (s: string) => {
  seed = s;
};

const Game2048 = () => {
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [undosLeft, setUndosLeft] = useState(UNDO_LIMIT);
  const [skin, setSkin] = useState<keyof typeof SKINS>('classic');
  const [best, setBest] = useState(0);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [hideMode, setHideMode] = useState(false);
  const [hidden, setHidden] = useState<HiddenTiles>(new Set());

  // load best tile from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('game_2048_best');
      if (stored) setBest(parseInt(stored, 10));
    } catch {
      /* ignore */
    }
  }, []);

  // persist best tile
  useEffect(() => {
    try {
      window.localStorage.setItem('game_2048_best', best.toString());
    } catch {
      /* ignore */
    }
  }, [best]);

  const init = useCallback(() => {
    reset(seed);
    seed = '';
    const b = emptyBoard();
    const h = new Set<string>();
    addRandomTile(b, h);
    addRandomTile(b, h);
    setBoard(b);
    setHistory([]);
    setUndosLeft(UNDO_LIMIT);
    setWon(false);
    setLost(false);
    setHidden(h);
  }, []);

  useEffect(() => {
    init();
  }, [init]);
  // check if moves available
  const hMoves = (b: Board) => {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c] === 0) return true;
        if (c < SIZE - 1 && b[r][c] === b[r][c + 1]) return true;
        if (r < SIZE - 1 && b[r][c] === b[r + 1][c]) return true;
      }
    }
    return false;
  };

  const move = useCallback(
    (dir: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => {
      if (won || lost) return;
      const fn =
        dir === 'ArrowLeft'
          ? moveLeft
          : dir === 'ArrowRight'
          ? moveRight
          : dir === 'ArrowUp'
          ? moveUp
          : moveDown;
      const next = fn(board.map((row) => [...row]));
      if (boardsEqual(board, next)) return;
      setHistory((h) => [
        ...h,
        { board: board.map((row) => [...row]), rng: serialize(), hidden: Array.from(hidden) },
      ]);
      const nextHidden = new Set(hidden);
      revealHidden(nextHidden);
      addRandomTile(next, nextHidden, false, 1, hideMode);
      const hi = highestTile(next);
      if (hi > best) setBest(hi);
      setBoard(next);
      setHidden(nextHidden);
      if (hi >= 2048) setWon(true);
      else if (!hMoves(next)) setLost(true);
    },
    [board, best, won, lost, hideMode, hidden]
  );

  const undo = useCallback(() => {
    if (!history.length || undosLeft === 0) return;
    const last = history[history.length - 1];
    deserialize(last.rng);
    setBoard(last.board.map((row) => [...row]));
    setHidden(new Set(last.hidden));
    setHistory((h) => h.slice(0, -1));
    setUndosLeft((u) => u - 1);
    setWon(false);
    setLost(false);
  }, [history, undosLeft]);

  useEffect(() => {
    if (!hideMode) setHidden(new Set());
  }, [hideMode]);

  // keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ([
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
      ].includes(e.key)) {
        e.preventDefault();
        move(e.key as any);
      }
      if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') {
        e.preventDefault();
        undo();
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        init();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [move, undo, init]);

  const currentSkin = SKINS[skin];

  return (
    <GameShell>
      <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
        <div className="flex space-x-2 items-center">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={init}
          >
            Restart
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={undo}
            disabled={!history.length || undosLeft === 0}
          >
            Undo ({undosLeft})
          </button>
          <select
            className="text-black px-1 rounded"
            value={skin}
            onChange={(e) => setSkin(e.target.value as any)}
          >
            {Object.keys(SKINS).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={hideMode}
              onChange={(e) => setHideMode(e.target.checked)}
            />
            <span>Hide</span>
          </label>
          <div className="ml-auto">Best: {best}</div>
        </div>
        <div className="grid w-full max-w-sm grid-cols-4 gap-2">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const key = `${rIdx}-${cIdx}`;
              const isHidden = hideMode && hidden.has(key);
              return (
                <div key={key} className="w-full aspect-square">
                  <div
                    className={`h-full w-full flex items-center justify-center text-2xl font-bold rounded ${
                      cell && !isHidden ? currentSkin[cell] || 'bg-gray-700' : 'bg-gray-800'
                    }`}
                  >
                    {cell && !isHidden ? cell : ''}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {(won || lost) && (
          <div className="mt-4 text-xl">{won ? 'You win!' : 'Game over'}</div>
        )}
      </div>
    </GameShell>
  );
};

export default Game2048;

