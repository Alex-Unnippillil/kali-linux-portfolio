import React, { useEffect, useState } from 'react';
import type { Board } from './types';
import { isValid } from './solver';

interface Props {
  puzzle: Board;
  solution: Board;
  storageKey: string;
  onComplete: () => void;
}

function cloneBoard(b: Board): Board {
  return b.map((row) => [...row]);
}

const BoardComponent: React.FC<Props> = ({ puzzle, solution, storageKey, onComplete }) => {
  const [board, setBoard] = useState<Board>(() => cloneBoard(puzzle));
  const [pencil, setPencil] = useState(false);
  const [errorFree, setErrorFree] = useState(false);
  const [marks, setMarks] = useState<Set<number>[][]>(() =>
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>()))
  );

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBoard(parsed.board);
        setMarks(
          parsed.marks.map((row: number[][]) => row.map((arr) => new Set(arr)))
        );
      } catch {
        // ignore
      }
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ board, marks: marks.map((row) => row.map((s) => Array.from(s))) })
    );
    const complete = board.every((row) => row.every((v) => v !== 0));
    if (complete) {
      const correct = board.every((row, r) => row.every((v, c) => v === solution[r][c]));
      if (correct) {
        localStorage.removeItem(storageKey);
        onComplete();
      }
    }
  }, [board, marks, storageKey, solution, onComplete]);

  const handleInput = (r: number, c: number, val: number) => {
    if (puzzle[r][c] !== 0) return;
    if (pencil) {
      const newMarks = marks.map((row) => row.map((s) => new Set(s)));
      if (newMarks[r][c].has(val)) newMarks[r][c].delete(val);
      else newMarks[r][c].add(val);
      setMarks(newMarks);
    } else {
      if (errorFree && val !== 0) {
        const temp = cloneBoard(board);
        temp[r][c] = 0;
        if (!isValid(temp, r, c, val)) return;
      }
      const newBoard = cloneBoard(board);
      newBoard[r][c] = val;
      setBoard(newBoard);
      const newMarks = marks.map((row) => row.map((s) => new Set(s)));
      newMarks[r][c].clear();
      setMarks(newMarks);
    }
  };

  const renderCell = (r: number, c: number) => {
    const val = board[r][c];
    const mark = marks[r][c];
    const prefilled = puzzle[r][c] !== 0;
    const cls = `w-10 h-10 border flex items-center justify-center text-lg font-bold select-none ${
      prefilled ? 'bg-gray-200' : 'cursor-pointer'
    }`;
    return (
      <div key={`${r}-${c}`} className={cls}>
        {val !== 0 ? (
          <span>{val}</span>
        ) : mark.size ? (
          <span className="text-xs leading-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9]
              .map((n) => (mark.has(n) ? n : '.'))
              .join('')}
          </span>
        ) : (
          ''
        )}
      </div>
    );
  };

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>, r: number, c: number) => {
    const num = parseInt(e.key, 10);
    if (Number.isInteger(num) && num >= 1 && num <= 9) {
      handleInput(r, c, num);
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      handleInput(r, c, 0);
    }
  };

  return (
    <div>
      <div className="mb-2 space-x-4">
        <label>
          <input type="checkbox" checked={pencil} onChange={(e) => setPencil(e.target.checked)} />
          {' '}Pencil Marks
        </label>
        <label>
          <input type="checkbox" checked={errorFree} onChange={(e) => setErrorFree(e.target.checked)} />
          {' '}Error Free
        </label>
      </div>
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(9, 2.5rem)', gridTemplateRows: 'repeat(9, 2.5rem)' }}
      >
        {board.map((row, r) =>
          row.map((_, c) => (
            <div
              key={`c-${r}-${c}`}
              tabIndex={0}
              onKeyDown={(e) => handleKey(e, r, c)}
              onClick={() => !pencil && handleInput(r, c, (board[r][c] % 9) + 1)}
            >
              {renderCell(r, c)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BoardComponent;
