'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactGA from 'react-ga4';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { getDailySeed } from '../../utils/dailySeed';
import GameToolbar from '../../components/apps/Games/common/GameToolbar';
import { useGamePersistence } from '../../components/apps/useGameControls';
import {
  moveLeft as moveBoardLeft,
  moveRight as moveBoardRight,
  moveUp as moveBoardUp,
  moveDown as moveBoardDown,
  boardsEqual,
  cloneBoard,
} from '../../apps/games/_2048/logic';

const SIZE = 4;

// simple seeded PRNG
const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// convert string seed to 32-bit number
const hashSeed = (str: string): number => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return h >>> 0;
};

const hasMoves = (board: number[][]) => {
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === 0) return true;
      if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
};

const checkHighest = (board: number[][]) => {
  let m = 0;
  board.forEach((row) => row.forEach((v) => { if (v > m) m = v; }));
  return m;
};

const addRandomTile = (b: number[][], rand: () => number) => {
  const empty: [number, number][] = [];
  b.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(rand() * empty.length)];
  b[r][c] = rand() < 0.9 ? 2 : 4;
};

const tileColors: Record<number, string> = {
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

const DB_NAME = '2048';
const STORE_NAME = 'replays';

const saveReplay = (replay: any) => {
  if (typeof indexedDB === 'undefined') return;
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    }
  };
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(replay);
  };
};

const Page2048 = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  // Skip tile transition classes if the user prefers reduced motion
  const rngRef = useRef(mulberry32(0));
  const seedRef = useRef(0);
  const [board, setBoard] = useState<number[][]>(
    Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
  );
  const [hard, setHard] = useState(false);
  const [timer, setTimer] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const { getHighScore, setHighScore } = useGamePersistence('2048');
  const [highScore, setHighScoreState] = useState(() => getHighScore());
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [highest, setHighest] = useState(0);
  const [boardType, setBoardType] = useState<'classic' | 'hex'>('classic');
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [history, setHistory] = useState<Array<{ board: number[][]; score: number }>>([]);
  const bestTile = useMemo(() => Math.max(...board.flat()), [board]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  useEffect(() => {
    setHighScoreState(getHighScore());
  }, [getHighScore]);

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      const seedStr = await getDailySeed('2048');
      const seed = hashSeed(seedStr);
      const rand = mulberry32(seed);
      const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
      addRandomTile(b, rand);
      addRandomTile(b, rand);
      if (!mounted) return;
      setBoard(b);
      setScore(0);
      setMoves([]);
      setHistory([]);
      setPaused(false);
      setWon(false);
      setLost(false);
      setHighest(checkHighest(b));
      rngRef.current = rand;
      seedRef.current = seed;
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const resetTimer = useCallback(() => {
    if (!hard) return;
    setTimer(3);
  }, [hard]);

  useEffect(() => {
    if (!hard || paused) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setLost(true);
          saveReplay({ date: new Date().toISOString(), moves, boardType, hard });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hard, moves, boardType, paused]);

  const playMergeTone = useCallback(
    (value: number) => {
      if (muted || value <= 0) return;
      try {
        const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return;
        const ctx = audioCtxRef.current || new Ctor();
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
        // ignore audio errors
      }
    },
    [muted],
  );

  const handleMove = useCallback(
    (dir: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => {
      if (won || lost || paused) return;
      let result;
      if (dir === 'ArrowLeft') result = moveBoardLeft(board);
      if (dir === 'ArrowRight') result = moveBoardRight(board);
      if (dir === 'ArrowUp') result = moveBoardUp(board);
      if (dir === 'ArrowDown') result = moveBoardDown(board);
      if (!result) return;
      if (boardsEqual(board, result.board)) return;
      const next = result.board.map((row) => [...row]);
      setHistory((h) => [...h, { board: board.map((row) => [...row]), score }]);
      addRandomTile(next, rngRef.current);
      if (result.score > 0) {
        playMergeTone(result.score);
        setScore((s) => {
          const updated = s + result.score;
          setHighScore(updated);
          setHighScoreState((prev) => Math.max(prev, updated));
          return updated;
        });
      }
      const newHighest = checkHighest(next);
      if ((newHighest === 2048 || newHighest === 4096) && newHighest > highest) {
        ReactGA.event('post_score', { score: newHighest, board: boardType });
      }
      setHighest(newHighest);
      setBoard(next);
      setMoves((m) => [...m, dir]);
      resetTimer();
      if (newHighest >= 2048) setWon(true);
      else if (!hasMoves(next)) setLost(true);
    },
    [
      board,
      won,
      lost,
      paused,
      score,
      highest,
      boardType,
      resetTimer,
      playMergeTone,
      setHighScore,
      setHighScoreState,
    ],
  );

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setBoard(cloneBoard(prev.board));
      setScore(prev.score);
      setMoves((m) => m.slice(0, -1));
      setHighest(checkHighest(prev.board));
      setWon(false);
      setLost(false);
      resetTimer();
      return h.slice(0, -1);
    });
  }, [resetTimer]);

  const restart = useCallback(() => {
    const rand = mulberry32(seedRef.current);
    rngRef.current = rand;
    const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    addRandomTile(b, rand);
    addRandomTile(b, rand);
    setBoard(b);
    setMoves([]);
    setHistory([]);
    setScore(0);
    setWon(false);
    setLost(false);
    setHighest(0);
    setPaused(false);
    setHighScoreState(getHighScore());
    resetTimer();
  }, [getHighScore, resetTimer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        handleMove(e.key as any);
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        restart();
        return;
      }
      if (['u', 'U', 'Backspace'].includes(e.key)) {
        e.preventDefault();
        handleUndo();
        return;
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleMove, restart, handleUndo, togglePause, toggleMute]);

  const close = () => {
    if (typeof document !== 'undefined') {
      document.getElementById('close-2048')?.click();
    }
  };

  const displayCell = (v: number) => {
    if (v === 0) return '';
    if (boardType === 'hex') return v.toString(16).toUpperCase();
    return v;
  };

  useEffect(() => {
    if (won || lost) {
      saveReplay({ date: new Date().toISOString(), moves, boardType, hard });
      fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: '2048',
          username: 'Anonymous',
          score: highest,
        }),
      }).catch(() => {
        // ignore network errors
      });
    }
  }, [won, lost, moves, boardType, hard, highest]);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="space-y-3">
        <GameToolbar
          paused={paused}
          onTogglePause={togglePause}
          onReset={restart}
          muted={muted}
          onToggleMute={toggleMute}
        >
          <button
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded focus:outline-none focus:ring disabled:opacity-50"
            onClick={handleUndo}
            disabled={history.length === 0}
          >
            Undo
          </button>
          <label className="flex items-center space-x-1 px-2">
            <input
              type="checkbox"
              checked={hard}
              onChange={(e) => setHard(e.target.checked)}
            />
            <span>Hard</span>
          </label>
          <label className="flex items-center space-x-1 px-2">
            <span>Board</span>
            <select
              className="text-black px-1 rounded"
              value={boardType}
              onChange={(e) => setBoardType(e.target.value as 'classic' | 'hex')}
            >
              <option value="classic">Classic</option>
              <option value="hex">Hex 2048</option>
            </select>
          </label>
          <button
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded focus:outline-none focus:ring"
            onClick={close}
          >
            Close
          </button>
        </GameToolbar>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="px-4 py-2 bg-gray-700 rounded">Score: {score}</div>
          <div className="px-4 py-2 bg-gray-700 rounded">High Score: {highScore}</div>
          <div className="px-4 py-2 bg-gray-700 rounded">Best Tile: {bestTile}</div>
          <div className="px-4 py-2 bg-gray-700 rounded">Moves: {moves.length}</div>
          {hard && <div className="px-4 py-2 bg-gray-700 rounded">Timer: {timer}</div>}
          {paused && <div className="px-4 py-2 bg-gray-700 rounded">Paused</div>}
        </div>
      </div>
      <div className="grid w-full max-w-sm grid-cols-4 gap-2">
        {board.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className={`w-full aspect-square ${prefersReducedMotion ? '' : 'transition-transform transition-opacity'}`}
            >
              <div
                className={`h-full w-full flex items-center justify-center text-2xl font-bold rounded ${
                  cell ? tileColors[cell] || 'bg-gray-700' : 'bg-gray-800'
                }`}
              >
                {displayCell(cell)}
              </div>
            </div>
          ))
        )}
      </div>
      {(won || lost) && (
        <div className="mt-4 text-xl">{won ? 'You win!' : 'Game over'}</div>
      )}
    </div>
  );
};

export default Page2048;

