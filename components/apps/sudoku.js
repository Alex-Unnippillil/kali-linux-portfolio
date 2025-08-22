import React, { useState, useEffect } from 'react';

const SIZE = 9;

const range = (n) => Array.from({ length: n }, (_, i) => i);

const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

const isValid = (board, row, col, num) => {
  for (let i = 0; i < SIZE; i++) {
    if (board[row][i] === num || board[i][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[boxRow + r][boxCol + c] === num) return false;
    }
  }
  return true;
};

const fillBoard = (board, idx = 0) => {
  if (idx === SIZE * SIZE) return true;
  const row = Math.floor(idx / SIZE);
  const col = idx % SIZE;
  if (board[row][col] !== 0) return fillBoard(board, idx + 1);
  const nums = shuffle(range(SIZE).map((n) => n + 1));
  for (const num of nums) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      if (fillBoard(board, idx + 1)) return true;
      board[row][col] = 0;
    }
  }
  return false;
};

const generateSudoku = () => {
  const solution = Array(SIZE)
    .fill(0)
    .map(() => Array(SIZE).fill(0));
  fillBoard(solution);
  const puzzle = solution.map((row) => row.slice());
  let holes = 40;
  while (holes > 0) {
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      holes--;
    }
  }
  return { puzzle, solution };
};

const Sudoku = () => {
  const [{ puzzle, solution }, setGame] = useState({ puzzle: [], solution: [] });
  const [board, setBoard] = useState([]);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const { puzzle, solution } = generateSudoku();
    setGame({ puzzle, solution });
    setBoard(puzzle.map((r) => r.slice()));
  }, []);

  const handleChange = (r, c, value) => {
    if (!puzzle[r] || puzzle[r][c] !== 0) return;
    const v = parseInt(value, 10);
    const newBoard = board.map((row) => row.slice());
    if (!v || v < 1 || v > 9) newBoard[r][c] = 0;
    else newBoard[r][c] = v;
    setBoard(newBoard);
    if (newBoard.flat().every((n, i) => n === solution[Math.floor(i / 9)][i % 9])) {
      setCompleted(true);
    }
  };

  const reset = () => {
    const { puzzle, solution } = generateSudoku();
    setGame({ puzzle, solution });
    setBoard(puzzle.map((r) => r.slice()));
    setCompleted(false);
  };

  if (board.length === 0)
    return (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading...
      </div>
    );

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div className="grid grid-cols-9" style={{ gap: '2px' }}>
        {board.map((row, r) =>
          row.map((val, c) => {
            const original = puzzle[r][c] !== 0;
            const wrong = !original && val !== 0 && val !== solution[r][c];
            return (
              <input
                key={`${r}-${c}`}
                className={`w-8 h-8 text-center text-black ${original ? 'bg-gray-300' : 'bg-white'} ${
                  wrong ? 'text-red-500' : ''
                }`}
                value={val === 0 ? '' : val}
                onChange={(e) => handleChange(r, c, e.target.value)}
                maxLength={1}
                disabled={original}
              />
            );
          })
        )}
      </div>
      {completed && <div className="mt-4">Completed!</div>}
      <button className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={reset}>
        New Game
      </button>
    </div>
  );
};

export default Sudoku;

