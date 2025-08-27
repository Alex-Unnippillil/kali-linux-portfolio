import React, { useState, useEffect, useRef } from 'react';
import { ratePuzzle, getHint, solve } from '../../workers/sudokuSolver';

// Interactive Sudoku game with puzzle generation and solving utilities.
const SIZE = 9;
const range = (n) => Array.from({ length: n }, (_, i) => i);

// Pseudo random generator so daily puzzles are deterministic
const createRNG = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

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

// Backtracking solver used for generation and uniqueness checks
const solveBoard = (board, idx = 0, rng = Math.random) => {
  if (idx === SIZE * SIZE) return true;
  const row = Math.floor(idx / SIZE);
  const col = idx % SIZE;
  if (board[row][col] !== 0) return solveBoard(board, idx + 1, rng);
  const nums = shuffle(range(SIZE).map((n) => n + 1), typeof rng === 'function' ? rng : Math.random);
  for (const num of nums) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      if (solveBoard(board, idx + 1, rng)) return true;
      board[row][col] = 0;
    }
  }
  return false;
};

const countSolutions = (board, idx = 0, limit = 2) => {
  if (idx === SIZE * SIZE) return 1;
  const row = Math.floor(idx / SIZE);
  const col = idx % SIZE;
  if (board[row][col] !== 0) return countSolutions(board, idx + 1, limit);
  let count = 0;
  for (let num = 1; num <= SIZE && count < limit; num++) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      count += countSolutions(board, idx + 1, limit - count);
      board[row][col] = 0;
    }
  }
  return count;
};

const dailySeed = () => {
  const str = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
};

const getCandidates = (board, r, c) => {
  const cand = [];
  for (let n = 1; n <= SIZE; n++) if (isValid(board, r, c, n)) cand.push(n);
  return cand;
};

const HOLES_BY_DIFFICULTY = { easy: 35, medium: 45, hard: 55 };

/**
 * Generates a Sudoku puzzle and its solution.
 * @param {'easy'|'medium'|'hard'} difficulty - Desired puzzle difficulty.
 * @param {number} seed - Seed for deterministic generation.
 * @returns {{puzzle: number[][], solution: number[][]}}
 */
const generateSudoku = (difficulty = 'easy', seed = Date.now()) => {
  const rng = createRNG(seed);
  const board = Array(SIZE)
    .fill(0)
    .map(() => Array(SIZE).fill(0));
  solveBoard(board, 0, rng);
  const solution = board.map((row) => row.slice());
  const puzzle = board.map((row) => row.slice());
  let holes = HOLES_BY_DIFFICULTY[difficulty] || HOLES_BY_DIFFICULTY.easy;
  const positions = shuffle(range(SIZE * SIZE), rng);
  for (const pos of positions) {
    if (holes === 0) break;
    const r = Math.floor(pos / SIZE);
    const c = pos % SIZE;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    const copy = puzzle.map((row) => row.slice());
    if (countSolutions(copy) !== 1) {
      puzzle[r][c] = backup;
    } else {
      holes--;
    }
  }
  return { puzzle, solution };
};

const Sudoku = () => {
  const [difficulty, setDifficulty] = useState('easy');
  const [useDaily, setUseDaily] = useState(true);
  const [puzzle, setPuzzle] = useState([]);
  const [board, setBoard] = useState([]);
  const [notes, setNotes] = useState([]); // notes[r][c] = array of numbers
  const [noteMode, setNoteMode] = useState(false);
  const [autoNotes, setAutoNotes] = useState(false);
  const [hint, setHint] = useState('');
  const [hintCells, setHintCells] = useState([]);
  const [ratedDifficulty, setRatedDifficulty] = useState('');
  const [hintStats, setHintStats] = useState({});
  const [completed, setCompleted] = useState(false);
  const [time, setTime] = useState(0);
  const [bestTime, setBestTime] = useState(null);
  const timerRef = useRef(null);
  const [shimmerRows, setShimmerRows] = useState([]);
  const [shimmerCols, setShimmerCols] = useState([]);
  const [ariaMessage, setAriaMessage] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [manualNotes, setManualNotes] = useState(
    Array(SIZE)
      .fill(0)
      .map(() => Array(SIZE).fill(false)),
  );
  const [solution, setSolution] = useState([]);
  const inputRefs = useRef(
    Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  );

  const startGame = (seed) => {
    const { puzzle, solution } = generateSudoku(difficulty, seed);
    setPuzzle(puzzle);
    setBoard(puzzle.map((r) => r.slice()));
    setSolution(solution);
    const emptyNotes =
      Array(SIZE)
        .fill(0)
        .map(() => Array(SIZE).fill(0).map(() => []));
    setNotes(emptyNotes);
    const emptyManual =
      Array(SIZE)
        .fill(0)
        .map(() => Array(SIZE).fill(false));
    setManualNotes(emptyManual);
    setCompleted(false);
    setHint('');
    setHintCells([]);
    setSelectedCell(null);
    const { difficulty: rating, steps } = ratePuzzle(puzzle);
    setRatedDifficulty(rating);
    const stats = steps.reduce((acc, s) => {
      acc[s.technique] = (acc[s.technique] || 0) + 1;
      return acc;
    }, {});
    setHintStats(stats);
    setTime(0);
    setBestTime(() => {
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem(`sudoku-best-${difficulty}`);
      return stored ? parseInt(stored, 10) : null;
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sudoku-progress');
    }
    if (autoNotes) {
      const fresh = puzzle.map((r) => r.slice());
      applyAutoNotes(fresh, emptyManual, emptyNotes);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sudoku-progress');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setDifficulty(data.difficulty || 'easy');
          setUseDaily(data.useDaily ?? true);
          setPuzzle(data.puzzle);
          setBoard(data.board);
          setNotes(data.notes);
          setManualNotes(
            data.manualNotes ||
              Array(SIZE)
                .fill(0)
                .map(() => Array(SIZE).fill(false)),
          );
          setCompleted(data.completed);
          setTime(data.time || 0);
          if (data.solution) setSolution(data.solution);
          else
            try {
              const { solution } = solve(data.puzzle);
              setSolution(solution);
            } catch (e) {
              setSolution([]);
            }
          const stored = localStorage.getItem(
            `sudoku-best-${data.difficulty || 'easy'}`,
          );
          setBestTime(stored ? parseInt(stored, 10) : null);
          return;
        } catch (e) {
          // ignore malformed storage
        }
      }
    }
    startGame(useDaily ? dailySeed() : Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (completed) {
      clearInterval(timerRef.current);
    } else {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [completed, puzzle]);

  useEffect(() => {
    if (typeof window === 'undefined' || puzzle.length === 0) return;
    const data = {
      puzzle,
      board,
      notes,
      manualNotes,
      solution,
      difficulty,
      useDaily,
      time,
      completed,
    };
    localStorage.setItem('sudoku-progress', JSON.stringify(data));
  }, [board, notes, manualNotes, solution, time, puzzle, difficulty, useDaily, completed]);

  useEffect(() => {
    if (!completed || typeof window === 'undefined') return;
    const key = `sudoku-best-${difficulty}`;
    const stored = localStorage.getItem(key);
    if (!stored || time < parseInt(stored, 10)) {
      localStorage.setItem(key, time.toString());
      setBestTime(time);
    }
    localStorage.removeItem('sudoku-progress');
  }, [completed, time, difficulty]);

  const handleValue = (r, c, value, forceNote = false) => {
    if (!puzzle[r] || puzzle[r][c] !== 0) return;
    const v = parseInt(value, 10);
    const newBoard = board.map((row) => row.slice());
    const newNotes = notes.map((row) => row.map((n) => n.slice()));
    const newManual = manualNotes.map((row) => row.slice());
    if (noteMode || forceNote) {
      if (v >= 1 && v <= 9) {
        if (!newNotes[r][c].includes(v)) newNotes[r][c].push(v);
        else newNotes[r][c] = newNotes[r][c].filter((n) => n !== v);
      }
      newManual[r][c] = true;
    } else {
      newBoard[r][c] = !v || v < 1 || v > 9 ? 0 : v;
      newNotes[r][c] = [];
      newManual[r][c] = false;
    }
    setBoard(newBoard);
    setNotes(newNotes);
    setManualNotes(newManual);
    if (autoNotes) applyAutoNotes(newBoard, newManual, newNotes);
    if (!noteMode && !forceNote) {
      if (hasConflict(newBoard, r, c, newBoard[r][c])) {
        setAriaMessage(`Conflict at row ${r + 1}, column ${c + 1}`);
      } else if (
        solution.length > 0 &&
        newBoard[r][c] !== 0 &&
        newBoard[r][c] !== solution[r][c]
      ) {
        setAriaMessage(`Incorrect value at row ${r + 1}, column ${c + 1}`);
      }
      checkSolvedLines(newBoard, r, c);
      if (isBoardComplete(newBoard)) {
        setCompleted(true);
        setAriaMessage('Sudoku completed');
      }
    }
  };

  const handleKeyDown = (e, r, c) => {
    if (e.key >= '1' && e.key <= '9') {
      if (noteMode || e.shiftKey) {
        e.preventDefault();
        handleValue(r, c, e.key, true);
      }
      return;
    }
    if (
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight'
    ) {
      e.preventDefault();
      let nr = r;
      let nc = c;
      if (e.key === 'ArrowUp') nr = r > 0 ? r - 1 : r;
      if (e.key === 'ArrowDown') nr = r < SIZE - 1 ? r + 1 : r;
      if (e.key === 'ArrowLeft') nc = c > 0 ? c - 1 : c;
      if (e.key === 'ArrowRight') nc = c < SIZE - 1 ? c + 1 : c;
      inputRefs.current[nr][nc]?.focus();
    }
  };

  const applyAutoNotes = (b = board, m = manualNotes, n = notes) => {
    const newNotes = n.map((row) => row.map((nn) => nn.slice()));
    const newManual = m.map((row) => row.slice());
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c] === 0) {
          if (!newManual[r][c]) newNotes[r][c] = getCandidates(b, r, c);
        } else {
          newNotes[r][c] = [];
          newManual[r][c] = false;
        }
      }
    }
    setNotes(newNotes);
    setManualNotes(newManual);
  };

  const getHintHandler = () => {
    const h = getHint(board);
    if (h) {
      if (h.type === 'pair') {
        setHint(
          `Cells (${h.cells[0].r + 1},${h.cells[0].c + 1}) and (${h.cells[1].r + 1},${h.cells[1].c + 1}) form ${h.values.join(
            '/',
          )} (${h.technique})`,
        );
        setHintCells(h.cells);
        setAriaMessage('Pair hint available');
      } else {
        setHint(`Cell (${h.r + 1},${h.c + 1}) must be ${h.value} (${h.technique})`);
        setHintCells([{ r: h.r, c: h.c }]);
        setAriaMessage(`Hint: row ${h.r + 1} column ${h.c + 1} is ${h.value}`);
      }
    } else {
      setHint('No hints available');
      setHintCells([]);
      setAriaMessage('No hints available');
    }
  };

  const handleCheck = () => {
    let errors = 0;
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (board[r][c] !== 0 && board[r][c] !== solution[r][c]) errors += 1;
      }
    }
    setAriaMessage(
      errors ? `${errors} incorrect ${errors === 1 ? 'cell' : 'cells'}` : 'No errors found'
    );
  };

  const hasConflict = (b, r, c, val) => {
    if (val === 0) return false;
    for (let i = 0; i < SIZE; i++) {
      if (i !== c && b[r][i] === val) return true;
      if (i !== r && b[i][c] === val) return true;
    }
    const boxRow = Math.floor(r / 3) * 3;
    const boxCol = Math.floor(c / 3) * 3;
    for (let rr = 0; rr < 3; rr++) {
      for (let cc = 0; cc < 3; cc++) {
        const nr = boxRow + rr;
        const nc = boxCol + cc;
        if ((nr !== r || nc !== c) && b[nr][nc] === val) return true;
      }
    }
    return false;
  };

  const checkSolvedLines = (b, r, c) => {
    const rowSolved = !b[r].includes(0) && new Set(b[r]).size === SIZE;
    const colArr = [];
    for (let i = 0; i < SIZE; i++) colArr.push(b[i][c]);
    const colSolved = !colArr.includes(0) && new Set(colArr).size === SIZE;
    if (rowSolved && !shimmerRows.includes(r)) {
      requestAnimationFrame(() =>
        setShimmerRows((rows) => [...rows, r])
      );
      setAriaMessage(`Row ${r + 1} solved`);
      setTimeout(
        () => setShimmerRows((rows) => rows.filter((i) => i !== r)),
        1000
      );
    }
    if (colSolved && !shimmerCols.includes(c)) {
      requestAnimationFrame(() =>
        setShimmerCols((cols) => [...cols, c])
      );
      setAriaMessage(`Column ${c + 1} solved`);
      setTimeout(
        () => setShimmerCols((cols) => cols.filter((i) => i !== c)),
        1000
      );
    }
  };

  const isBoardComplete = (b) => {
    for (let r = 0; r < SIZE; r++) {
      const row = b[r];
      if (row.includes(0) || new Set(row).size !== SIZE) return false;
    }
    for (let c = 0; c < SIZE; c++) {
      const col = [];
      for (let r = 0; r < SIZE; r++) col.push(b[r][c]);
      if (col.includes(0) || new Set(col).size !== SIZE) return false;
    }
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const box = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            box.push(b[br * 3 + r][bc * 3 + c]);
          }
        }
        if (box.includes(0) || new Set(box).size !== SIZE) return false;
      }
    }
    return true;
  };

  if (board.length === 0)
    return (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading...
      </div>
    );

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 select-none overflow-y-auto">
      <div className="sr-only" aria-live="polite">{ariaMessage}</div>
      <div className="mb-2 flex space-x-2">
        <select
          className="text-black p-1"
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value);
            startGame(useDaily ? dailySeed() : Date.now());
          }}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <label className="flex items-center space-x-1">
          <input type="checkbox" checked={noteMode} onChange={(e) => setNoteMode(e.target.checked)} />
          <span>Notes</span>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={autoNotes}
            onChange={(e) => {
              setAutoNotes(e.target.checked);
              if (e.target.checked) applyAutoNotes();
            }}
          />
          <span>Auto</span>
        </label>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={handleCheck}
        >
          Check
        </button>
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
            setUseDaily(!useDaily);
            startGame(!useDaily ? dailySeed() : Date.now());
          }}
        >
          {useDaily ? 'Daily' : 'Random'}
        </button>
      </div>
      <div className="mb-2">
        Time: {Math.floor(time / 60)}:{('0' + (time % 60)).slice(-2)}
        {bestTime !== null && (
          <span className="ml-2 text-sm text-gray-300">
            Best: {Math.floor(bestTime / 60)}:{('0' + (bestTime % 60)).slice(-2)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-9" style={{ gap: '2px' }}>
        {board.map((row, r) =>
          row.map((val, c) => {
            const original = puzzle[r][c] !== 0;
            const conflict = hasConflict(board, r, c, val);
            const isHint = hintCells.some((h) => h.r === r && h.c === c);
            const shimmer = shimmerRows.includes(r) || shimmerCols.includes(c);
            const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
            const inHighlight =
              selectedCell &&
              (selectedCell.r === r ||
                selectedCell.c === c ||
                (Math.floor(selectedCell.r / 3) === Math.floor(r / 3) &&
                  Math.floor(selectedCell.c / 3) === Math.floor(c / 3)));
            const sameDigit =
              selectedCell &&
              board[selectedCell.r][selectedCell.c] !== 0 &&
              board[selectedCell.r][selectedCell.c] === val;
            const wrong =
              !original && solution.length > 0 && val !== 0 && val !== solution[r][c];
            return (
              <div
                key={`${r}-${c}`}
                className={`relative overflow-hidden w-8 h-8 sm:w-10 sm:h-10 focus-within:ring-2 focus-within:ring-blue-500 ${
                  original ? 'bg-gray-300' : 'bg-white'
                } ${inHighlight ? 'bg-yellow-100' : ''} ${
                  isSelected ? 'bg-yellow-200' : ''
                } ${sameDigit ? 'match-glow' : ''} ${
                  conflict
                    ? 'bg-red-700 error-pulse'
                    : wrong
                    ? 'bg-red-600'
                    : ''
                } ${shimmer ? 'shimmer' : ''} ${isHint ? 'ring-2 ring-yellow-400' : ''}`}
              >
                <input
                  className={`w-full h-full text-center bg-transparent outline-none focus:outline-none ${
                    conflict || wrong ? 'text-white' : 'text-black'
                  }`}
                  ref={(el) => (inputRefs.current[r][c] = el)}
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
                {notes[r][c].length > 0 && val === 0 && (
                  <div className="absolute inset-0 grid grid-cols-3 text-[8px] leading-3 pointer-events-none">
                    {range(9).map((n) => (
                      <div
                        key={n}
                        className={`flex items-center justify-center ${
                          notes[r][c].includes(n + 1) &&
                          !isValid(board, r, c, n + 1)
                            ? 'text-red-500'
                            : 'text-gray-700'
                        }`}
                      >
                        {notes[r][c].includes(n + 1) ? n + 1 : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {completed && <div className="mt-2">Completed!</div>}
      {hint && <div className="mt-2 text-yellow-300">{hint}</div>}
      {ratedDifficulty && (
        <div className="mt-2 text-gray-300">Difficulty: {ratedDifficulty}</div>
      )}
      {Object.keys(hintStats).length > 0 && (
        <div className="mt-1 text-xs text-gray-400">
          {Object.entries(hintStats).map(([k, v]) => (
            <div key={k}>
              {k}: {v}
            </div>
          ))}
        </div>
      )}
      <style jsx>{`
        @keyframes shimmer {
          from { background-position: -200% 0; }
          to { background-position: 200% 0; }
        }
        .shimmer {
          background-image: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.6), rgba(255,255,255,0));
          background-size: 200% 100%;
          animation: shimmer 1s linear;
        }
        .match-glow::after {
          content: '';
          position: absolute;
          inset: 0;
          box-shadow: 0 0 8px 2px rgba(250,204,21,0.8);
          pointer-events: none;
        }
        @keyframes errorPulse {
          0% { box-shadow: 0 0 0 0 rgba(248,113,113,0.7); }
          70% { box-shadow: 0 0 0 4px rgba(248,113,113,0); }
          100% { box-shadow: 0 0 0 0 rgba(248,113,113,0); }
        }
        .error-pulse {
          animation: errorPulse 1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .shimmer { animation: none; }
          .error-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default Sudoku;

