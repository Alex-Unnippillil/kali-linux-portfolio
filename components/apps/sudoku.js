import React, { useState, useEffect, useRef, useMemo } from 'react';
import { generateSudoku, isLegalMove } from '../../apps/games/sudoku';
import { getHint } from '../../workers/sudokuSolver';
import {
  createCell,
  cloneCell,
  cellsToBoard,
  sanitizeAllCandidates,
  toggleCandidateIfLegal,
} from '../../apps/games/sudoku/cell';
import HelpOverlay from './HelpOverlay';

const SIZE = 9;
const range = (n) => Array.from({ length: n }, (_, i) => i);

const dailySeed = () => {
  const str = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
};

const Sudoku = () => {
  const [difficulty, setDifficulty] = useState('easy');
  const [useDaily, setUseDaily] = useState(true);
  const [puzzle, setPuzzle] = useState([]);
  const [board, setBoard] = useState([]); // Cell[][]
  const [solution, setSolution] = useState([]);
  const [pencilMode, setPencilMode] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [time, setTime] = useState(0);
  const [hint, setHint] = useState('');
  const [hintCells, setHintCells] = useState([]);
  const [ariaMessage, setAriaMessage] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
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
  }, [completed]);

  const startGame = (seed) => {
    const { puzzle, solution } = generateSudoku(difficulty, seed);
    setPuzzle(puzzle);
    setBoard(puzzle.map((row) => row.map((v) => createCell(v))));
    setSolution(solution);
    setCompleted(false);
    setHint('');
    setHintCells([]);
    setSelectedCell(null);
    setTime(0);
    setMistakes(0);
    setHintsUsed(0);
  };

  const handleValue = (r, c, value, forcePencil = false) => {
    if (puzzle[r][c] !== 0) return;
    const v = parseInt(value, 10);
    const newBoard = board.map((row) => row.map((cell) => cloneCell(cell)));
    const matrix = cellsToBoard(newBoard);
    const cell = newBoard[r][c];
    if (pencilMode || forcePencil) {
      if (v >= 1 && v <= 9) {
        const success = toggleCandidateIfLegal(
          newBoard,
          r,
          c,
          v,
          (rr, cc, n) => isLegalMove(matrix, rr, cc, n),
        );
        if (!success) setAriaMessage(`Cannot pencil ${v} at row ${r + 1}, column ${c + 1}`);
      }
    } else {
      const val = !v || v < 1 || v > 9 ? 0 : v;
      if (val !== 0 && !isLegalMove(matrix, r, c, val)) {
        setAriaMessage(`Move at row ${r + 1}, column ${c + 1} invalid`);
        return;
      }
      cell.value = val;
      cell.candidates = [];
      let countedMistake = false;
      if (val !== 0 && hasConflict(newBoard, r, c, val)) {
        setMistakes((m) => m + 1);
        countedMistake = true;
        setAriaMessage(`Move at row ${r + 1}, column ${c + 1} invalid`);
      }
      if (hasConflict(newBoard, r, c, cell.value)) {
        if (!countedMistake) setMistakes((m) => m + 1);
        countedMistake = true;
        setAriaMessage(`Conflict at row ${r + 1}, column ${c + 1}`);
      } else if (
        solution.length > 0 &&
        cell.value !== 0 &&
        cell.value !== solution[r][c]
      ) {
        if (!countedMistake) setMistakes((m) => m + 1);
        setAriaMessage(`Incorrect value at row ${r + 1}, column ${c + 1}`);
      }
      if (isBoardComplete(newBoard)) {
        setCompleted(true);
        setAriaMessage('Sudoku completed');
      }
    }
    sanitizeAllCandidates(newBoard, (rr, cc, n) => isLegalMove(cellsToBoard(newBoard), rr, cc, n));
    setBoard(newBoard);
  };

  const handleKeyDown = (e, r, c) => {
    if (e.key >= '1' && e.key <= '9') {
      if (pencilMode || e.shiftKey) {
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

  const getHintHandler = () => {
    const h = getHint(cellsToBoard(board));
    if (h) {
      setHintsUsed((count) => count + 1);
      if (h.type === 'pair') {
        setHint(
          `Cells (${h.cells[0].r + 1},${h.cells[0].c + 1}) and (${h.cells[1].r + 1},${h.cells[1].c + 1}) form ${h.values.join(", ")}`,
        );
        setHintCells(h.cells);
        setAriaMessage('Pair hint available');
      } else {
        setHint(`Cell (${h.r + 1},${h.c + 1}) must be ${h.value}`);
        setHintCells([{ r: h.r, c: h.c }]);
        setAriaMessage(`Hint: row ${h.r + 1} column ${h.c + 1} is ${h.value}`);
      }
    } else {
      setHint('No hints available');
      setHintCells([]);
      setAriaMessage('No hints available');
    }
  };

  const inputRefs = useRef(
    Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  );

  const hasConflict = (b, r, c, val) => {
    if (val === 0) return false;
    for (let i = 0; i < SIZE; i++) {
      if (i !== c && b[r][i].value === val) return true;
      if (i !== r && b[i][c].value === val) return true;
    }
    const boxRow = Math.floor(r / 3) * 3;
    const boxCol = Math.floor(c / 3) * 3;
    for (let rr = 0; rr < 3; rr++) {
      for (let cc = 0; cc < 3; cc++) {
        const nr = boxRow + rr;
        const nc = boxCol + cc;
        if ((nr !== r || nc !== c) && b[nr][nc].value === val) return true;
      }
    }
    return false;
  };

  const isBoardComplete = (b) => {
    for (let r = 0; r < SIZE; r++) {
      const row = b[r].map((c) => c.value);
      if (row.includes(0) || new Set(row).size !== SIZE) return false;
    }
    for (let c = 0; c < SIZE; c++) {
      const col = [];
      for (let r = 0; r < SIZE; r++) col.push(b[r][c].value);
      if (col.includes(0) || new Set(col).size !== SIZE) return false;
    }
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const box = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            box.push(b[br * 3 + r][bc * 3 + c].value);
          }
        }
        if (box.includes(0) || new Set(box).size !== SIZE) return false;
      }
    }
    return true;
  };

  const filledCells = useMemo(() => {
    if (!board || board.length === 0) return 0;
    return board.reduce(
      (sum, row) =>
        sum +
        row.reduce((rowSum, cell) => {
          if (cell.value !== 0) return rowSum + 1;
          return rowSum;
        }, 0),
      0,
    );
  }, [board]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [time]);

  const handleNumberPadInput = (value, { pencil = false } = {}) => {
    if (!selectedCell) {
      setAriaMessage('Select a cell before entering a value');
      return;
    }
    if (value === 'clear') {
      handleValue(selectedCell.r, selectedCell.c, '');
      return;
    }
    const shouldPencil = pencilMode || pencil;
    if (shouldPencil && value === '') return;
    if (shouldPencil) {
      handleValue(selectedCell.r, selectedCell.c, value, true);
    } else {
      handleValue(selectedCell.r, selectedCell.c, value);
    }
    inputRefs.current[selectedCell.r][selectedCell.c]?.focus();
  };

  const progressPercent = useMemo(
    () => Math.round((filledCells / (SIZE * SIZE)) * 100),
    [filledCells],
  );

  if (board.length === 0)
    return (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading...
      </div>
    );

  return (
    <div className="relative h-full w-full overflow-y-auto bg-ub-cool-grey text-white">
      <div className="sr-only" aria-live="polite">
        {ariaMessage}
      </div>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base">
              <label className="flex items-center gap-2" title="Select puzzle difficulty">
                <span className="text-white/70">Difficulty</span>
                <select
                  className="rounded-md border border-white/10 bg-white/10 px-2 py-1 font-medium text-white transition hover:bg-white/20 focus:border-sky-400 focus:outline-none"
                  value={difficulty}
                  onChange={(e) => {
                    setDifficulty(e.target.value);
                    startGame(useDaily ? dailySeed() : Date.now());
                  }}
                >
                  <option className="text-black" value="easy">
                    Easy
                  </option>
                  <option className="text-black" value="medium">
                    Medium
                  </option>
                  <option className="text-black" value="hard">
                    Hard
                  </option>
                </select>
              </label>
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-sm font-semibold uppercase tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400 focus-visible:ring-offset-black/60 ${
                  useDaily
                    ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                    : 'border-white/20 bg-white/5 text-white/80'
                }`}
                onClick={() => {
                  setUseDaily(!useDaily);
                  startGame(!useDaily ? dailySeed() : Date.now());
                }}
                title={useDaily ? 'Switch to a random puzzle' : 'Play today\'s daily puzzle'}
              >
                {useDaily ? 'Daily Challenge' : 'Random Puzzle'}
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400 focus-visible:ring-offset-black/60 ${
                  pencilMode
                    ? 'bg-sky-500/30 text-sky-200 ring-1 ring-sky-400'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                onClick={() => setPencilMode((prev) => !prev)}
                aria-pressed={pencilMode}
                title="Toggle candidate pencil mode (Shift+number also toggles)"
              >
                Pencil Mode
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                onClick={getHintHandler}
                title="Reveal a logical hint with highlighted cells"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-amber-300 group-hover:animate-pulse" aria-hidden="true" />
                Hint
              </button>
              <button
                type="button"
                className="rounded-lg border border-sky-400/30 bg-sky-500/20 px-3 py-1 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                onClick={() => startGame(useDaily ? dailySeed() : Date.now())}
                title="Restart with a fresh puzzle"
              >
                New Game
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                onClick={() => setShowHelp(true)}
                title="View Sudoku controls"
              >
                Help
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex flex-1 flex-col items-center gap-4">
              <div
                className="w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-3 shadow-inner"
                role="grid"
                aria-label="Sudoku board"
              >
                <div className="grid grid-cols-9 gap-[2px]">
                  {board.map((row, r) => (
                    <React.Fragment key={`row-${r}`}>
                      {row.map((cell, c) => {
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
                        const wrong =
                          !original && solution.length > 0 && val !== 0 && val !== solution[r][c];

                        const borderClasses = [
                          r % 3 === 0 ? 'border-t border-white/10' : 'border-t border-white/5',
                          c % 3 === 0 ? 'border-l border-white/10' : 'border-l border-white/5',
                          r === SIZE - 1 ? 'border-b border-white/10' : '',
                          c === SIZE - 1 ? 'border-r border-white/10' : '',
                        ]
                          .filter(Boolean)
                          .join(' ');

                        return (
                          <div
                            key={`${r}-${c}`}
                            className={`relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/95 font-mono text-lg transition duration-200 ease-out sm:h-12 sm:w-12 ${
                              original ? 'text-slate-800' : 'text-slate-900'
                            } ${
                              isSelected
                                ? 'ring-2 ring-offset-2 ring-offset-slate-900/70 ring-sky-400'
                                : inHighlight
                                ? 'bg-sky-100/80'
                                : ''
                            } ${sameDigit ? 'same-digit-glow' : ''} ${
                              conflict
                                ? 'conflict-cell'
                                : wrong
                                ? 'bg-rose-200/90 text-rose-900'
                                : ''
                            } ${isHint ? 'hint-cell' : ''} ${borderClasses}`}
                            role="gridcell"
                            aria-selected={isSelected}
                            aria-label={`Row ${r + 1} Column ${c + 1}${original ? ' given value' : ''}`}
                          >
                            <input
                              className={`peer h-full w-full ${
                                original ? 'cursor-not-allowed' : 'cursor-text'
                              } bg-transparent text-center text-xl font-semibold leading-none outline-none transition focus:outline-none sm:text-2xl ${
                                conflict ? 'text-rose-100' : ''
                              } ${wrong ? 'text-rose-900' : ''}`}
                              ref={(el) => (inputRefs.current[r][c] = el)}
                              onKeyDown={(e) => handleKeyDown(e, r, c)}
                              aria-label={`Row ${r + 1} Column ${c + 1}${original ? ' given value' : ''}`}
                              aria-invalid={conflict || wrong}
                              value={val === 0 ? '' : val}
                              onChange={(e) => handleValue(r, c, e.target.value)}
                              onFocus={() => setSelectedCell({ r, c })}
                              onClick={() => setSelectedCell({ r, c })}
                              maxLength={1}
                              disabled={original}
                              inputMode="numeric"
                            />
                            {cell.candidates.length > 0 && val === 0 && (
                              <div className="pointer-events-none absolute inset-[2px] grid grid-cols-3 gap-[1px] rounded-md bg-white/60 text-[10px] font-semibold leading-3 text-slate-600">
                                {range(9).map((n) => (
                                  <div key={n} className="flex items-center justify-center">
                                    {cell.candidates.includes(n + 1) ? n + 1 : ''}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {hint && (
                <div
                  className="w-full rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-200 transition-opacity"
                  aria-live="polite"
                >
                  {hint}
                </div>
              )}
            </div>

            <aside className="flex w-full flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-sm sm:text-base lg:w-72">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/50">
                <span>Statistics</span>
                {completed && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">Solved</span>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-base">
                <div className="flex flex-col rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white/80">
                  <span className="text-xs uppercase tracking-wide text-white/50">Timer</span>
                  <span className="text-lg font-semibold text-white">{formattedTime}</span>
                </div>
                <div className="flex flex-col rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white/80">
                  <span className="text-xs uppercase tracking-wide text-white/50">Mistakes</span>
                  <span className="text-lg font-semibold text-rose-200">{mistakes}</span>
                </div>
                <div className="flex flex-col rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white/80">
                  <span className="text-xs uppercase tracking-wide text-white/50">Hints Used</span>
                  <span className="text-lg font-semibold text-amber-200">{hintsUsed}</span>
                </div>
                <div className="flex flex-col rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white/80">
                  <span className="text-xs uppercase tracking-wide text-white/50">Progress</span>
                  <span className="text-lg font-semibold text-emerald-200">{progressPercent}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/50">
                  <span>Number Pad</span>
                  <span>Tap or press keys</span>
                </div>
                <div className="grid grid-cols-5 gap-2" role="group" aria-label="Number pad">
                  {range(9).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="rounded-lg border border-white/10 bg-white/10 py-2 font-semibold text-white transition hover:translate-y-[-1px] hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      onClick={() => handleNumberPadInput(String(n + 1))}
                      title={`Enter ${n + 1}`}
                    >
                      {n + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`col-span-2 rounded-lg border px-3 py-2 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      pencilMode
                        ? 'border-sky-400/40 bg-sky-500/30 text-sky-100'
                        : 'border-white/10 bg-white/10 text-white hover:bg-white/20'
                    }`}
                    onClick={() => setPencilMode((prev) => !prev)}
                    aria-pressed={pencilMode}
                    title="Toggle pencil mode for number pad entries"
                  >
                    Notes
                  </button>
                  <button
                    type="button"
                    className="col-span-3 rounded-lg border border-white/10 bg-white/10 py-2 font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    onClick={() => handleNumberPadInput('clear')}
                    title="Clear selected cell"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs leading-relaxed text-white/60">
                <p>
                  Navigate with arrow keys, toggle pencil mode with Shift or the Pencil button, and use hints to discover logical
                  moves. Conflicts glow red, matched digits shimmer softly, and hints highlight the best next step.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
      {showHelp && <HelpOverlay gameId="sudoku" onClose={() => setShowHelp(false)} />}
      <style jsx>{`
        .conflict-cell {
          background: rgba(248, 113, 113, 0.85);
          color: #fff;
          box-shadow: 0 0 12px rgba(248, 113, 113, 0.55);
        }
        .hint-cell {
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.5);
          animation: hintPulse 1.6s ease-in-out infinite;
        }
        .same-digit-glow {
          box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.6);
        }
        @keyframes hintPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(251, 191, 36, 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .hint-cell {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Sudoku;
