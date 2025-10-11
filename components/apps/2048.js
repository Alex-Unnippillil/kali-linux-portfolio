import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import GameLayout, { useInputRecorder } from './GameLayout';
import useGameControls, { useGamePersistence } from './useGameControls';
import GameToolbar from './Games/common/GameToolbar';
import { vibrate } from './Games/common/haptics';
import {
  random,
  reset as resetRng,
  serialize as serializeRng,
  deserialize as deserializeRng,
} from '../../apps/games/rng';
import {
  moveLeft as moveBoardLeft,
  moveRight as moveBoardRight,
  moveUp as moveBoardUp,
  moveDown as moveBoardDown,
  boardsEqual,
  cloneBoard as cloneBoardBoard,
} from '../../apps/games/_2048/logic';
import { useSettings } from '../../hooks/useSettings';

// Basic 2048 game logic with tile merging mechanics.

const SIZE = 4;
const UNDO_LIMIT = 5;

// seeded RNG so tests can be deterministic
export const setSeed = (seed) => resetRng(seed);

const cloneBoard = (b) => cloneBoardBoard(b);

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

const colorBlindColors = {
  2: 'bg-blue-300 text-gray-800',
  4: 'bg-blue-400 text-gray-800',
  8: 'bg-blue-500 text-white',
  16: 'bg-indigo-500 text-white',
  32: 'bg-purple-500 text-white',
  64: 'bg-pink-500 text-white',
  128: 'bg-green-500 text-white',
  256: 'bg-green-600 text-white',
  512: 'bg-green-700 text-white',
  1024: 'bg-yellow-500 text-white',
  2048: 'bg-yellow-600 text-white',
};

const neonColors = {
  2: 'bg-pink-500 text-white',
  4: 'bg-fuchsia-500 text-white',
  8: 'bg-purple-500 text-white',
  16: 'bg-indigo-500 text-white',
  32: 'bg-blue-500 text-white',
  64: 'bg-cyan-500 text-white',
  128: 'bg-teal-500 text-white',
  256: 'bg-lime-500 text-white',
  512: 'bg-yellow-500 text-white',
  1024: 'bg-orange-500 text-white',
  2048: 'bg-red-500 text-white',
};

const SKINS = {
  classic: tileColors,
  colorblind: colorBlindColors,
  neon: neonColors,
};

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
  const [scorePop, setScorePop] = useState(false);
  const [combo, setCombo] = useState(0);
  const [hint, setHint] = useState(null);
  const [demo, setDemo] = useState(false);
  const [coach, setCoach] = usePersistentState('2048-coach', false, (v) => typeof v === 'boolean');
  const [moveScores, setMoveScores] = useState(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = usePersistentState(
    '2048-muted',
    false,
    (v) => typeof v === 'boolean',
  );
  const { getHighScore, setHighScore } = useGamePersistence('2048');
  const [highScore, setHighScoreState] = useState(() => getHighScore());
  const [undosLeft, setUndosLeft] = useState(UNDO_LIMIT);
  const moveLock = useRef(false);
  const workerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const { highContrast } = useSettings();
  const { record, registerReplay } = useInputRecorder();
  const bestTile = useMemo(() => Math.max(...board.flat()), [board]);

  useEffect(() => {
    if (animCells.size > 0) {
      let frame;
      const t = setTimeout(() => {
        frame = requestAnimationFrame(() => setAnimCells(new Set()));
      }, 200);
      return () => {
        clearTimeout(t);
        frame && cancelAnimationFrame(frame);
      };
    }
  }, [animCells]);

  useEffect(() => {
    if (mergeCells.size > 0) {
      let frame;
      const t = setTimeout(() => {
        frame = requestAnimationFrame(() => setMergeCells(new Set()));
      }, 400);
      return () => {
        clearTimeout(t);
        frame && cancelAnimationFrame(frame);
      };
    }
  }, [mergeCells]);

  useEffect(() => {
    if (scorePop) {
      let frame;
      const t = setTimeout(() => {
        frame = requestAnimationFrame(() => setScorePop(false));
      }, 300);
      return () => {
        clearTimeout(t);
        frame && cancelAnimationFrame(frame);
      };
    }
  }, [scorePop]);

  useEffect(() => {
    if (moveLock.current && animCells.size === 0 && mergeCells.size === 0) {
      moveLock.current = false;
    }
  }, [animCells, mergeCells]);

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
    if (!today) return;
    if (seed !== today) {
      resetRng(today);
      setSeedState(today);
      const fresh = initBoard(hardMode);
      setBoard(fresh);
      setHistory([]);
      setMoves(0);
      setWon(false);
      setLost(false);
      setAnimCells(new Set());
      setMergeCells(new Set());
      setScore(0);
      setScorePop(false);
      setUndosLeft(UNDO_LIMIT);
      setHint(null);
      setMoveScores(null);
      setDemo(false);
      setCombo(0);
      moveLock.current = false;
      setPaused(false);
    } else {
      resetRng(seed);
    }
    setHighScoreState(getHighScore());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, today, hardMode, getHighScore]);

  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'hint', board });
    if (coach) workerRef.current.postMessage({ type: 'score', board });
    else setMoveScores(null);
  }, [board, coach]);

  const playMergeTone = useCallback(
    (value) => {
      if (muted || value <= 0) return;
      try {
        const ctx =
          audioCtxRef.current ||
          new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;
        const freq = 180 + Math.log2(value) * 45;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } catch {
        /* ignore audio errors */
      }
    },
    [muted],
  );

  const handleDirection = useCallback(
    ({ x, y }) => {
      if (won || lost || paused || moveLock.current) return;
      record({ x, y });
      let result;
      if (x === -1) result = moveBoardLeft(board);
      else if (x === 1) result = moveBoardRight(board);
      else if (y === -1) result = moveBoardUp(board);
      else if (y === 1) result = moveBoardDown(board);
      else return;
      if (!result) return;
      const mergedCells = result.merges.map(([r, c]) => `${r}-${c}`);
      const moved = result.board;
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
        if (result.score > 0) {
          playMergeTone(result.score);
          setScore((s) => {
            const updated = s + result.score;
            setHighScore(updated);
            setHighScoreState((prev) => Math.max(prev, updated));
            return updated;
          });
          setScorePop(true);
        }
        setBoard(cloneBoard(moved));
        setMoves((m) => m + 1);
        if (result.merges.length > 0) vibrate(50);
        if (result.merges.length > 1) {
          setCombo((c) => c + 1);
          if (typeof window !== 'undefined') {
            import('canvas-confetti').then((m) => {
              try {
                m.default({ particleCount: 80, spread: 60 });
              } catch {
                /* ignore */
              }
            });
          }
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
      paused,
      hardMode,
      score,
      moves,
      setBoard,
      setLost,
      setWon,
      setScore,
      setHighScore,
      setHighScoreState,
      record,
      playMergeTone,
    ],
  );

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
    setDemo(false);
  }, [setDemo]);

  const toggleMute = useCallback(() => setMuted((m) => !m), [setMuted]);

  useEffect(() => {
    const handleBlur = () => setPaused(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') setPaused(true);
    };
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(
    () => () => {
      audioCtxRef.current?.close?.();
    },
    [],
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
    const esc = (e) => {
      if (e.key === 'Escape') {
        document.getElementById('close-2048')?.click();
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

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
    setScorePop(false);
    setHint(null);
    setMoveScores(null);
    setCombo(0);
    setDemo(false);
    setPaused(false);
    moveLock.current = false;
    setHighScoreState(getHighScore());
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
    setHint,
    setMoveScores,
    setCombo,
    setDemo,
    setHighScoreState,
    getHighScore,
  ]);

  useEffect(() => {
    registerReplay((dir, idx) => {
      if (idx === 0) reset();
      handleDirection(dir);
    });
  }, [registerReplay, handleDirection, reset]);

  const close = () => {
    document.getElementById('close-2048')?.click();
  };

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
  ]);

  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') {
        e.preventDefault();
        undo();
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        reset();
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePause();
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, reset, togglePause, toggleMute]);

  return (
    <GameLayout gameId="2048" score={score} highScore={highScore}>
      <>
        <div className="mb-2 space-y-2">
          <GameToolbar
            paused={paused}
            onTogglePause={togglePause}
            onReset={reset}
            muted={muted}
            onToggleMute={toggleMute}
          >
            <button
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded focus:outline-none focus:ring disabled:opacity-50"
              onClick={undo}
              disabled={history.length === 0 || undosLeft === 0}
            >
              Undo ({undosLeft})
            </button>
            <label className="flex items-center space-x-1 px-2">
              <input
                type="checkbox"
                checked={hardMode}
                onChange={() => setHardMode(!hardMode)}
              />
              <span>Hard</span>
            </label>
            <label className="flex items-center space-x-1 px-2">
              <input
                type="checkbox"
                checked={coach}
                onChange={() => setCoach(!coach)}
              />
              <span>Coach</span>
            </label>
            <label className="flex items-center space-x-1 px-2">
              <span>Skin</span>
              <select
                className="text-black px-1 rounded"
                value={skin}
                onChange={(e) => setSkin(e.target.value)}
              >
                {Object.keys(SKINS).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded focus:outline-none focus:ring"
              onClick={() => setDemo((d) => !d)}
            >
              {demo ? 'Stop' : 'Demo'}
            </button>
            <button
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded focus:outline-none focus:ring"
              onClick={close}
            >
              Close
            </button>
          </GameToolbar>
          <div className="flex flex-wrap gap-2 items-center">
            <div
              className="px-4 py-2 bg-gray-700 rounded"
              aria-live="polite" aria-atomic="true"
            >
              Score: <span className={scorePop ? 'score-pop' : ''}>{score}</span>
            </div>
            <div className="px-4 py-2 bg-gray-700 rounded">High Score: {highScore}</div>
            <div className="px-4 py-2 bg-gray-700 rounded">Best Tile: {bestTile}</div>
            <div className="px-4 py-2 bg-gray-700 rounded">Moves: {moves}</div>
            <div className="px-4 py-2 bg-gray-700 rounded" data-testid="combo-meter">
              Combo: {combo}
            </div>
            <div className="px-4 py-2 bg-gray-700 rounded" data-testid="hint-display">
              Hint: {hint ? hint.replace('Arrow', '') : ''}
            </div>
          </div>
        </div>
        <div className="relative inline-block">
          <div
            className="grid grid-cols-4 gap-2"
            data-combo={combo}
            style={{ filter: combo ? `hue-rotate(${combo * 45}deg)` : undefined }}
          >
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const key = `${rIdx}-${cIdx}`;
                const colors = SKINS[skin] || tileColors;
                return (
                  <div
                    key={key}
                    className={`relative overflow-hidden h-16 w-16 flex items-center justify-center text-2xl font-bold rounded ${
                      cell ? colors[cell] || 'bg-gray-700' : 'bg-gray-800'
                    } ${animCells.has(key) ? 'tile-pop' : ''}`}
                  >
                    {highContrast && cell !== 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center text-4xl text-white opacity-50 mix-blend-difference pointer-events-none"
                      >
                        {tileSymbols[cell] || ''}
                      </span>
                    )}
                    <span className="relative z-10">{cell !== 0 ? cell : ''}</span>
                    {mergeCells.has(key) && <span className="merge-ripple" />}
                  </div>
                );
              })
            )}
          </div>
          {coach && moveScores && (
            <>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm">
                ↑{' '}
                {moveScores.ArrowUp !== undefined
                  ? Math.round(moveScores.ArrowUp)
                  : ''}
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-sm">
                ↓{' '}
                {moveScores.ArrowDown !== undefined
                  ? Math.round(moveScores.ArrowDown)
                  : ''}
              </div>
              <div className="absolute top-1/2 -left-6 -translate-y-1/2 text-sm">
                ←{' '}
                {moveScores.ArrowLeft !== undefined
                  ? Math.round(moveScores.ArrowLeft)
                  : ''}
              </div>
              <div className="absolute top-1/2 -right-6 -translate-y-1/2 text-sm">
                →{' '}
                {moveScores.ArrowRight !== undefined
                  ? Math.round(moveScores.ArrowRight)
                  : ''}
              </div>
            </>
          )}
        </div>
        {(won || lost) && (
          <div className="mt-4 text-xl">{won ? 'You win!' : 'Game over'}</div>
        )}
      </>
    </GameLayout>
  );
};

export default Game2048;

