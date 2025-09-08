'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Replays from './replays';

import ReactGA from 'react-ga4';
import { useSwipeable } from 'react-swipeable';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import usePersistentState from '../../hooks/usePersistentState';
import { getDailySeed } from '../../utils/dailySeed';

import { isBrowser } from '@/utils/env';
import { loadState, saveState, clearState } from './storage';


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
  const merged: number[] = [];
  for (let i = 0; i < arr.length - 1; i += 1) {
    const current = arr[i]!;
    const next = arr[i + 1]!;
    if (current === next) {
      arr[i] = current * 2;
      arr[i + 1] = 0;
      merged.push(i);
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < SIZE) newRow.push(0);
  return { row: newRow, merged };
};

const transpose = (board: number[][]): number[][] => {
  if (board.length === 0) return [];
  return board[0].map((_, c) => board.map((row) => row[c]));
};
const flip = (board: number[][]) => board.map((row) => [...row].reverse());

const moveLeft = (board: number[][]) => {
  const mergedCells: [number, number][] = [];
  const newBoard = board.map((row, r) => {
    const { row: newRow, merged } = slideRow(row);
    merged.forEach((c) => mergedCells.push([r, c]));
    return newRow;
  });
  return { board: newBoard, merged: mergedCells };
};

const moveRight = (board: number[][]) => {
  const flipped = board.map((row) => [...row].reverse());
  const result = moveLeft(flipped);
  const newBoard = result.board.map((row) => row.reverse());
  const merged = result.merged.map(([r, c]) => [r, SIZE - 1 - c] as [number, number]);
  return { board: newBoard, merged };
};

const moveUp = (board: number[][]) => {
  const trans = transpose(board);
  const result = moveLeft(trans);
  const newBoard = transpose(result.board);
  const merged = result.merged.map(([r, c]) => [c, r] as [number, number]);
  return { board: newBoard, merged };
};

const moveDown = (board: number[][]) => {
  const trans = transpose(board);
  const result = moveRight(trans);
  const newBoard = transpose(result.board);
  const merged = result.merged.map(([r, c]) => [c, r] as [number, number]);
  return { board: newBoard, merged };
};

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
  if (empty.length === 0) return null;
  const [r, c] = empty[Math.floor(rand() * empty.length)];
  b[r][c] = rand() < 0.9 ? 2 : 4;
  return [r, c] as [number, number];
};


const tileColors: Record<number, string> = {
  2: 'bg-[#eee4da] text-[#776e65]',
  4: 'bg-[#ede0c8] text-[#776e65]',
  8: 'bg-[#f2b179] text-[#f9f6f2]',
  16: 'bg-[#f59563] text-[#f9f6f2]',
  32: 'bg-[#f67c5f] text-[#f9f6f2]',
  64: 'bg-[#f65e3b] text-[#f9f6f2]',
  128: 'bg-[#edcf72] text-[#f9f6f2]',
  256: 'bg-[#edcc61] text-[#f9f6f2]',
  512: 'bg-[#edc850] text-[#f9f6f2]',
  1024: 'bg-[#edc53f] text-[#f9f6f2]',
  2048: 'bg-[#edc22e] text-[#f9f6f2]',
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
  const [spawnCells, setSpawnCells] = useState<Set<string>>(new Set());
  const [mergeCells, setMergeCells] = useState<Set<string>>(new Set());


  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await getDailySeed('2048');
      const seed = hashSeed(s);
      const rand = mulberry32(seed);
      if (!mounted) return;

      const saved = loadState();
      if (saved) {
        setBoard(saved.board);
        setHighest(saved.highest);
        setWon(saved.won);
        setLost(saved.lost);
      } else {
        const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        addRandomTile(b, rand);
        addRandomTile(b, rand);
        setBoard(b);
      }

      rngRef.current = rand;
      seedRef.current = seed;
      setSeedStr(s);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    saveState({ board, highest, won, lost });
  }, [board, highest, won, lost]);

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

  useEffect(() => {
    if (spawnCells.size > 0) {
      const t = setTimeout(() => setSpawnCells(new Set()), 150);
      return () => clearTimeout(t);
    }
  }, [spawnCells]);

  useEffect(() => {
    if (mergeCells.size > 0) {
      const t = setTimeout(() => setMergeCells(new Set()), 300);
      return () => clearTimeout(t);
    }
  }, [mergeCells]);

  const handleMove = useCallback(
    (dir: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => {
      if (won || lost) return;
      let result:
        | { board: number[][]; merged: [number, number][] }
        | undefined;
      if (dir === 'ArrowLeft') result = moveLeft(board);
      if (dir === 'ArrowRight') result = moveRight(board);
      if (dir === 'ArrowUp') result = moveUp(board);
      if (dir === 'ArrowDown') result = moveDown(board);
      if (!result || boardsEqual(board, result.board)) return;
      const moved = result.board;
      setHistory((h) => [...h, board.map((row) => [...row])]);
      const added = addRandomTile(moved, rngRef.current);
      if (added) setSpawnCells(new Set([`${added[0]}-${added[1]}`]));
      setMergeCells(new Set(result.merged.map(([r, c]) => `${r}-${c}`)));

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

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleMove('ArrowLeft'),
    onSwipedRight: () => handleMove('ArrowRight'),
    onSwipedUp: () => handleMove('ArrowUp'),
    onSwipedDown: () => handleMove('ArrowDown'),
  });

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
      setSpawnCells(new Set());
      setMergeCells(new Set());
      return h.slice(0, -1);
    });
  }, [resetTimer]);

  const restart = useCallback(() => {
    clearState();
    const rand = mulberry32(seedRef.current);
    rngRef.current = rand;
    const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    const added: string[] = [];
    const a1 = addRandomTile(b, rand);
    if (a1) added.push(`${a1[0]}-${a1[1]}`);
    const a2 = addRandomTile(b, rand);
    if (a2) added.push(`${a2[0]}-${a2[1]}`);

    setBoard(b);
    setSpawnCells(new Set(added));
    setMergeCells(new Set());
    setMoves([]);
    setHistory([]);
    setWon(false);
    setLost(false);
    setHighest(0);
    resetTimer();
  }, [resetTimer]);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLbError(false);
      const res = await fetch('/api/leaderboard/top?game=2048&limit=10');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (Array.isArray(data)) setLeaderboard(data);
      else setLeaderboard([]);
    } catch {
      setLbError(true);
      setLeaderboard([]);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);


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

  const close = useCallback(() => {
    if (isBrowser()) {
      document.getElementById('close-2048')?.click();
    }
  }, []);

  const displayCell = useCallback(
    (v: number) => {
      if (v === 0) return '';
      if (boardType === 'hex') return v.toString(16).toUpperCase();
      return v;
    },
    [boardType]
  );

  const renderedBoard = useMemo(
    () =>
      board.map((row, rIdx) =>
        row.map((cell, cIdx) => (
          <div
            key={`${rIdx}-${cIdx}`}
            className={`w-full aspect-square ${
              prefersReducedMotion ? '' : 'transition-transform transition-opacity'
            }`}
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
      ),
    [board, prefersReducedMotion, displayCell]
  );

  useEffect(() => {
    if (won || lost) {
      let name = playerName;
      if (!name && isBrowser()) {
        name = window.prompt('Enter your name')?.trim() || '';
        setPlayerName(name);
      }
      saveReplay({ date: new Date().toISOString(), moves, boardType, hard });

      fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: '2048',
          username: name || 'Anonymous',
          score: highest,
        }),
      })
        .then(() => loadLeaderboard())
        .catch(() => {
          // ignore network errors
        });
    }
  }, [won, lost, moves, boardType, hard, highest, playerName, setPlayerName, loadLeaderboard]);


  return (
    <div {...swipeHandlers} className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2">
        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={restart}>
          Restart
        </button>
        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={handleUndo}>
          Undo
        </button>
          <label className="flex items-center space-x-1 px-2">
            <input
              type="checkbox"
              aria-label="Hard mode"
              checked={hard}
              onChange={(e) => setHard(e.target.checked)}
            />
            <span>Hard</span>
          </label>

        <select
          className="text-black px-1 rounded"
          value={boardType}
          onChange={(e) => setBoardType(e.target.value as any)}
        >

          <option value="classic">Classic</option>
          <option value="hex">Hex 2048</option>
        </select>
        <input
          className="text-black px-1 rounded"
          placeholder="Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={close}>
          Close
        </button>
        {hard && <div className="ml-2">{timer}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="px-4 py-2 bg-gray-700 rounded">Score: {highest}</div>
        <div className="px-4 py-2 bg-gray-700 rounded">Moves: {moves.length}</div>
        <div className="px-4 py-2 bg-gray-700 rounded">Seed: {seedStr}</div>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={handleShare}
        >
          Share
        </button>
      </div>
      <div className="grid w-full max-w-sm grid-cols-4 gap-2">
        {board.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            const pos = `${rIdx}-${cIdx}`;
            const animClass = prefersReducedMotion
              ? ''
              : spawnCells.has(pos)
              ? 'animate-scale-in'
              : mergeCells.has(pos)
              ? 'animate-merge-pulse'
              : '';
            return (
              <div
                key={`${pos}-${cell}`}
                className={`w-full aspect-square ${prefersReducedMotion ? '' : 'transition-transform transition-opacity'}`}
              >
                <div
                  className={`h-full w-full flex items-center justify-center text-2xl font-bold rounded ${
                    cell ? tileColors[cell] || 'bg-gray-700' : 'bg-gray-800'
                  } ${animClass}`}
                >
                  {displayCell(cell)}
                </div>
              </div>
            );
          })
        )}

      </div>
      {(won || lost) && (
        <div className="mt-4 text-xl">{won ? 'You win!' : 'Game over'}</div>
      )}
      <div className="mt-4">
        <h2 className="font-bold">Leaderboard</h2>
        {lbError ? (
          <div className="text-sm">Failed to load leaderboard</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-sm">No scores yet</div>
        ) : (
          <ol className="list-decimal list-inside">
            {leaderboard.map((entry, i) => (
              <li key={i}>
                {entry.username}: {entry.score}
              </li>
            ))}
          </ol>
        )}
      </div>

    </div>
  );
};

export default Page2048;

