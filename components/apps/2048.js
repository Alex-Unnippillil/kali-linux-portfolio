import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import useOPFS from '../../hooks/useOPFS.js';
import GameLayout, { useInputRecorder, useGameLayoutTheme } from './GameLayout';
import useGameControls from './useGameControls';
import { vibrate } from './Games/common/haptics';
import {
  random,
  reset as resetRng,
  serialize as serializeRng,
  deserialize as deserializeRng,
} from '../../apps/games/rng';
import { useSettings } from '../../hooks/useSettings';
import GameShell from '../games/GameShell';
import { startRecording as startReplayRecording, recordMove as recordReplayMove } from '../../games/2048/replay';

// Basic 2048 game logic with tile merging mechanics.

const SIZE = 4;
const UNDO_LIMIT = 5;

// seeded RNG so tests can be deterministic
export const setSeed = (seed) => resetRng(seed);

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
    const [r, c] = empty[Math.floor(random() * empty.length)];
    board[r][c] = hard ? 4 : random() < 0.9 ? 2 : 4;
    added.push(`${r}-${c}`);
  }
  return added;
};

const slide = (row) => {
  const arr = row.filter((n) => n !== 0);
  let merged = false;
  let score = 0;
  const mergedPositions = [];
  const newRow = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === arr[i + 1]) {
      const val = arr[i] * 2;
      newRow.push(val);
      score += val;
      merged = true;
      mergedPositions.push(newRow.length - 1);
      i++;
    } else {
      newRow.push(arr[i]);
    }
  }
  while (newRow.length < SIZE) newRow.push(0);
  return { row: newRow, merged, score, mergedPositions };
};

const transpose = (board) => board[0].map((_, c) => board.map((row) => row[c]));

const flip = (board) => board.map((row) => [...row].reverse());

const moveLeft = (board) => {
  let merged = false;
  let score = 0;
  const mergedCells = [];
  const newBoard = board.map((row, r) => {
    const res = slide(row);
    if (res.merged) merged = true;
    score += res.score;
    res.mergedPositions.forEach((c) => mergedCells.push(`${r}-${c}`));
    return res.row;
  });
  return { board: newBoard, merged, score, mergedCells };
};
const moveRight = (board) => {
  const flipped = flip(board);
  const moved = moveLeft(flipped);
  const mergedCells = moved.mergedCells.map((key) => {
    const [r, c] = key.split('-').map(Number);
    return `${r}-${SIZE - 1 - c}`;
  });
  return {
    board: flip(moved.board),
    merged: moved.merged,
    score: moved.score,
    mergedCells,
  };
};
const moveUp = (board) => {
  const transposed = transpose(board);
  const moved = moveLeft(transposed);
  const mergedCells = moved.mergedCells.map((key) => {
    const [r, c] = key.split('-').map(Number);
    return `${c}-${r}`;
  });
  return {
    board: transpose(moved.board),
    merged: moved.merged,
    score: moved.score,
    mergedCells,
  };
};
const moveDown = (board) => {
  const transposed = transpose(board);
  const moved = moveRight(transposed);
  const mergedCells = moved.mergedCells.map((key) => {
    const [r, c] = key.split('-').map(Number);
    return `${c}-${r}`;
  });
  return {
    board: transpose(moved.board),
    merged: moved.merged,
    score: moved.score,
    mergedCells,
  };
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

const TILE_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

const MIX_PERCENTAGES = {
  2: 12,
  4: 18,
  8: 28,
  16: 36,
  32: 44,
  64: 54,
  128: 62,
  256: 70,
  512: 78,
  1024: 86,
  2048: 90,
};

const createPalette = (skin) =>
  TILE_VALUES.reduce((acc, value) => {
    const pct = MIX_PERCENTAGES[value] || 50;
    acc[value] = `bg-[color:color-mix(in_srgb,var(--kali-panel)_${100 - pct}%,var(--game-2048-${skin}-${value}-hue)_${pct}%)] text-[color:var(--game-2048-${skin}-${value}-fg)]`;
    return acc;
  }, {});

const SKINS = {
  classic: createPalette('classic'),
  colorblind: createPalette('colorblind'),
  neon: createPalette('neon'),
};

const FALLBACK_TILE_CLASS = 'bg-slate-700/80 text-slate-100';
const EMPTY_TILE_CLASS =
  'bg-[color:var(--game-2048-empty-bg)] text-transparent shadow-inner border border-[color:var(--game-2048-empty-border)]';

const MILESTONES = [256, 512, 1024, 2048, 4096];

const validateHistory = (value) =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      entry &&
      typeof entry === 'object' &&
      typeof entry.score === 'number' &&
      typeof entry.bestTile === 'number' &&
      typeof entry.moves === 'number' &&
      typeof entry.date === 'string',
  );

const tileSymbols = {
  2: '●',
  4: '■',
  8: '▲',
  16: '◆',
  32: '✚',
  64: '★',
  128: '⬟',
  256: '⬢',
  512: '⬣',
  1024: '⬡',
  2048: '✦',
};

const validateBoard = (b) =>
  Array.isArray(b) &&
  b.length === SIZE &&
  b.every(
    (row) => Array.isArray(row) && row.length === SIZE && row.every((n) => typeof n === 'number'),
  );

const Game2048 = () => {
  const [seed, setSeedState] = usePersistentState('2048-seed', '', (v) => typeof v === 'string');
  const [board, setBoard] = usePersistentState('2048-board', initBoard, validateBoard);
  const [won, setWon] = usePersistentState('2048-won', false, (v) => typeof v === 'boolean');
  const [lost, setLost] = usePersistentState('2048-lost', false, (v) => typeof v === 'boolean');
  const [history, setHistory] = useState([]);
  const [moves, setMoves] = useState(0);
  const [hardMode, setHardMode] = usePersistentState('2048-hard', false, (v) => typeof v === 'boolean');
  const [skin, setSkin] = usePersistentState('2048-skin', 'classic', (v) => typeof v === 'string');
  const [animCells, setAnimCells] = useState(new Set());
  const [mergeCells, setMergeCells] = useState(new Set());
  const [score, setScore] = usePersistentState(
    '2048-score',
    0,
    (v) => typeof v === 'number',
  );
  const [highScore, setHighScore] = usePersistentState(
    '2048-best-score',
    0,
    (v) => typeof v === 'number',
  );
  const [scoreHistory, setScoreHistory] = usePersistentState(
    '2048-history',
    [],
    validateHistory,
  );
  const [scorePop, setScorePop] = useState(false);
  const [combo, setCombo] = useState(0);
  const [hint, setHint] = useState(null);
  const [demo, setDemo] = useState(false);
  const [coach, setCoach] = usePersistentState('2048-coach', false, (v) => typeof v === 'boolean');
  const [moveScores, setMoveScores] = useState(null);
  const [bestMap, setBestMap, bestReady] = useOPFS('2048-best.json', {});
  const [best, setBest] = useState(0);
  const [undosLeft, setUndosLeft] = useState(UNDO_LIMIT);
  const [glowCells, setGlowCells] = useState(new Set());
  const [milestoneValue, setMilestoneValue] = useState(0);
  const [paused, setPaused] = useState(false);
  const moveLock = useRef(false);
  const workerRef = useRef(null);
  const { highContrast } = useSettings();
  const { record, registerReplay } = useInputRecorder();
  const { durations, scaleDuration } = useGameLayoutTheme();
  const outcomeLoggedRef = useRef(false);
  const triggerConfetti = useCallback((options = {}) => {
    if (typeof window === 'undefined') return;
    import('canvas-confetti')
      .then((m) => {
        try {
          m.default({
            particleCount: 120,
            spread: 70,
            disableForReducedMotion: true,
            origin: { y: 0.8 },
            ...options,
          });
        } catch {
          /* ignore animation errors */
        }
      })
      .catch(() => {
        /* ignore load errors */
      });
  }, []);

  const highestTile = useMemo(() => Math.max(...board.flat()), [board]);

  useEffect(() => {
    if (animCells.size > 0) {
      if (durations.tilePop === 0) {
        setAnimCells(new Set());
        return;
      }
      let frame;
      const timeout = setTimeout(() => {
        frame = requestAnimationFrame(() => setAnimCells(new Set()));
      }, durations.tilePop);
      return () => {
        clearTimeout(timeout);
        if (frame) cancelAnimationFrame(frame);
      };
    }
  }, [animCells, durations.tilePop]);

  useEffect(() => {
    if (mergeCells.size > 0) {
      if (durations.tileMerge === 0) {
        setMergeCells(new Set());
        return;
      }
      let frame;
      const timeout = setTimeout(() => {
        frame = requestAnimationFrame(() => setMergeCells(new Set()));
      }, durations.tileMerge);
      return () => {
        clearTimeout(timeout);
        if (frame) cancelAnimationFrame(frame);
      };
    }
  }, [mergeCells, durations.tileMerge]);

  useEffect(() => {
    if (scorePop) {
      if (durations.scorePop === 0) {
        setScorePop(false);
        return;
      }
      let frame;
      const timeout = setTimeout(() => {
        frame = requestAnimationFrame(() => setScorePop(false));
      }, durations.scorePop);
      return () => {
        clearTimeout(timeout);
        if (frame) cancelAnimationFrame(frame);
      };
    }
  }, [scorePop, durations.scorePop]);

  useEffect(() => {
    if (glowCells.size > 0) {
      if (durations.tileGlow === 0) {
        setGlowCells(new Set());
        return;
      }
      let frame;
      const timeout = setTimeout(() => {
        frame = requestAnimationFrame(() => setGlowCells(new Set()));
      }, durations.tileGlow);
      return () => {
        clearTimeout(timeout);
        if (frame) cancelAnimationFrame(frame);
      };
    }
  }, [glowCells, durations.tileGlow]);

  useEffect(() => {
    if (moveLock.current && animCells.size === 0 && mergeCells.size === 0) {
      moveLock.current = false;
    }
  }, [animCells, mergeCells]);

  const today = typeof window !== 'undefined' ? new Date().toISOString().slice(0, 10) : '';

  const initializeRun = useCallback(
    (seedValue) => {
      const activeSeed = seedValue ?? today;
      resetRng(activeSeed);
      const freshBoard = initBoard(hardMode);
      startReplayRecording(freshBoard, activeSeed);
      setBoard(freshBoard);
      setHistory([]);
      setMoves(0);
      setWon(false);
      setLost(false);
      setAnimCells(new Set());
      setMergeCells(new Set());
      setScore(0);
      setUndosLeft(UNDO_LIMIT);
      setGlowCells(new Set());
      setMilestoneValue(0);
      setCombo(0);
      setPaused(false);
      outcomeLoggedRef.current = false;
    },
    [
      hardMode,
      setBoard,
      setHistory,
      setMoves,
      setWon,
      setLost,
      setAnimCells,
      setMergeCells,
      setScore,
      setUndosLeft,
      setGlowCells,
      setMilestoneValue,
      setCombo,
      setPaused,
      today,
      startReplayRecording,
    ],
  );

  useEffect(() => {
    if (typeof Worker !== 'function') return;
    workerRef.current = new Worker(new URL('./2048.worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { type, move, scores } = e.data;
      if (type === 'hint') setHint(move);
      else if (type === 'score') setMoveScores(scores);
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (!bestReady) return;
    if (seed !== today) {
      const nextSeed = today || seed;
      if (nextSeed) {
        setSeedState(nextSeed);
        initializeRun(nextSeed);
        setBest(bestMap[nextSeed] || 0);
      }
    } else {
      const activeSeed = seed || today;
      if (activeSeed) {
        resetRng(activeSeed);
        setBest(bestMap[activeSeed] || 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestReady, seed, hardMode, bestMap, today, initializeRun]);

  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'hint', board });
    if (coach) workerRef.current.postMessage({ type: 'score', board });
    else setMoveScores(null);
  }, [board, coach]);

  useEffect(() => {
    if (highestTile > best) {
      setBest(highestTile);
      if (bestReady && seed) {
        setBestMap({ ...bestMap, [seed]: highestTile });
      }
    }
  }, [highestTile, best, seed, bestReady, bestMap, setBestMap]);

  useEffect(() => {
    if (!won && !lost) {
      outcomeLoggedRef.current = false;
    }
  }, [won, lost]);

  useEffect(() => {
    if ((won || lost) && !outcomeLoggedRef.current) {
      outcomeLoggedRef.current = true;
      const entry = {
        score,
        bestTile: highestTile,
        moves,
        date: new Date().toISOString(),
      };
      setScoreHistory((prev) =>
        [...prev, entry]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
      );
    }
  }, [won, lost, score, highestTile, moves, setScoreHistory]);

  const handleDirection = useCallback(
    ({ x, y }) => {
      if (won || lost || moveLock.current || paused) return;
      record({ x, y });
      let result;
      let directionKey = null;
      if (x === -1) {
        result = moveLeft(board);
        directionKey = 'ArrowLeft';
      } else if (x === 1) {
        result = moveRight(board);
        directionKey = 'ArrowRight';
      } else if (y === -1) {
        result = moveUp(board);
        directionKey = 'ArrowUp';
      } else if (y === 1) {
        result = moveDown(board);
        directionKey = 'ArrowDown';
      } else return;
      const { board: moved, merged, score: gained, mergedCells } = result;
      if (!boardsEqual(board, moved)) {
        moveLock.current = true;
        const rngState = serializeRng();
        const added = addRandomTile(moved, hardMode, hardMode ? 2 : 1);
        setHistory((h) => [
          ...h,
          { board: cloneBoard(board), score, moves, rng: rngState },
        ]);
        setAnimCells(new Set(added));
        setMergeCells(new Set(mergedCells));
        if (gained > 0) {
          const newScore = score + gained;
          setScore(newScore);
          setScorePop(true);
          if (newScore > highScore) {
            setHighScore(newScore);
            triggerConfetti({ particleCount: 160, spread: 75, origin: { y: 0.7 } });
          }
        }
        setBoard(cloneBoard(moved));
        setMoves((m) => m + 1);
        if (directionKey) recordReplayMove(directionKey);
        const hi = Math.max(...moved.flat());
        if (hi > best) {
          setBest(hi);
          if (bestReady && seed) {
            setBestMap({ ...bestMap, [seed]: hi });
          }
        }
        if (MILESTONES.includes(hi) && hi > milestoneValue) {
          const highlight = new Set();
          moved.forEach((row, r) =>
            row.forEach((val, c) => {
              if (val === hi) highlight.add(`${r}-${c}`);
            }),
          );
          setGlowCells(highlight);
          setMilestoneValue(hi);
        }
        if (merged) vibrate(50);
        if (mergedCells.length > 1) {
          setCombo((c) => c + 1);
          triggerConfetti({ particleCount: 90, spread: 65, origin: { y: 0.75 } });
        } else {
          setCombo(0);
        }
        if (checkWin(moved)) setWon(true);
        else if (!hasMoves(moved)) setLost(true);
      }
    },
    [
      board,
      won,
      lost,
      hardMode,
      paused,
      score,
      moves,
      setBoard,
      setLost,
      setWon,
      setScore,
      highScore,
      setHighScore,
      best,
      setBest,
      bestReady,
      seed,
      bestMap,
      setBestMap,
      record,
      milestoneValue,
      setGlowCells,
      setMilestoneValue,
      triggerConfetti,
      recordReplayMove,
    ],
  );

  useGameControls(handleDirection, '2048');

  useEffect(() => {
    const stop = () => setDemo(false);
    window.addEventListener('keydown', stop);
    return () => window.removeEventListener('keydown', stop);
  }, []);

  useEffect(() => {
    if (!demo || !hint || paused) return;
    const dirMap = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const delay = scaleDuration(400);
    if (delay === 0) {
      const direction = dirMap[hint];
      if (direction) handleDirection(direction);
      return;
    }
    const id = setTimeout(() => {
      if (!hint) {
        setDemo(false);
        return;
      }
      const direction = dirMap[hint];
      if (direction) handleDirection(direction);
    }, delay);
    return () => clearTimeout(id);
  }, [demo, hint, handleDirection, paused, scaleDuration]);

  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Escape') {
        document.getElementById('close-2048')?.click();
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const reset = useCallback(() => {
    initializeRun(seed || today);
  }, [initializeRun, seed, today]);

  useEffect(() => {
    registerReplay((dir, idx) => {
      if (idx === 0) reset();
      handleDirection(dir);
    });
  }, [registerReplay, handleDirection, reset]);

  const undo = useCallback(() => {
    if (!history.length || undosLeft === 0) return;
    const prev = history[history.length - 1];
    deserializeRng(prev.rng);
    setBoard(cloneBoard(prev.board));
    setScore(prev.score);
    setMoves(prev.moves);
    setWon(checkWin(prev.board));
    setLost(!hasMoves(prev.board));
    setAnimCells(new Set());
    setMergeCells(new Set());
    setHistory((h) => h.slice(0, -1));
    setUndosLeft((u) => u - 1);
    setGlowCells(new Set());
    setMilestoneValue((value) => Math.min(value, Math.max(...prev.board.flat())));
    setCombo(0);
    setPaused(false);
  }, [
    history,
    undosLeft,
    setBoard,
    setScore,
    setMoves,
    setWon,
    setLost,
    setAnimCells,
    setMergeCells,
    setHistory,
    setUndosLeft,
    setGlowCells,
    setMilestoneValue,
    setCombo,
    setPaused,
  ]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') {
        e.preventDefault();
        undo();
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, reset]);

  const sortedHistory = useMemo(
    () => [...scoreHistory].sort((a, b) => b.score - a.score),
    [scoreHistory],
  );
  const hintLabel = hint ? hint.replace('Arrow', '') : '—';
  const milestoneDisplay = milestoneValue >= 256 ? milestoneValue : '—';
  const statusMessage = useMemo(() => {
    if (won) return '2048 achieved! Continue playing or start a new run.';
    if (lost) return 'No more moves left. Reset to chase a new high score.';
    if (paused) return 'Game paused.';
    if (demo) return 'Autoplay demo is exploring moves.';
    return 'Combine matching tiles to climb the power ladder.';
  }, [won, lost, paused, demo]);
  const colors = SKINS[skin] || SKINS.classic;
  const tileBaseClasses =
    'relative flex aspect-square w-full items-center justify-center rounded-xl border border-[color:var(--game-2048-tile-border,rgba(255,255,255,0.06))] text-2xl font-bold shadow-[0_18px_35px_rgba(15,23,42,0.55)] transition-transform [transition-duration:var(--game-tile-pop-duration,200ms)] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform backdrop-blur-sm';
  const infoCardClass =
    'rounded-2xl border border-white/5 bg-slate-900/60 p-4 shadow-[0_35px_60px_rgba(2,6,23,0.45)] backdrop-blur';
  const boardContainerClass =
    'relative aspect-square w-full max-w-[min(90vw,28rem)] overflow-hidden rounded-3xl border border-white/5 bg-slate-950/80 p-4 shadow-[0_40px_80px_rgba(2,6,23,0.6)] backdrop-blur';
  const instructionsCopy =
    'Use arrow keys, swipe gestures, or a connected gamepad to slide tiles. Press U to undo and R to reset.';

  const controls = (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-white/5 bg-slate-900/60 p-3 text-sm text-slate-100 shadow-[0_25px_50px_rgba(2,6,23,0.55)] backdrop-blur">
      <button
        type="button"
        onClick={reset}
        aria-label="Reset game"
        className="rounded-xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 px-4 py-2 font-semibold text-slate-100 shadow-[0_12px_24px_rgba(15,23,42,0.45)] transition hover:from-slate-600 hover:to-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        Reset
      </button>
      <button
        type="button"
        onClick={undo}
        aria-label="Undo last move"
        disabled={history.length === 0 || undosLeft === 0}
        className="rounded-xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 px-4 py-2 font-semibold text-slate-100 shadow-[0_12px_24px_rgba(15,23,42,0.45)] transition hover:from-slate-600 hover:to-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Undo ({undosLeft})
      </button>
      <button
        type="button"
        onClick={() => setDemo((d) => !d)}
        aria-label={demo ? 'Stop autoplay demo' : 'Start autoplay demo'}
        className={`rounded-xl px-4 py-2 font-semibold shadow-[0_12px_24px_rgba(15,23,42,0.45)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
          demo
            ? 'bg-gradient-to-br from-cyan-500 via-cyan-600 to-sky-600 text-slate-900'
            : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-slate-100 hover:from-slate-600 hover:to-slate-800'
        }`}
      >
        {demo ? 'Stop demo' : 'Play demo'}
      </button>
      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-800/60 px-3 py-1 text-xs uppercase tracking-wide text-slate-300 md:ml-auto">
        <span>Hint</span>
        <span className="text-base font-semibold text-slate-100">{hintLabel}</span>
      </div>
    </div>
  );

  const settingsPanel = (
    <div className="flex flex-col gap-3 text-sm text-slate-100">
      <label className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-900/60 px-3 py-2">
        <span>
          <span className="block font-semibold">Hard mode</span>
          <span className="text-xs text-slate-400">Adds an extra tile after every move.</span>
        </span>
        <input
          type="checkbox"
          checked={hardMode}
          onChange={() => setHardMode(!hardMode)}
          aria-label="Toggle hard mode"
          className="h-4 w-4 accent-cyan-400"
        />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-900/60 px-3 py-2">
        <span>
          <span className="block font-semibold">Coach overlay</span>
          <span className="text-xs text-slate-400">Shows heuristic scores for each direction.</span>
        </span>
        <input
          type="checkbox"
          checked={coach}
          onChange={() => setCoach(!coach)}
          aria-label="Toggle coach overlay"
          className="h-4 w-4 accent-cyan-400"
        />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-900/60 px-3 py-2">
        <span className="font-semibold">Skin</span>
        <select
          value={skin}
          onChange={(e) => setSkin(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-800/80 px-2 py-1 text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {Object.keys(SKINS).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <GameLayout gameId="2048" score={score} highScore={highScore}>
      <GameShell
        game="2048"
        controls={controls}
        settings={settingsPanel}
        onPause={() => setPaused(true)}
        onResume={() => setPaused(false)}
      >
        <div className="flex flex-col gap-4 text-slate-100">
          <div className={`${infoCardClass} space-y-4`} aria-live="polite" aria-atomic="true">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Score</p>
                <p className={`text-2xl font-bold text-white ${scorePop ? 'score-pop' : ''}`}>
                  {score.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">High score</p>
                <p className="text-2xl font-bold text-cyan-200">{highScore.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Best tile</p>
                <p className="text-2xl font-bold text-emerald-300">{highestTile}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Milestone</p>
                <p className="text-2xl font-bold text-amber-300">{milestoneDisplay}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <span className="sr-only">Moves: {moves}</span>
                  <span aria-hidden="true">Moves</span>
                </p>
                <p className="text-xl font-semibold" data-testid="move-count" aria-hidden="true">
                  {moves}
                </p>
              </div>
              <div data-testid="combo-meter">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Combo</p>
                <p className="text-xl font-semibold">{combo}</p>
              </div>
              <div data-testid="hint-display">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hint</p>
                <p className="text-xl font-semibold">{hintLabel}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Undos left</p>
                <p className="text-xl font-semibold">{undosLeft}</p>
              </div>
            </div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Daily record: tile {best}</p>
            <p
              className={`text-sm font-medium ${
                won
                  ? 'text-emerald-300'
                  : lost
                  ? 'text-rose-300'
                  : paused
                  ? 'text-amber-300'
                  : 'text-slate-200'
              }`}
            >
              {statusMessage}
            </p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className={boardContainerClass}>
              <div
                className="grid h-full w-full grid-cols-4 auto-rows-fr gap-2 sm:gap-3"
                role="grid"
                aria-label="2048 board"
              >
                {board.map((row, rIdx) =>
                  row.map((cell, cIdx) => {
                    const key = `${rIdx}-${cIdx}`;
                    const fillClass = cell
                      ? colors[cell] || FALLBACK_TILE_CLASS
                      : EMPTY_TILE_CLASS;
                    const classes = `${tileBaseClasses} ${fillClass} ${
                      animCells.has(key) ? 'tile-pop' : ''
                    } ${mergeCells.has(key) ? 'tile-merge' : ''} ${
                      glowCells.has(key) ? 'tile-glow' : ''
                    }`;
                    return (
                      <div key={key} className="relative">
                        <div
                          role="gridcell"
                          aria-label={
                            cell
                              ? `Tile ${cell}`
                              : `Empty tile row ${rIdx + 1} column ${cIdx + 1}`
                          }
                          className={classes}
                          data-value={cell}
                        >
                          {highContrast && cell !== 0 && (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl text-white/60 mix-blend-plus-lighter"
                            >
                              {tileSymbols[cell] || ''}
                            </span>
                          )}
                          <span className="relative z-10">{cell || ''}</span>
                          {mergeCells.has(key) && <span className="merge-ripple" />}
                        </div>
                      </div>
                    );
                  }),
                )}
              </div>
              {coach && moveScores && (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-1/2 top-3 -translate-x-1/2 text-xs font-semibold text-cyan-200">
                    ↑ {moveScores.ArrowUp !== undefined ? Math.round(moveScores.ArrowUp) : ''}
                  </div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-cyan-200">
                    ↓ {moveScores.ArrowDown !== undefined ? Math.round(moveScores.ArrowDown) : ''}
                  </div>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-cyan-200">
                    ← {moveScores.ArrowLeft !== undefined ? Math.round(moveScores.ArrowLeft) : ''}
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-cyan-200">
                    → {moveScores.ArrowRight !== undefined ? Math.round(moveScores.ArrowRight) : ''}
                  </div>
                </div>
              )}
              {(won || lost) && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-950/80 text-2xl font-semibold text-white">
                  {won ? 'You reached 2048!' : 'Game over'}
                </div>
              )}
            </div>
            <div className="text-xs text-slate-300 sm:text-sm">{instructionsCopy}</div>
          </div>
          {sortedHistory.length > 0 && (
            <div className={infoCardClass}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                High score ledger
              </h3>
              <ol className="mt-3 space-y-2 text-sm text-slate-200">
                {sortedHistory.map((entry, index) => (
                  <li
                    key={`${entry.date}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/40 px-3 py-2"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/80 text-xs font-semibold text-slate-300">
                        {index + 1}
                      </span>
                      <span>
                        {new Date(entry.date).toLocaleDateString()} · Tile {entry.bestTile}
                      </span>
                    </span>
                    <span className="font-semibold text-slate-100">
                      {entry.score.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </GameShell>
    </GameLayout>
  );
};

export { slide };
export default Game2048;

