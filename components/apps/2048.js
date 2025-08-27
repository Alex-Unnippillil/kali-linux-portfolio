import React, { useEffect, useCallback, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import GameLayout from './GameLayout';

const SIZE = 4;

const cloneBoard = (b) => b.map((row) => [...row]);

const initBoard = (hard = false) => {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  addRandomTile(board, hard);
  addRandomTile(board, hard);
  return board;
};

const addRandomTile = (board, hard, count = 1) => {
  for (let i = 0; i < count; i++) {
    const empty = [];
    board.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell === 0) empty.push([r, c]);
      })
    );
    if (empty.length === 0) return board;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    board[r][c] = hard ? 4 : Math.random() < 0.9 ? 2 : 4;
  }
  return board;
};

const slide = (row) => {
  const arr = row.filter((n) => n !== 0);
  let score = 0;
  const merges = [];
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      score += arr[i];
      arr[i + 1] = 0;
      merges.push(i);
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < SIZE) newRow.push(0);
  return { row: newRow, score, merges };
};

const transpose = (board) =>
  board[0].map((_, c) => board.map((row) => row[c]));

const flip = (board) => board.map((row) => [...row].reverse());

const moveLeft = (board) => {
  let score = 0;
  const merges = [];
  const newBoard = board.map((row, r) => {
    const { row: newRow, score: s, merges: m } = slide(row);
    score += s;
    m.forEach((c) => merges.push([r, c]));
    return newRow;
  });
  return { board: newBoard, score, merges };
};

const moveRight = (board) => {
  const flipped = flip(board);
  const { board: moved, score, merges } = moveLeft(flipped);
  const newBoard = flip(moved);
  const adjusted = merges.map(([r, c]) => [r, SIZE - 1 - c]);
  return { board: newBoard, score, merges: adjusted };
};

const moveUp = (board) => {
  const t = transpose(board);
  const { board: moved, score, merges } = moveLeft(t);
  const newBoard = transpose(moved);
  const adjusted = merges.map(([r, c]) => [c, r]);
  return { board: newBoard, score, merges: adjusted };
};

const moveDown = (board) => {
  const t = transpose(board);
  const { board: moved, score, merges } = moveRight(t);
  const newBoard = transpose(moved);
  const adjusted = merges.map(([r, c]) => [c, r]);
  return { board: newBoard, score, merges: adjusted };
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
  const [animCells, setAnimCells] = useState(new Set());
  const [mergeCells, setMergeCells] = useState(new Set());
  const [score, setScore] = usePersistentState('2048-score', 0, (v) => typeof v === 'number');
  const [scorePop, setScorePop] = useState(0);

  useEffect(() => {
    if (animCells.size > 0) {
      const id = setTimeout(() => {
        requestAnimationFrame(() => setAnimCells(new Set()));
      }, 200);
      return () => clearTimeout(id);
    }
  }, [animCells]);

  useEffect(() => {
    if (mergeCells.size > 0) {
      const id = setTimeout(() => {
        requestAnimationFrame(() => setMergeCells(new Set()));
      }, 300);
      return () => clearTimeout(id);
    }
  }, [mergeCells]);

  useEffect(() => {
    if (scorePop) {
      const id = setTimeout(() => {
        requestAnimationFrame(() => setScorePop(0));
      }, 600);
      return () => clearTimeout(id);
    }
  }, [scorePop]);

  const handleKey = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        document.getElementById('close-2048')?.click();
        return;
      }
      if (won || lost) return;
      let result;
      if (e.key === 'ArrowLeft') result = moveLeft(board);
      else if (e.key === 'ArrowRight') result = moveRight(board);
      else if (e.key === 'ArrowUp') result = moveUp(board);
      else if (e.key === 'ArrowDown') result = moveDown(board);
      else return;
      const { board: moved, score: gained, merges } = result;
      if (!boardsEqual(board, moved)) {
        const beforeAdd = cloneBoard(moved);
        addRandomTile(moved, hardMode, hardMode ? 2 : 1);
        setHistory((h) => [...h, { board: cloneBoard(board), score }]);
        const changed = new Set();
        for (let r = 0; r < SIZE; r++) {
          for (let c = 0; c < SIZE; c++) {
            if (beforeAdd[r][c] !== moved[r][c] || board[r][c] !== moved[r][c]) {
              changed.add(`${r}-${c}`);
            }
          }
        }
        setAnimCells(changed);
        setMergeCells(new Set(merges.map(([r, c]) => `${r}-${c}`)));
        requestAnimationFrame(() => {
          setBoard(cloneBoard(moved));
          if (gained) {
            setScore((s) => s + gained);
            setScorePop(gained);
          }
          if (checkWin(moved)) setWon(true);
          else if (!hasMoves(moved)) setLost(true);
        });
      }
    },
    [board, won, lost, hardMode, setBoard, setLost, setWon, setScore]

  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const reset = () => {
    setBoard(initBoard(hardMode));
    setHistory([]);
    setWon(false);
    setLost(false);
    setAnimCells(new Set());
    setMergeCells(new Set());
    setScore(0);
    setScorePop(0);
  };

  const close = () => {
    document.getElementById('close-2048')?.click();
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setBoard(cloneBoard(prev.board));
      setScore(prev.score);
      setWon(checkWin(prev.board));
      setLost(!hasMoves(prev.board));
      setAnimCells(new Set());
      setMergeCells(new Set());
      return h.slice(0, -1);
    });
  };

  return (
    <GameLayout
      title="2048"
      instructions="Use arrow keys to move tiles. Reach 2048 to win."
      controls={
        <>
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
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={close}
          >
            Close
          </button>
        </>
      }
    >
      <>
        <div className="mb-2 text-lg font-semibold">
          Score: <span aria-live="polite">{score}</span>
          {scorePop > 0 && (
            <span className="ml-2 text-green-400 font-bold score-pop">+{scorePop}</span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const key = `${rIdx}-${cIdx}`;
              return (
                <div
                  key={key}
                  className={`h-16 w-16 flex items-center justify-center text-2xl font-bold rounded ${
                    cell ? tileColors[cell] || 'bg-gray-700' : 'bg-gray-800'
                  } ${animCells.has(key) ? 'tile-pop' : ''} ${
                    mergeCells.has(key) ? 'tile-merge' : ''
                  }`}
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

