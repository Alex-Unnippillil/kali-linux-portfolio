import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generateSudoku, isLegalMove } from '../../apps/games/sudoku';
import { explainNextStep, getHint } from '../../workers/sudokuSolver';
import {
  cellsToBoard,
  cloneCell,
  createCell,
  sanitizeAllCandidates,
  toggleCandidateIfLegal,
} from '../../apps/games/sudoku/cell';
import {
  applyHistoryEntry,
  cellsEqual,
  cloneBoard,
  createPuzzleIdentity,
  deserializeBoard,
  formatLocalDate,
  pushHistory,
  safeParseJSON,
  serializeBoard,
} from '../../apps/games/sudoku/state';

const SIZE = 9;
const range = (n) => Array.from({ length: n }, (_, i) => i);

const STORAGE_KEYS = {
  settings: 'sudoku:last-settings',
  stats: 'sudoku:stats',
  puzzlePrefix: 'sudoku:puzzle:',
};

const defaultSettings = {
  difficulty: 'easy',
  mode: 'daily',
  pencilMode: false,
  highlightPeers: true,
  highlightSameDigit: true,
  showIncorrect: true,
};

const hasConflict = (board, r, c, val) => {
  if (val === 0) return false;
  for (let i = 0; i < SIZE; i++) {
    if (i !== c && board[r][i].value === val) return true;
    if (i !== r && board[i][c].value === val) return true;
  }
  const boxRow = Math.floor(r / 3) * 3;
  const boxCol = Math.floor(c / 3) * 3;
  for (let rr = 0; rr < 3; rr++) {
    for (let cc = 0; cc < 3; cc++) {
      const nr = boxRow + rr;
      const nc = boxCol + cc;
      if ((nr !== r || nc !== c) && board[nr][nc].value === val) return true;
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

const Sudoku = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [puzzleId, setPuzzleId] = useState('');
  const [seed, setSeed] = useState(Date.now());
  const [puzzle, setPuzzle] = useState([]);
  const [solution, setSolution] = useState([]);
  const [board, setBoard] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [time, setTime] = useState(0);
  const [hintSummary, setHintSummary] = useState('');
  const [hintStep, setHintStep] = useState(null);
  const [hintHighlights, setHintHighlights] = useState([]);
  const [hintEliminations, setHintEliminations] = useState([]);
  const [ariaMessage, setAriaMessage] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [hintsViewed, setHintsViewed] = useState(0);
  const [hintsApplied, setHintsApplied] = useState(0);
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);
  const [showCompletion, setShowCompletion] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [stats, setStats] = useState({});
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const inputRefs = useRef(Array.from({ length: SIZE }, () => Array(SIZE).fill(null)));
  const containerRef = useRef(null);

  const puzzleKey = puzzleId ? `${STORAGE_KEYS.puzzlePrefix}${puzzleId}` : null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedSettings = safeParseJSON(window.localStorage.getItem(STORAGE_KEYS.settings));
    if (storedSettings) {
      setSettings((prev) => ({ ...prev, ...storedSettings }));
      if (storedSettings.mode === 'random' && storedSettings.seed) {
        setSeed(storedSettings.seed);
      }
    }
    const storedStats = safeParseJSON(window.localStorage.getItem(STORAGE_KEYS.stats));
    if (storedStats) setStats(storedStats);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      setPaused(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    handleVisibility();
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const nowSeed = settings.mode === 'random' ? seed : Date.now();
    initializePuzzle(settings.mode, settings.difficulty, nowSeed, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.mode, settings.difficulty]);

  useEffect(() => {
    if (completed || paused || confirmNew || showCompletion) {
      clearInterval(timerRef.current);
      return;
    }
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [completed, paused, confirmNew, showCompletion]);

  useEffect(() => {
    if (!puzzleKey || typeof window === 'undefined') return;
    const payload = {
      puzzleId,
      seed,
      time,
      mistakes,
      hintsViewed,
      hintsApplied,
      settings,
      completed,
      board: serializeBoard(board),
    };
    try {
      window.localStorage.setItem(puzzleKey, JSON.stringify(payload));
      window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ...settings, seed }));
      window.localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
    } catch (error) {
      setAriaMessage('Unable to save game progress locally');
    }
  }, [puzzleKey, puzzleId, seed, time, mistakes, hintsViewed, hintsApplied, settings, completed, board, stats]);

  useEffect(() => {
    const handler = (event) => {
      const target = document.activeElement;
      if (!containerRef.current?.contains(target)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        handleRedo();
      }
      if (!event.metaKey && !event.ctrlKey) {
        if (event.key.toLowerCase() === 'p') {
          event.preventDefault();
          setSettings((prev) => ({ ...prev, pencilMode: !prev.pencilMode }));
        }
        if (event.key.toLowerCase() === 'h') {
          event.preventDefault();
          handleHint();
        }
        if (event.key.toLowerCase() === 'n') {
          event.preventDefault();
          handleNewPuzzleRequest();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const initializePuzzle = (mode, difficulty, nextSeed, allowRestore = false) => {
    const identity = createPuzzleIdentity(mode, difficulty, nextSeed);
    setPuzzleId(identity.id);
    setSeed(identity.seed);
    const { puzzle: nextPuzzle, solution: nextSolution } = generateSudoku(difficulty, identity.seed);
    setPuzzle(nextPuzzle);
    setSolution(nextSolution);

    if (allowRestore && typeof window !== 'undefined') {
      const stored = safeParseJSON(window.localStorage.getItem(`${STORAGE_KEYS.puzzlePrefix}${identity.id}`));
      if (stored?.board?.values) {
        const restoredBoard = deserializeBoard(stored.board.values, stored.board.candidates);
        setBoard(restoredBoard);
        setTime(stored.time ?? 0);
        setMistakes(stored.mistakes ?? 0);
        setHintsViewed(stored.hintsViewed ?? 0);
        setHintsApplied(stored.hintsApplied ?? 0);
        setCompleted(stored.completed ?? false);
        setHistoryPast([]);
        setHistoryFuture([]);
        setHintSummary('');
        setHintStep(null);
        setHintHighlights([]);
        setHintEliminations([]);
        return;
      }
    }

    setBoard(nextPuzzle.map((row) => row.map((value) => createCell(value))));
    setCompleted(false);
    setTime(0);
    setMistakes(0);
    setHintsViewed(0);
    setHintsApplied(0);
    setHistoryPast([]);
    setHistoryFuture([]);
    setHintSummary('');
    setHintStep(null);
    setHintHighlights([]);
    setHintEliminations([]);
  };

  const resetCurrentPuzzle = () => {
    setBoard(puzzle.map((row) => row.map((value) => createCell(value))));
    setCompleted(false);
    setTime(0);
    setMistakes(0);
    setHintsViewed(0);
    setHintsApplied(0);
    setHistoryPast([]);
    setHistoryFuture([]);
    setHintSummary('');
    setHintStep(null);
    setHintHighlights([]);
    setHintEliminations([]);
    if (puzzleKey && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(puzzleKey);
      } catch (error) {
        setAriaMessage('Unable to reset saved puzzle');
      }
    }
  };

  const handleNewPuzzleRequest = () => {
    if (filledCells > 0 && !completed) {
      setConfirmNew(true);
      return;
    }
    startNewPuzzle();
  };

  const startNewPuzzle = () => {
    if (settings.mode === 'random') {
      const newSeed = Date.now();
      setSeed(newSeed);
      initializePuzzle('random', settings.difficulty, newSeed, false);
    } else {
      resetCurrentPuzzle();
    }
    setConfirmNew(false);
  };

  const handleUndo = () => {
    if (historyPast.length === 0) return;
    const entry = historyPast[historyPast.length - 1];
    const nextBoard = applyHistoryEntry(board, entry, 'undo');
    setBoard(nextBoard);
    setHistoryPast(historyPast.slice(0, -1));
    setHistoryFuture([entry, ...historyFuture]);
    setAriaMessage('Undid last action');
  };

  const handleRedo = () => {
    if (historyFuture.length === 0) return;
    const entry = historyFuture[0];
    const nextBoard = applyHistoryEntry(board, entry, 'redo');
    setBoard(nextBoard);
    setHistoryFuture(historyFuture.slice(1));
    setHistoryPast(pushHistory(historyPast, entry));
    setAriaMessage('Redid last action');
  };

  const recordHistory = (entry) => {
    setHistoryPast((prev) => pushHistory(prev, entry));
    setHistoryFuture([]);
  };

  const updateCompletion = (nextBoard) => {
    if (isBoardComplete(nextBoard)) {
      setCompleted(true);
      setShowCompletion(true);
      setAriaMessage('Sudoku completed');
      updateStats(time);
    }
  };

  const updateStats = (finishTime) => {
    const modeKey = settings.mode;
    const difficultyKey = settings.difficulty;
    setStats((prev) => {
      const existing = prev?.[modeKey]?.[difficultyKey];
      const best = existing == null || finishTime < existing ? finishTime : existing;
      return {
        ...prev,
        [modeKey]: {
          ...prev?.[modeKey],
          [difficultyKey]: best,
        },
      };
    });
  };

  const handleValue = (r, c, value, forcePencil = false) => {
    if (puzzle[r][c] !== 0) return;
    const v = parseInt(value, 10);
    const newBoard = cloneBoard(board);
    const matrix = cellsToBoard(newBoard);
    const cell = newBoard[r][c];
    const previous = cloneCell(cell);

    if (settings.pencilMode || forcePencil) {
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
      if (val !== 0) {
        const conflict = hasConflict(newBoard, r, c, val);
        const incorrect = settings.showIncorrect && solution.length > 0 && val !== solution[r][c];
        if (conflict || incorrect) {
          setMistakes((m) => m + 1);
          setAriaMessage(
            conflict
              ? `Conflict at row ${r + 1}, column ${c + 1}`
              : `Incorrect value at row ${r + 1}, column ${c + 1}`,
          );
        }
      }
    }
    sanitizeAllCandidates(newBoard, (rr, cc, n) =>
      isLegalMove(cellsToBoard(newBoard), rr, cc, n),
    );
    if (!cellsEqual(previous, newBoard[r][c])) {
      recordHistory({ kind: settings.pencilMode || forcePencil ? 'candidate' : 'value', r, c, before: previous, after: cloneCell(newBoard[r][c]) });
    }
    setBoard(newBoard);
    updateCompletion(newBoard);
  };

  const handleKeyDown = (e, r, c) => {
    if (e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      if (settings.pencilMode || e.shiftKey) {
        handleValue(r, c, e.key, true);
      } else {
        handleValue(r, c, e.key);
      }
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      handleValue(r, c, '');
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

  const handleHint = () => {
    const explanation = explainNextStep(cellsToBoard(board));
    if (!explanation) {
      setHintSummary('No hints available');
      setHintStep(null);
      setHintHighlights([]);
      setHintEliminations([]);
      setAriaMessage('No hints available');
      return;
    }
    const summary = getHint(cellsToBoard(board));
    setHintsViewed((count) => count + 1);
    if (summary) {
      setHintSummary(`Technique: ${summary.technique}`);
    } else {
      setHintSummary(`Technique: ${explanation.technique}`);
    }
    setHintStep(explanation);
    if (explanation.kind === 'place') {
      setHintHighlights([{ r: explanation.r, c: explanation.c }, ...explanation.highlights]);
      setHintEliminations([]);
      setAriaMessage(`Hint ready for row ${explanation.r + 1}, column ${explanation.c + 1}`);
    } else {
      setHintHighlights(explanation.highlights);
      setHintEliminations(explanation.eliminations);
      setAriaMessage('Hint ready: elimination');
    }
  };

  const handleApplyHint = () => {
    if (!hintStep) return;
    if (hintStep.kind === 'place') {
      handleValue(hintStep.r, hintStep.c, String(hintStep.value));
      setHintsApplied((count) => count + 1);
      return;
    }
    const newBoard = cloneBoard(board);
    const changes = [];
    hintStep.eliminations.forEach((elim) => {
      const cell = newBoard[elim.r][elim.c];
      if (cell.value !== 0) return;
      const before = cloneCell(cell);
      cell.candidates = cell.candidates.filter((candidate) => !elim.remove.includes(candidate));
      const after = cloneCell(cell);
      if (!cellsEqual(before, after)) {
        changes.push({ r: elim.r, c: elim.c, before, after });
      }
    });
    if (changes.length === 0) {
      setAriaMessage('No candidates to remove for this hint');
      return;
    }
    sanitizeAllCandidates(newBoard, (rr, cc, n) =>
      isLegalMove(cellsToBoard(newBoard), rr, cc, n),
    );
    setBoard(newBoard);
    recordHistory({ kind: 'batch-candidates', changes });
    setHintsApplied((count) => count + 1);
    setAriaMessage('Hint applied');
  };

  const handleNumberPadInput = (value, { pencil = false } = {}) => {
    if (!selectedCell) {
      setAriaMessage('Select a cell before entering a value');
      return;
    }
    if (value === 'clear') {
      handleValue(selectedCell.r, selectedCell.c, '');
      return;
    }
    const shouldPencil = settings.pencilMode || pencil;
    if (shouldPencil && value === '') return;
    if (shouldPencil) {
      handleValue(selectedCell.r, selectedCell.c, value, true);
    } else {
      handleValue(selectedCell.r, selectedCell.c, value);
    }
    inputRefs.current[selectedCell.r][selectedCell.c]?.focus();
  };

  const shareResult = async () => {
    const dateLabel = settings.mode === 'daily' ? formatLocalDate(new Date()) : `seed ${seed}`;
    const best = stats?.[settings.mode]?.[settings.difficulty];
    const text = [
      `Sudoku ${settings.mode === 'daily' ? 'Daily' : 'Random'} (${settings.difficulty})`,
      `Puzzle: ${dateLabel}`,
      `Time: ${formattedTime}`,
      `Mistakes: ${mistakes}`,
      `Hints: ${hintsViewed} viewed / ${hintsApplied} applied`,
      best ? `Best: ${formatTime(best)}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setAriaMessage('Share summary copied to clipboard');
    } catch (error) {
      setAriaMessage('Unable to copy share summary');
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
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

  const formattedTime = useMemo(() => formatTime(time), [time]);

  const progressPercent = useMemo(
    () => Math.round((filledCells / (SIZE * SIZE)) * 100),
    [filledCells],
  );

  const hasProgress = filledCells > 0 && !completed;

  if (board.length === 0)
    return (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading...
      </div>
    );

  return (
    <div ref={containerRef} className="h-full w-full overflow-y-auto bg-ub-cool-grey text-white" tabIndex={0}>
      <div className="sr-only" aria-live="polite">
        {ariaMessage}
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base">
              <label className="flex items-center gap-2" title="Select puzzle difficulty">
                <span className="text-white/70">Difficulty</span>
                <select
                  className="rounded-md border border-white/10 bg-white/10 px-2 py-1 font-medium text-white transition hover:bg-white/20 focus:border-sky-400 focus:outline-none"
                  value={settings.difficulty}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      difficulty: e.target.value,
                    }))
                  }
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
                  settings.mode === 'daily'
                    ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                    : 'border-white/20 bg-white/5 text-white/80'
                }`}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    mode: prev.mode === 'daily' ? 'random' : 'daily',
                  }))
                }
                title={settings.mode === 'daily' ? 'Switch to a random puzzle' : "Play today's daily puzzle"}
              >
                {settings.mode === 'daily' ? 'Daily Challenge' : 'Random Puzzle'}
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400 focus-visible:ring-offset-black/60 ${
                  settings.pencilMode
                    ? 'bg-sky-500/30 text-sky-200 ring-1 ring-sky-400'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    pencilMode: !prev.pencilMode,
                  }))
                }
                aria-pressed={settings.pencilMode}
                title="Toggle candidate pencil mode (Shift+number also toggles)"
              >
                Pencil Mode
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                onClick={handleHint}
                title="Reveal a logical hint with highlighted cells"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-amber-300 group-hover:animate-pulse" aria-hidden="true" />
                Hint
              </button>
              <button
                type="button"
                className="rounded-lg border border-sky-400/30 bg-sky-500/20 px-3 py-1 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                onClick={handleNewPuzzleRequest}
                title="Start a fresh puzzle"
              >
                New Puzzle
              </button>
              <button
                type="button"
                className="rounded-lg border border-rose-400/30 bg-rose-500/20 px-3 py-1 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                onClick={resetCurrentPuzzle}
                title="Reset the current puzzle without changing the identity"
              >
                Reset Puzzle
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
                        const isHint = hintHighlights.some((h) => h.r === r && h.c === c);
                        const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
                        const inHighlight =
                          settings.highlightPeers &&
                          selectedCell &&
                          (selectedCell.r === r ||
                            selectedCell.c === c ||
                            (Math.floor(selectedCell.r / 3) === Math.floor(r / 3) &&
                              Math.floor(selectedCell.c / 3) === Math.floor(c / 3)));
                        const sameDigit =
                          settings.highlightSameDigit &&
                          selectedCell &&
                          board[selectedCell.r][selectedCell.c].value !== 0 &&
                          board[selectedCell.r][selectedCell.c].value === val;
                        const conflict = hasConflict(board, r, c, val);
                        const wrong =
                          settings.showIncorrect && !original && solution.length > 0 && val !== 0 && val !== solution[r][c];

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
                              onFocus={() => {
                                setSelectedCell({ r, c });
                                setAriaMessage(`Row ${r + 1}, column ${c + 1} selected`);
                              }}
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

              {hintSummary && (
                <div
                  className="w-full rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-200 transition-opacity"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between">
                    <span>{hintSummary}</span>
                    {hintStep && (
                      <button
                        type="button"
                        className="rounded-md border border-amber-400/40 px-2 py-0.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                        onClick={handleApplyHint}
                        aria-label="Apply hint"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                  {hintStep && (
                    <div className="mt-2 text-xs text-amber-100/80">
                      <div className="font-semibold uppercase tracking-wide text-amber-100/60">Explain</div>
                      <div className="mt-1">{hintStep.reason}</div>
                      {hintStep.kind === 'eliminate' && hintEliminations.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {hintEliminations.map((elim) => (
                            <li key={`${elim.r}-${elim.c}`}>Remove {elim.remove.join(', ')} from row {elim.r + 1}, col {elim.c + 1}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="flex w-full flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-sm sm:text-base lg:w-80">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/50">
                <span>Statistics</span>
                {completed && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">Solved</span>
                )}
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
                  <span className="text-xs uppercase tracking-wide text-white/50">Hints</span>
                  <span className="text-lg font-semibold text-amber-200">
                    {hintsViewed}/{hintsApplied}
                  </span>
                </div>
                <div className="flex flex-col rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white/80">
                  <span className="text-xs uppercase tracking-wide text-white/50">Progress</span>
                  <span className="text-lg font-semibold text-emerald-200">{progressPercent}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  className="rounded-lg border border-white/10 bg-white/10 py-2 font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  onClick={handleUndo}
                  disabled={historyPast.length === 0}
                  aria-label="Undo last move"
                  title="Undo (Ctrl/Cmd+Z)"
                >
                  Undo
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/10 bg-white/10 py-2 font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  onClick={handleRedo}
                  disabled={historyFuture.length === 0}
                  aria-label="Redo last move"
                  title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)"
                >
                  Redo
                </button>
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
                      settings.pencilMode
                        ? 'border-sky-400/40 bg-sky-500/30 text-sky-100'
                        : 'border-white/10 bg-white/10 text-white hover:bg-white/20'
                    }`}
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        pencilMode: !prev.pencilMode,
                      }))
                    }
                    aria-pressed={settings.pencilMode}
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
                  Arrow keys move, 1-9 enters values, Shift+1-9 toggles notes, P toggles pencil mode, H opens hints, N starts a new puzzle.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs leading-relaxed text-white/60">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/50">Highlights</div>
                <label className="mt-2 flex items-center justify-between gap-2">
                  <span>Row/Column/Box</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-sky-400"
                    aria-label="Highlight row, column, and box"
                    checked={settings.highlightPeers}
                    onChange={() =>
                      setSettings((prev) => ({
                        ...prev,
                        highlightPeers: !prev.highlightPeers,
                      }))
                    }
                  />
                </label>
                <label className="mt-2 flex items-center justify-between gap-2">
                  <span>Same digit</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-sky-400"
                    aria-label="Highlight same digits"
                    checked={settings.highlightSameDigit}
                    onChange={() =>
                      setSettings((prev) => ({
                        ...prev,
                        highlightSameDigit: !prev.highlightSameDigit,
                      }))
                    }
                  />
                </label>
                <label className="mt-2 flex items-center justify-between gap-2">
                  <span>Show incorrect</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-rose-400"
                    aria-label="Show incorrect entries"
                    checked={settings.showIncorrect}
                    onChange={() =>
                      setSettings((prev) => ({
                        ...prev,
                        showIncorrect: !prev.showIncorrect,
                      }))
                    }
                  />
                </label>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {confirmNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-4 text-white shadow-xl">
            <h2 className="text-lg font-semibold">Start a new puzzle?</h2>
            <p className="mt-2 text-sm text-white/70">
              You have progress on this puzzle. Starting a new puzzle will reset the current one.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/20 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
                onClick={() => setConfirmNew(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-rose-500/80 px-3 py-1 text-sm font-semibold text-white"
                onClick={startNewPuzzle}
              >
                Start new
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 text-white shadow-xl">
            <h2 className="text-xl font-semibold">Puzzle Complete</h2>
            <p className="mt-2 text-sm text-white/70">Great job! Here&apos;s your summary.</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Time</span>
                <span className="font-semibold">{formattedTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Mistakes</span>
                <span className="font-semibold">{mistakes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hints viewed/applied</span>
                <span className="font-semibold">{hintsViewed}/{hintsApplied}</span>
              </div>
              {stats?.[settings.mode]?.[settings.difficulty] != null && (
                <div className="flex items-center justify-between">
                  <span>Best</span>
                  <span className="font-semibold">{formatTime(stats[settings.mode][settings.difficulty])}</span>
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/20 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
                onClick={() => setShowCompletion(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="rounded-lg border border-emerald-400/40 px-3 py-1 text-sm text-emerald-100 hover:bg-emerald-500/20"
                onClick={shareResult}
              >
                Share
              </button>
              <button
                type="button"
                className="rounded-lg bg-sky-500/80 px-3 py-1 text-sm font-semibold text-white"
                onClick={() => {
                  setShowCompletion(false);
                  handleNewPuzzleRequest();
                }}
              >
                New puzzle
              </button>
            </div>
          </div>
        </div>
      )}
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
