'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Replays from './replays';
import ReactGA from 'react-ga4';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { getDailySeed } from '../../utils/dailySeed';
import { isBrowser } from '@/utils/env';

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

const slideRow = (row: number[]) => {
  const arr = row.filter((n) => n !== 0);
  for (let i = 0; i < arr.length - 1; i += 1) {
    const current = arr[i]!;
    const next = arr[i + 1]!;
    if (current === next) {
      arr[i] = current * 2;
      arr[i + 1] = 0;
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < SIZE) newRow.push(0);
  return newRow;
};

const transpose = (board: number[][]): number[][] => {
  if (board.length === 0) return [];
  return board[0].map((_, c) => board.map((row) => row[c]));
};
const flip = (board: number[][]) => board.map((row) => [...row].reverse());

const moveLeft = (board: number[][]) => board.map((row) => slideRow(row));
const moveRight = (board: number[][]) => flip(moveLeft(flip(board)));
const moveUp = (board: number[][]) => transpose(moveLeft(transpose(board)));
const moveDown = (board: number[][]) => transpose(moveRight(transpose(board)));

const boardsEqual = (a: number[][], b: number[][]) =>
  a.every((row, r) => row.every((cell, c) => cell === b[r][c]));

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
  const [highest, setHighest] = useState(0);
  const [boardType, setBoardType] = useState<'classic' | 'hex'>('classic');
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [history, setHistory] = useState<number[][][]>([]);
  const [showReplays, setShowReplays] = useState(false);

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
    if (!hard) return;
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
  }, [hard, moves, boardType]);

  const handleMove = useCallback(
    (dir: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => {
      if (won || lost) return;
      let moved: number[][] | undefined;
      if (dir === 'ArrowLeft') moved = moveLeft(board);
      if (dir === 'ArrowRight') moved = moveRight(board);
      if (dir === 'ArrowUp') moved = moveUp(board);
      if (dir === 'ArrowDown') moved = moveDown(board);
      if (!moved || boardsEqual(board, moved)) return;
      setHistory((h) => [...h, board.map((row) => [...row])]);
      addRandomTile(moved, rngRef.current);
      const newHighest = checkHighest(moved);
      if ((newHighest === 2048 || newHighest === 4096) && newHighest > highest) {
        ReactGA.event('post_score', { score: newHighest, board: boardType });
      }
      setHighest(newHighest);
      setBoard(moved);
      setMoves((m) => [...m, dir]);
      resetTimer();
      if (newHighest >= 2048) setWon(true);
      else if (!hasMoves(moved)) setLost(true);
    },
    [board, won, lost, highest, boardType, resetTimer]
  );

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setBoard(prev.map((row) => [...row]));
      setMoves((m) => m.slice(0, -1));
      setHighest(checkHighest(prev));
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
    setWon(false);
    setLost(false);
    setHighest(0);
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
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
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleMove, restart, handleUndo]);

  const close = () => {
    if (isBrowser()) {
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
      const frames = [
        ...history.map((h) => h.map((row) => [...row])),
        board.map((row) => [...row]),
      ];
      saveReplay({
        date: new Date().toISOString(),
        moves,
        boardType,
        hard,
        frames,
      });
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
  }, [won, lost, moves, boardType, hard, highest, history, board]);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2">
        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={restart}>
          Restart
        </button>
        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={handleUndo}>
          Undo
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setShowReplays(true)}
        >
          Replays
        </button>
        <div className="flex items-center space-x-1 px-2">
          <input
            id="hard-mode"
            aria-label="Hard mode"
            type="checkbox"
            checked={hard}
            onChange={(e) => setHard(e.target.checked)}
          />
          <label htmlFor="hard-mode">Hard</label>
        </div>
        <select
          className="text-black px-1 rounded"
          value={boardType}
          onChange={(e) => setBoardType(e.target.value as any)}
        >
          <option value="classic">Classic</option>
          <option value="hex">Hex 2048</option>
        </select>
        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={close}>
          Close
        </button>
        {hard && <div className="ml-2">{timer}</div>}
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
      {showReplays && <Replays onClose={() => setShowReplays(false)} />}
    </div>
  );
};

export default Page2048;

