import React, { useState, useEffect, useCallback } from 'react';
import { withGameErrorBoundary } from './GameErrorBoundary';

const SIZE = 4;

const initBoard = () => {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  addRandomTile(board);
  addRandomTile(board);
  return board;
};

const addRandomTile = (board) => {
  const empty = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
  return board;
};

const slide = (row) => {
  const arr = row.filter((n) => n !== 0);
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      arr[i + 1] = 0;
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < SIZE) newRow.push(0);
  return newRow;
};

const transpose = (board) =>
  board[0].map((_, c) => board.map((row) => row[c]));

const flip = (board) => board.map((row) => [...row].reverse());

const moveLeft = (board) => board.map((row) => slide(row));
const moveRight = (board) => flip(moveLeft(flip(board)));
const moveUp = (board) => transpose(moveLeft(transpose(board)));
const moveDown = (board) => transpose(moveRight(transpose(board)));

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

const Game2048 = () => {
  const [board, setBoard] = useState(() => initBoard());
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);

  const handleKey = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        document.getElementById('close-2048')?.click();
        return;
      }
      if (won || lost) return;
      let newBoard;
      if (e.key === 'ArrowLeft') newBoard = moveLeft(board);
      else if (e.key === 'ArrowRight') newBoard = moveRight(board);
      else if (e.key === 'ArrowUp') newBoard = moveUp(board);
      else if (e.key === 'ArrowDown') newBoard = moveDown(board);
      else return;
      if (!boardsEqual(board, newBoard)) {
        addRandomTile(newBoard);
        setBoard(newBoard);
        if (checkWin(newBoard)) setWon(true);
        else if (!hasMoves(newBoard)) setLost(true);
      }
    },
    [board, won, lost]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const reset = () => {
    setBoard(initBoard());
    setWon(false);
    setLost(false);
  };

  const close = () => {
    document.getElementById('close-2048')?.click();
  };

  return (
    <div className="h-full w-full p-4 flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none">
      <div className="grid grid-cols-4 gap-2">
        {board.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className={`h-16 w-16 flex items-center justify-center text-2xl font-bold rounded ${
                cell ? tileColors[cell] || 'bg-gray-700' : 'bg-gray-800'
              }`}
            >
              {cell !== 0 ? cell : ''}
            </div>
          ))
        )}
      </div>
      {(won || lost) && (
        <div className="mt-4 text-xl">{won ? 'You win!' : 'Game over'}</div>
      )}
      <div className="mt-4 space-x-2">
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={reset}
        >
          Reset
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={close}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const Game2048WithBoundary = withGameErrorBoundary(Game2048);

export default Game2048WithBoundary;

