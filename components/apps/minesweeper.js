import React, { useState } from 'react';

const BOARD_SIZE = 8;
const MINES_COUNT = 10;

const generateBoard = () => {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    })),
  );

  let placed = 0;
  while (placed < MINES_COUNT) {
    const x = Math.floor(Math.random() * BOARD_SIZE);
    const y = Math.floor(Math.random() * BOARD_SIZE);
    if (!board[x][y].mine) {
      board[x][y].mine = true;
      placed++;
    }
  }

  const dirs = [-1, 0, 1];
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (board[x][y].mine) continue;
      let count = 0;
      dirs.forEach((dx) =>
        dirs.forEach((dy) => {
          if (dx === 0 && dy === 0) return;
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < BOARD_SIZE &&
            ny >= 0 &&
            ny < BOARD_SIZE &&
            board[nx][ny].mine
          ) {
            count++;
          }
        }),
      );
      board[x][y].adjacent = count;
    }
  }
  return board;
};

const cloneBoard = (board) => board.map((row) => row.map((cell) => ({ ...cell })));

const revealCell = (board, x, y) => {
  const cell = board[x][y];
  if (cell.revealed || cell.flagged) return false;
  cell.revealed = true;
  if (cell.mine) return true;
  if (cell.adjacent === 0) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
          revealCell(board, nx, ny);
        }
      }
    }
  }
  return false;
};

const checkWin = (board) =>
  board.flat().every((cell) => cell.revealed || cell.mine);

const Minesweeper = () => {
  const [board, setBoard] = useState(generateBoard());
  const [status, setStatus] = useState('playing');

  const handleClick = (x, y) => {
    if (status !== 'playing') return;
    const newBoard = cloneBoard(board);
    const hitMine = revealCell(newBoard, x, y);
    setBoard(newBoard);
    if (hitMine) {
      setStatus('lost');
    } else if (checkWin(newBoard)) {
      setStatus('won');
    }
  };

  const handleRightClick = (e, x, y) => {
    e.preventDefault();
    if (status !== 'playing') return;
    const newBoard = cloneBoard(board);
    const cell = newBoard[x][y];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    setBoard(newBoard);
  };

  const reset = () => {
    setBoard(generateBoard());
    setStatus('playing');
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div className="grid grid-cols-8 gap-1" style={{ width: 'fit-content' }}>
        {board.map((row, x) =>
          row.map((cell, y) => {
            let display = '';
            if (cell.revealed) {
              display = cell.mine ? '💣' : cell.adjacent || '';
            } else if (cell.flagged) {
              display = '🚩';
            }
            return (
              <button
                key={`${x}-${y}`}
                onClick={() => handleClick(x, y)}
                onContextMenu={(e) => handleRightClick(e, x, y)}
                className={`h-8 w-8 flex items-center justify-center text-sm font-bold
                ${cell.revealed ? 'bg-gray-400' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {display}
              </button>
            );
          }),
        )}
      </div>
      <div className="mt-4 mb-2">
        {status === 'playing'
          ? 'Game in progress'
          : status === 'won'
          ? 'You win!'
          : 'Boom! Game over'}
      </div>
      <button
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={reset}
      >
        Reset
      </button>
    </div>
  );
};

export default Minesweeper;
