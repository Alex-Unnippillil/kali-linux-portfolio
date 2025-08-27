import React, { useEffect, useCallback, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import GameLayout from './GameLayout';
import useGameControls from './useGameControls';

const SIZE = 4;

// seeded RNG so tests can be deterministic
let rng = Math.random;
export const setSeed = (seed) => {
  let t = seed >>> 0;
  rng = () => {
    t += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const cloneBoard = (b) => b.map((row) => [...row]);

const initBoard = (hard = false) => {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  addRandomTile(board, hard);
  addRandomTile(board, hard);
  return board;
};

const addRandomTile = (board, hard, count = 1) => {
  const added = [];
  for (let i = 0; i < count; i++) {
    const empty = [];
    board.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell === 0) empty.push([r, c]);
      }),
    );
    if (empty.length === 0) return added;
    const [r, c] = empty[Math.floor(rng() * empty.length)];
    board[r][c] = hard ? 4 : rng() < 0.9 ? 2 : 4;
    added.push(`${r}-${c}`);
  }
  return added;
};

const slide = (row) => {
  const arr = row.filter((n) => n !== 0);
  let merged = false;
  const mergedIndices = [];
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      arr[i + 1] = 0;
      merged = true;
      mergedIndices.push(i);
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < SIZE) newRow.push(0);
  return { row: newRow, merged, mergedIndices };
};

const transpose = (board) => board[0].map((_, c) => board.map((row) => row[c]));

const flip = (board) => board.map((row) => [...row].reverse());

const moveLeft = (board) => {
  let merged = false;
  const mergedCells = [];
  const newBoard = board.map((row, r) => {
    const res = slide(row);
    if (res.merged) merged = true;
    res.mergedIndices.forEach((c) => mergedCells.push([r, c]));
    return res.row;
  });
  return { board: newBoard, merged, mergedCells };
};
const moveRight = (board) => {
  const flipped = flip(board);
  const moved = moveLeft(flipped);
  const mergedCells = moved.mergedCells.map(([r, c]) => [r, SIZE - 1 - c]);
  return { board: flip(moved.board), merged: moved.merged, mergedCells };
};
const moveUp = (board) => {
  const transposed = transpose(board);
  const moved = moveLeft(transposed);
  const mergedCells = moved.mergedCells.map(([r, c]) => [c, r]);
  return { board: transpose(moved.board), merged: moved.merged, mergedCells };
};
const moveDown = (board) => {
  const transposed = transpose(board);
  const moved = moveRight(transposed);
  const mergedCells = moved.mergedCells.map(([r, c]) => [c, r]);
  return { board: transpose(moved.board), merged: moved.merged, mergedCells };
};

const boardsEqual = (a, b) =>
  a.every((row, r) => row.every((cell, c) => cell === b[r][c]));

const checkWin = (board) => board.some((row) => row.some((cell) => cell === 2048));

const hasMoves = (board) => {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return true;
      if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
};

const tileColors = {
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
};

const colorBlindColors = {
  2: 'bg-blue-300 text-gray-800',
  4: 'bg-blue-400 text-gray-800',
  8: 'bg-blue-500 text-white',
  16: 'bg-indigo-500 text-white',
  32: 'bg-purple-500 text-white',
  64: 'bg-pink-500 text-white',
  128: 'bg-green-500 text-white',
  256: 'bg-green-600 text-white',
  512: 'bg-green-700 text-white',
  1024: 'bg-yellow-500 text-white',
  2048: 'bg-yellow-600 text-white',
};

const validateBoard = (b) =>
  Array.isArray(b) &&
  b.length === SIZE &&
  b.every(
    (row) => Array.isArray(row) && row.length === SIZE && row.every((n) => typeof n === 'number'),
  );

const Game2048 = () => {
  const [board, setBoard] = usePersistentState('2048-board', initBoard, validateBoard);
  const [won, setWon] = usePersistentState('2048-won', false, (v) => typeof v === 'boolean');
  const [lost, setLost] = usePersistentState('2048-lost', false, (v) => typeof v === 'boolean');
  const [history, setHistory] = useState([]);
  const [hardMode, setHardMode] = usePersistentState('2048-hard', false, (v) => typeof v === 'boolean');
  const [colorBlind, setColorBlind] = usePersistentState('2048-cb', false, (v) => typeof v === 'boolean');
  const [newCells, setNewCells] = useState(new Set());
  const [mergeCells, setMergeCells] = useState(new Set());

  useEffect(() => {
    if (newCells.size > 0) {
      const t = setTimeout(() => setNewCells(new Set()), 200);
      return () => clearTimeout(t);
    }
  }, [newCells]);

  useEffect(() => {
    if (mergeCells.size > 0) {
      const t = setTimeout(() => setMergeCells(new Set()), 200);
      return () => clearTimeout(t);
    }
  }, [mergeCells]);

  const handleDirection = useCallback(
    ({ x, y }) => {
      if (won || lost) return;
      let result;
      if (x === -1) result = moveLeft(board);
      else if (x === 1) result = moveRight(board);
      else if (y === -1) result = moveUp(board);
      else if (y === 1) result = moveDown(board);
      else return;
      const { board: moved, merged, mergedCells } = result;
      if (!boardsEqual(board, moved)) {
        const added = addRandomTile(moved, hardMode, hardMode ? 2 : 1);
        setHistory((h) => [...h, cloneBoard(board)]);
        setNewCells(new Set(added));
        setMergeCells(new Set(mergedCells.map(([r, c]) => `${r}-${c}`)));
        setBoard(cloneBoard(moved));
        if (merged) navigator.vibrate?.(50);
        if (checkWin(moved)) setWon(true);
        else if (!hasMoves(moved)) setLost(true);
      }
    },
    [board, won, lost, hardMode, setBoard, setLost, setWon],
  );

  useGameControls(handleDirection);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setBoard(cloneBoard(prev));
      setWon(checkWin(prev));
      setLost(!hasMoves(prev));
      setNewCells(new Set());
      setMergeCells(new Set());
      return h.slice(0, -1);
    });
  }, [setBoard, setWon, setLost]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        document.getElementById('close-2048')?.click();
      } else if (e.key === 'u' || (e.ctrlKey && e.key === 'z')) {
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  const reset = () => {
    setBoard(initBoard(hardMode));
    setHistory([]);
    setWon(false);
    setLost(false);
    setNewCells(new Set());
    setMergeCells(new Set());
  };

  const close = () => {
    document.getElementById('close-2048')?.click();
  };

  return (
    <GameLayout>
      <>
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={reset}
          >
            Reset
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
            onClick={undo}
            disabled={history.length === 0}
          >
            Undo
          </button>
          <label className="flex items-center space-x-1 px-2">
            <input
              type="checkbox"
              checked={hardMode}
              onChange={() => setHardMode(!hardMode)}
            />
            <span>Hard</span>
          </label>
          <label className="flex items-center space-x-1 px-2">
            <input
              type="checkbox"
              checked={colorBlind}
              onChange={() => setColorBlind(!colorBlind)}
            />
            <span>Colorblind</span>
          </label>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={close}
          >
            Close
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const key = `${rIdx}-${cIdx}`;
              const colors = colorBlind ? colorBlindColors : tileColors;
              return (
                <div
                  key={key}
                  className={`h-16 w-16 flex items-center justify-center text-2xl font-bold rounded ${
                    cell ? colors[cell] || 'bg-gray-700' : 'bg-gray-800'
                  } ${newCells.has(key) ? 'tile-pop' : ''} ${mergeCells.has(key) ? 'tile-merge' : ''}`}
                >
                  {cell !== 0 ? cell : ''}
                </div>
              );
            })
          )}
        </div>
        {(won || lost) && (
          <div className="mt-4 text-xl">{won ? 'You win!' : 'Game over'}</div>
        )}
      </>
    </GameLayout>
  );
};

export default Game2048;

