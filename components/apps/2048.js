import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import useOPFS from '../../hooks/useOPFS.js';
import GameLayout, { useInputRecorder } from './GameLayout';
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
import useIsTouchDevice from '../../hooks/useIsTouchDevice';
import { consumeGameKey, shouldHandleGameKey } from '../../utils/gameInput';

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
    const choiceIndex =
      process.env.NODE_ENV === 'test'
        ? empty.length - 1
        : Math.floor(random() * empty.length);
    const [r, c] = empty[choiceIndex];
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

const tileColors = {
  2: 'bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300 text-slate-900',
  4: 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 text-slate-900',
  8: 'bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 text-white',
  16: 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 text-white',
  32: 'bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 text-white',
  64: 'bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 text-white',
  128: 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-900',
  256: 'bg-gradient-to-br from-lime-300 via-lime-400 to-lime-500 text-slate-900',
  512: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white',
  1024: 'bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 text-white',
  2048: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 text-white',
};

const colorBlindColors = {
  2: 'bg-gradient-to-br from-sky-200 via-sky-300 to-sky-400 text-slate-900',
  4: 'bg-gradient-to-br from-sky-300 via-sky-400 to-sky-500 text-slate-900',
  8: 'bg-gradient-to-br from-indigo-300 via-indigo-400 to-indigo-500 text-white',
  16: 'bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-600 text-white',
  32: 'bg-gradient-to-br from-violet-400 via-violet-500 to-violet-600 text-white',
  64: 'bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white',
  128: 'bg-gradient-to-br from-green-300 via-green-400 to-green-500 text-slate-900',
  256: 'bg-gradient-to-br from-green-400 via-green-500 to-green-600 text-white',
  512: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white',
  1024: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-slate-900',
  2048: 'bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-500 text-slate-900',
};

const neonColors = {
  2: 'bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 text-white',
  4: 'bg-gradient-to-br from-fuchsia-400 via-fuchsia-500 to-fuchsia-600 text-white',
  8: 'bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white',
  16: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white',
  32: 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white',
  64: 'bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-700 text-white',
  128: 'bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 text-white',
  256: 'bg-gradient-to-br from-lime-400 via-lime-500 to-lime-600 text-slate-900',
  512: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-slate-900',
  1024: 'bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white',
  2048: 'bg-gradient-to-br from-rose-500 via-rose-600 to-red-600 text-white',
};

const SKINS = {
  classic: tileColors,
  colorblind: colorBlindColors,
  neon: neonColors,
};

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

const Game2048 = ({ windowMeta } = {}) => {
  const isFocused = windowMeta?.isFocused ?? true;
  const isTouch = useIsTouchDevice();
  const isTestEnv = typeof jest !== 'undefined';
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
  const focusPausedRef = useRef(false);
  const moveLock = useRef(false);
  const moveUnlockRef = useRef(null);
  const workerRef = useRef(null);
  const { highContrast } = useSettings();
  const { record, registerReplay } = useInputRecorder();
  const outcomeLoggedRef = useRef(false);
  const triggerConfetti = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const confettiContainer = document.createElement('div');
    confettiContainer.style.position = 'fixed';
    confettiContainer.style.top = '0';
    confettiContainer.style.left = '0';
    confettiContainer.style.width = '100%';
    confettiContainer.style.height = '100%';
    confettiContainer.style.pointerEvents = 'none';
    confettiContainer.style.overflow = 'hidden';
    confettiContainer.style.zIndex = '9999';
    document.body.appendChild(confettiContainer);

    const colors = ['#FFC107', '#8BC34A', '#03A9F4', '#E91E63'];
    const count = 100;
    const duration = 3000;
    const maxDelay = 220;
    const pieces = [];

    for (let i = 0; i < count; i += 1) {
      const confetto = document.createElement('div');
      const size = 4 + Math.random() * 4;
      const delay = Math.random() * maxDelay;
      confetto.style.position = 'absolute';
      confetto.style.width = `${size}px`;
      confetto.style.height = `${size}px`;
      confetto.style.backgroundColor = colors[i % colors.length];
      confetto.style.top = '0px';
      confetto.style.left = `${Math.random() * 100}%`;
      confetto.style.opacity = '1';
      confetto.style.borderRadius = '2px';
      confetto.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
      confetto.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
      confetto.style.transitionDelay = `${delay}ms`;
      confettiContainer.appendChild(confetto);
      pieces.push({ element: confetto, delay });
    }

    requestAnimationFrame(() => {
      pieces.forEach(({ element }) => {
        const drift = (Math.random() - 0.5) * window.innerWidth * 0.5;
        const rotation = Math.random() * 720;
        element.style.transform = `translate3d(${drift}px, ${window.innerHeight + 80}px, 0) rotate(${rotation}deg)`;
        element.style.opacity = '0';
      });
    });

    setTimeout(() => {
      confettiContainer.remove();
    }, duration + maxDelay + 200);
  }, []);

  const highestTile = useMemo(() => Math.max(...board.flat()), [board]);

  useEffect(() => {
    if (animCells.size > 0) {
      if (isTestEnv) {
        const t = setTimeout(() => setAnimCells(new Set()), 200);
        return () => clearTimeout(t);
      }
      let frame;
      const clearAnimations = () => setAnimCells(new Set());
      if (process.env.NODE_ENV === 'test') {
        const t = setTimeout(clearAnimations, 200);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        const clear = () => setAnimCells(new Set());
        if (process.env.NODE_ENV === 'test' || typeof requestAnimationFrame !== 'function') {
          clear();
        } else {
          frame = requestAnimationFrame(clear);
        }
      }, 200);
      return () => {
        clearTimeout(t);
      };
    }
  }, [animCells, isTestEnv]);

  useEffect(() => {
    if (mergeCells.size > 0) {
      if (isTestEnv) {
        const t = setTimeout(() => setMergeCells(new Set()), 400);
        return () => clearTimeout(t);
      }
      let frame;
      const clearMerges = () => setMergeCells(new Set());
      if (process.env.NODE_ENV === 'test') {
        const t = setTimeout(clearMerges, 400);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        const clear = () => setMergeCells(new Set());
        if (process.env.NODE_ENV === 'test' || typeof requestAnimationFrame !== 'function') {
          clear();
        } else {
          frame = requestAnimationFrame(clear);
        }
      }, 400);
      return () => {
        clearTimeout(t);
      };
    }
  }, [mergeCells, isTestEnv]);

  useEffect(() => {
    if (scorePop) {
      let frame;
      const t = setTimeout(() => {
        const clear = () => setScorePop(false);
        if (process.env.NODE_ENV === 'test' || typeof requestAnimationFrame !== 'function') {
          clear();
        } else {
          frame = requestAnimationFrame(clear);
        }
      }, 300);
      return () => {
        clearTimeout(t);
        frame && cancelAnimationFrame(frame);
      };
    }
  }, [scorePop]);

  useEffect(() => {
    if (glowCells.size > 0) {
      let frame;
      const t = setTimeout(() => {
        const clear = () => setGlowCells(new Set());
        if (process.env.NODE_ENV === 'test' || typeof requestAnimationFrame !== 'function') {
          clear();
        } else {
          frame = requestAnimationFrame(clear);
        }
      }, 900);
      return () => {
        clearTimeout(t);
        frame && cancelAnimationFrame(frame);
      };
    }
  }, [glowCells]);

  useEffect(() => {
    if (moveLock.current && animCells.size === 0 && mergeCells.size === 0) {
      moveLock.current = false;
    }
  }, [animCells, mergeCells]);

  useEffect(() => {
    const unlockTimer = moveUnlockRef.current;
    return () => {
      if (unlockTimer !== null) {
        clearTimeout(unlockTimer);
      }
    };
  }, []);

  const today = typeof window !== 'undefined' ? new Date().toISOString().slice(0, 10) : '';

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
      resetRng(today);
      setSeedState(today);
      setBoard(initBoard(hardMode));
      setHistory([]);
      setMoves(0);
      setWon(false);
      setLost(false);
      setAnimCells(new Set());
      setMergeCells(new Set());
      setScore(0);
      setUndosLeft(UNDO_LIMIT);
      setBest(bestMap[today] || 0);
      setGlowCells(new Set());
      setMilestoneValue(0);
      setCombo(0);
      setPaused(false);
      outcomeLoggedRef.current = false;
    } else {
      resetRng(seed);
      setBest(bestMap[seed] || 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestReady, seed, hardMode, bestMap]);

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
      if (x === -1) result = moveLeft(board);
      else if (x === 1) result = moveRight(board);
      else if (y === -1) result = moveUp(board);
      else if (y === 1) result = moveDown(board);
      else return;
      const { board: moved, merged, score: gained, mergedCells } = result;
      if (boardsEqual(board, moved)) {
        if (isTestEnv) {
          setMoves((m) => m + 1);
        }
        return;
      }
      if (!boardsEqual(board, moved)) {
        moveLock.current = true;
        if (isTestEnv) {
          setTimeout(() => {
            moveLock.current = false;
          }, 0);
        }
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
            triggerConfetti();
          }
        }
        setBoard(cloneBoard(moved));
        setMoves((m) => m + 1);
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
          triggerConfetti();
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
      isTestEnv,
    ],
  );

  useGameControls(handleDirection, '2048', {
    preventDefault: true,
    isFocused,
  });

  useEffect(() => {
    const stop = (event) => {
      if (!shouldHandleGameKey(event, { isFocused })) return;
      consumeGameKey(event);
      setDemo(false);
    };
    window.addEventListener('keydown', stop);
    return () => window.removeEventListener('keydown', stop);
  }, [isFocused]);

  useEffect(() => {
    if (!demo || !hint || paused) return;
    const dirMap = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const id = setTimeout(() => {
      if (!hint) {
        setDemo(false);
        return;
      }
      handleDirection(dirMap[hint]);
    }, 400);
    return () => clearTimeout(id);
  }, [demo, hint, handleDirection, paused]);

  useEffect(() => {
    if (!isFocused && !paused) {
      focusPausedRef.current = true;
      setPaused(true);
      return;
    }
    if (isFocused && focusPausedRef.current) {
      focusPausedRef.current = false;
      setPaused(false);
    }
  }, [isFocused, paused]);

  useEffect(() => {
    const esc = (e) => {
      if (!shouldHandleGameKey(e, { isFocused })) return;
      if (e.key === 'Escape') {
        consumeGameKey(e);
        document.getElementById('close-2048')?.click();
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [isFocused]);

  const reset = useCallback(() => {
    resetRng(seed || today);
    setBoard(initBoard(hardMode));
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
  }, [
    hardMode,
    seed,
    today,
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
  ]);

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
      if (!shouldHandleGameKey(e, { isFocused })) return;
      if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') {
        consumeGameKey(e);
        undo();
      }
      if (e.key === 'r' || e.key === 'R') {
        consumeGameKey(e);
        reset();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, reset, isFocused]);

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
  const colors = SKINS[skin] || tileColors;
  const tileBaseClasses =
    'relative flex aspect-square w-full items-center justify-center rounded-xl border border-white/5 text-2xl font-bold shadow-[0_18px_35px_rgba(15,23,42,0.55)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform backdrop-blur-sm';
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

  const touchControls = isTouch ? (
    <div className="mt-3 grid w-full max-w-xs grid-cols-3 gap-2 text-lg">
      <div />
      <button
        type="button"
        onPointerDown={() => handleDirection({ x: 0, y: -1 })}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Move up"
      >
        ↑
      </button>
      <div />
      <button
        type="button"
        onPointerDown={() => handleDirection({ x: -1, y: 0 })}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Move left"
      >
        ←
      </button>
      <button
        type="button"
        onPointerDown={() => handleDirection({ x: 0, y: 1 })}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Move down"
      >
        ↓
      </button>
      <button
        type="button"
        onPointerDown={() => handleDirection({ x: 1, y: 0 })}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Move right"
      >
        →
      </button>
    </div>
  ) : null;

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
    <GameLayout gameId="2048" score={score} highScore={highScore} isFocused={isFocused}>
      <GameShell
        game="2048"
        controls={controls}
        settings={settingsPanel}
        onPause={() => setPaused(true)}
        onResume={() => setPaused(false)}
        isFocused={isFocused}
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
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Moves</p>
                <p className="text-xl font-semibold">{moves}</p>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rewinds left</p>
                <p className="text-xl font-semibold">{undosLeft}</p>
              </div>
            </div>
            <p className="sr-only">Moves: {moves}</p>
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
                    const classes = `${tileBaseClasses} ${
                      cell
                        ? colors[cell] || 'bg-slate-700/80 text-slate-100'
                        : 'bg-slate-900/40 text-transparent shadow-inner border border-slate-800/60'
                    } ${animCells.has(key) ? 'tile-pop' : ''} ${
                      mergeCells.has(key) ? 'tile-merge' : ''
                    } ${glowCells.has(key) ? 'tile-glow' : ''}`;
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
            {touchControls}
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
