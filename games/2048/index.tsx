"use client";

import React, { useCallback, useEffect, useState } from 'react';
import GameShell from '../../components/games/GameShell';
import {
  Board,
  SIZE,
  addRandomTile,
  moveLeft,
  moveRight,
  moveUp,
  moveDown,
  boardsEqual,
} from '../../apps/games/_2048/logic';
import { reset as resetRng, serialize, deserialize } from '../../apps/games/rng';
import useGameState, { emptyBoard, UNDO_LIMIT } from './state';

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

const highestTile = (b: Board) => Math.max(...b.flat());

const Game2048 = () => {
  const [game, setGame] = useGameState();
  const { board, history, undosLeft, skin, best, won, lost, rng } = game;
  const [showResume, setShowResume] = useState(false);

  const init = useCallback(() => {
    resetRng();
    const b = emptyBoard();
    addRandomTile(b);
    addRandomTile(b);
    setGame((g) => ({
      ...g,
      board: b,
      history: [],
      undosLeft: UNDO_LIMIT,
      won: false,
      lost: false,
      rng: serialize(),
    }));
  }, [setGame]);

  useEffect(() => {
    if (rng) {
      try {
        deserialize(rng);
      } catch {
        /* ignore */
      }
    }
    const hasProgress = board.some((row) => row.some((cell) => cell !== 0));
    if (hasProgress) {
      setShowResume(true);
    } else {
      init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
      const prevRng = serialize();
      addRandomTile(next);
      const hi = highestTile(next);
      setGame((g) => ({
        ...g,
        board: next,
        history: [...g.history, { board: board.map((row) => [...row]), rng: prevRng }],
        best: hi > g.best ? hi : g.best,
        won: hi >= 2048,
        lost: hi >= 2048 ? false : !hMoves(next),
        rng: serialize(),
      }));
    },
    [board, won, lost, setGame]
  );

  const undo = useCallback(() => {
    if (!history.length || undosLeft === 0) return;
    const last = history[history.length - 1];
    deserialize(last.rng);
    setGame((g) => ({
      ...g,
      board: last.board.map((row) => [...row]),
      history: g.history.slice(0, -1),
      undosLeft: g.undosLeft - 1,
      won: false,
      lost: false,
    }));
  }, [history, undosLeft, setGame]);

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
      <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4 relative">
        {showResume && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
            <div className="bg-gray-800 p-4 rounded space-x-2">
              <button
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                onClick={() => setShowResume(false)}
              >
                Resume
              </button>
              <button
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                onClick={() => {
                  init();
                  setShowResume(false);
                }}
              >
                New Game
              </button>
            </div>
          </div>
        )}
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
            onChange={(e) =>
              setGame((g) => ({ ...g, skin: e.target.value as keyof typeof SKINS }))
            }
          >
            {Object.keys(SKINS).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <div className="ml-auto">Best: {best}</div>
        </div>
        <div className="grid w-full max-w-sm grid-cols-4 gap-2">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => (
              <div key={`${rIdx}-${cIdx}`} className="w-full aspect-square">
                <div
                  className={`h-full w-full flex items-center justify-center text-2xl font-bold rounded ${
                    cell ? currentSkin[cell] || 'bg-gray-700' : 'bg-gray-800'
                  }`}
                >
                  {cell || ''}
                </div>
              </div>
            ))
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

