'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { generateSudoku, isValidPlacement, SIZE, type Difficulty } from './generator';
import { getHint } from '../../workers/sudokuSolver';
import {
  type Cell,
  createCell,
  cloneCell,
  toggleCandidate,
  cellsToBoard,
} from './cell';

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

const dailySeed = (): number => {
  const str = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
};

type Coordinates = { r: number; c: number };

const hasConflict = (board: Cell[][], r: number, c: number, val: number): boolean => {
  if (val === 0) return false;
  for (let i = 0; i < SIZE; i++) {
    if (i !== c && board[r][i].value === val) return true;
    if (i !== r && board[i][c].value === val) return true;
  }
  const boxRow = Math.floor(r / 3) * 3;
  const boxCol = Math.floor(c / 3) * 3;
  for (let rr = 0; rr < 3; rr++) {
    for (let cc = 0; cc < 3; cc++) {
      const cell = board[boxRow + rr][boxCol + cc];
      if ((boxRow + rr !== r || boxCol + cc !== c) && cell.value === val) return true;
    }
  }
  return false;
};

const isBoardComplete = (board: Cell[][]): boolean => {
  for (let r = 0; r < SIZE; r++) {
    const row = board[r].map((c) => c.value);
    if (row.includes(0) || new Set(row).size !== SIZE) return false;
  }
  for (let c = 0; c < SIZE; c++) {
    const col: number[] = [];
    for (let r = 0; r < SIZE; r++) col.push(board[r][c].value);
    if (col.includes(0) || new Set(col).size !== SIZE) return false;
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box: number[] = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          box.push(board[br * 3 + r][bc * 3 + c].value);
        }
      }
      if (box.includes(0) || new Set(box).size !== SIZE) return false;
    }
  }
  return true;
};

const Sudoku = (): JSX.Element => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [useDaily, setUseDaily] = useState(true);
  const [puzzle, setPuzzle] = useState<number[][]>([]);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [pencilMode, setPencilMode] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [time, setTime] = useState(0);
  const [hint, setHint] = useState('');
  const [hintCells, setHintCells] = useState<Coordinates[]>([]);
  const [ariaMessage, setAriaMessage] = useState('');
  const [selectedCell, setSelectedCell] = useState<Coordinates | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: SIZE }, () => Array(SIZE).fill(null)),
  );

  const startGame = (seed: number, level: Difficulty = difficulty) => {
    const { puzzle, solution } = generateSudoku(level, seed);
    setPuzzle(puzzle);
    setBoard(puzzle.map((row) => row.map((v) => createCell(v))));
    setSolution(solution);
    setCompleted(false);
    setHint('');
    setHintCells([]);
    setSelectedCell(null);
    setTime(0);
    setAriaMessage('');
  };

  useEffect(() => {
    startGame(useDaily ? dailySeed() : Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (completed) {
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [completed, puzzle]);

  const handleValue = (r: number, c: number, value: string, forcePencil = false) => {
    if (puzzle[r][c] !== 0) return;
    const v = parseInt(value, 10);
    const newBoard = board.map((row) => row.map((cell) => cloneCell(cell)));
    const cell = newBoard[r][c];
    if (pencilMode || forcePencil) {
      if (v >= 1 && v <= 9) toggleCandidate(cell, v);
    } else {
      const val = Number.isNaN(v) || v < 1 || v > 9 ? 0 : v;
      if (val !== 0 && !isValidPlacement(cellsToBoard(newBoard), r, c, val)) {
        setAriaMessage(`Move at row ${r + 1}, column ${c + 1} invalid`);
        return;
      }
      cell.value = val;
      cell.candidates = [];
      if (hasConflict(newBoard, r, c, cell.value)) {
        setAriaMessage(`Conflict at row ${r + 1}, column ${c + 1}`);
      } else if (solution.length > 0 && cell.value !== 0 && cell.value !== solution[r][c]) {
        setAriaMessage(`Incorrect value at row ${r + 1}, column ${c + 1}`);
      } else {
        setAriaMessage('');
      }
      if (isBoardComplete(newBoard)) {
        setCompleted(true);
        setAriaMessage('Sudoku completed');
      }
    }
    setBoard(newBoard);
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    r: number,
    c: number,
  ) => {
    if (e.key >= '1' && e.key <= '9') {
      if (pencilMode || e.shiftKey) {
        e.preventDefault();
        handleValue(r, c, e.key, true);
      }
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      let nr = r;
      let nc = c;
      if (e.key === 'ArrowUp') nr = r > 0 ? r - 1 : r;
      if (e.key === 'ArrowDown') nr = r < SIZE - 1 ? r + 1 : r;
      if (e.key === 'ArrowLeft') nc = c > 0 ? c - 1 : c;
      if (e.key === 'ArrowRight') nc = c < SIZE - 1 ? c + 1 : c;
      inputRefs.current[nr][nc]?.focus();
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      handleValue(r, c, '0');
    }
  };

  const getHintHandler = () => {
    const hintResult = getHint(cellsToBoard(board));
    if (hintResult) {
      if (hintResult.type === 'pair') {
        setHint(
          `Cells (${hintResult.cells[0].r + 1},${hintResult.cells[0].c + 1}) and (${hintResult.cells[1].r + 1},${hintResult.cells[1].c + 1}) form ${hintResult.values.join(', ')}`,
        );
        setHintCells(hintResult.cells);
        setAriaMessage('Pair hint available');
      } else {
        setHint(`Cell (${hintResult.r + 1},${hintResult.c + 1}) must be ${hintResult.value}`);
        setHintCells([{ r: hintResult.r, c: hintResult.c }]);
        setAriaMessage(`Hint: row ${hintResult.r + 1} column ${hintResult.c + 1} is ${hintResult.value}`);
      }
    } else {
      setHint('No hints available');
      setHintCells([]);
      setAriaMessage('No hints available');
    }
  };

  if (board.length === 0)
    return (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading...
      </div>
    );

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 select-none overflow-y-auto">
      <div className="sr-only" aria-live="polite">
        {ariaMessage}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <select
          className="text-black p-1"
          value={difficulty}
          onChange={(e) => {
            const nextDifficulty = e.target.value as Difficulty;
            setDifficulty(nextDifficulty);
            startGame(useDaily ? dailySeed() : Date.now(), nextDifficulty);
          }}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={pencilMode}
            aria-label="Toggle pencil mode"
            onChange={(e) => setPencilMode(e.target.checked)}
          />
          <span>Pencil</span>
        </label>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={getHintHandler}>
          Hint
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => startGame(useDaily ? dailySeed() : Date.now())}
        >
          New Game
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => {
            setUseDaily((prev) => {
              const next = !prev;
              startGame(next ? dailySeed() : Date.now());
              return next;
            });
          }}
        >
          {useDaily ? 'Daily' : 'Random'}
        </button>
      </div>
      <div className="mb-2">
        Time: {Math.floor(time / 60)}:{('0' + (time % 60)).slice(-2)}
      </div>
      <div className="grid grid-cols-9" style={{ gap: '2px' }}>
        {board.map((row, r) =>
          row.map((cell, c) => {
            const original = puzzle[r][c] !== 0;
            const val = cell.value;
            const isHint = hintCells.some((h) => h.r === r && h.c === c);
            const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
            const inHighlight =
              selectedCell &&
              (selectedCell.r === r ||
                selectedCell.c === c ||
                (Math.floor(selectedCell.r / 3) === Math.floor(r / 3) &&
                  Math.floor(selectedCell.c / 3) === Math.floor(c / 3)));
            const sameDigit =
              selectedCell &&
              board[selectedCell.r][selectedCell.c].value !== 0 &&
              board[selectedCell.r][selectedCell.c].value === val;
            const conflict = hasConflict(board, r, c, val);
            const wrong = !original && solution.length > 0 && val !== 0 && val !== solution[r][c];
            return (
              <div
                key={`${r}-${c}`}
                className={`relative overflow-hidden w-8 h-8 sm:w-10 sm:h-10 focus-within:ring-2 focus-within:ring-blue-500 ${
                  original ? 'bg-gray-300' : 'bg-white'
                } ${inHighlight ? 'bg-yellow-100' : ''} ${isSelected ? 'bg-yellow-200' : ''} ${
                  sameDigit ? 'match-glow' : ''
                } ${
                  conflict ? 'bg-red-700 error-pulse' : wrong ? 'bg-red-600' : ''
                } ${isHint ? 'ring-2 ring-yellow-400' : ''}`}
              >
                <input
                  className={`w-full h-full text-center bg-transparent outline-none focus:outline-none ${
                    conflict || wrong ? 'text-white' : 'text-black'
                  }`}
                  ref={(el) => {
                    if (!inputRefs.current[r]) inputRefs.current[r] = [];
                    inputRefs.current[r][c] = el;
                  }}
                  onKeyDown={(e) => handleKeyDown(e, r, c)}
                  aria-label={`Row ${r + 1} Column ${c + 1}`}
                  value={val === 0 ? '' : val}
                  onChange={(e) => handleValue(r, c, e.target.value)}
                  onFocus={() => setSelectedCell({ r, c })}
                  onBlur={() => setSelectedCell(null)}
                  maxLength={1}
                  disabled={original}
                  inputMode="numeric"
                />
                {cell.candidates.length > 0 && val === 0 && (
                  <div className="absolute inset-0 grid grid-cols-3 text-[8px] leading-3 pointer-events-none">
                    {range(9).map((n) => (
                      <div key={n} className="flex items-center justify-center text-gray-700">
                        {cell.candidates.includes(n + 1) ? n + 1 : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>
      {completed && <div className="mt-2">Completed!</div>}
      {hint && <div className="mt-2 text-yellow-300">{hint}</div>}
      <style jsx>{`
        @keyframes errorPulse {
          0% { box-shadow: 0 0 0 0 rgba(248,113,113,0.7); }
          70% { box-shadow: 0 0 0 4px rgba(248,113,113,0); }
          100% { box-shadow: 0 0 0 0 rgba(248,113,113,0); }
        }
        .error-pulse {
          animation: errorPulse 1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .error-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default Sudoku;
