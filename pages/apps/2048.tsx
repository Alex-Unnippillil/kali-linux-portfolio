import { useCallback, useEffect, useRef, useState } from 'react';
import ReactGA from 'react-ga4';

const SIZE = 4;

// simple seeded PRNG
const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const todaySeed = () => {
  const d = new Date();
  return parseInt(`${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`, 10);
};

const slideRow = (row: number[]) => {
  const arr = row.filter((n) => n !== 0);
  for (let i = 0; i < arr.length - 1; i += 1) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      arr[i + 1] = 0;
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < SIZE) newRow.push(0);
  return newRow;
};

const transpose = (board: number[][]) => board[0].map((_, c) => board.map((row) => row[c]));
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

const addRandomTile = (b: number[][], rand: () => number, hard = false) => {
  const empty: [number, number][] = [];
  b.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(rand() * empty.length)];
  const prob = hard ? 0.6 : 0.9;
  b[r][c] = rand() < prob ? 2 : 4;
};

// -------- Expectimax AI --------
const getEmpty = (board: number[][]) => {
  const empty: [number, number][] = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    })
  );
  return empty;
};

const smoothness = (board: number[][]) => {
  let sum = 0;
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (c < SIZE - 1 && board[r][c] && board[r][c + 1])
        sum -= Math.abs(board[r][c] - board[r][c + 1]);
      if (r < SIZE - 1 && board[r][c] && board[r + 1][c])
        sum -= Math.abs(board[r][c] - board[r + 1][c]);
    }
  }
  return sum;
};

const monotonicity = (board: number[][]) => {
  const totals = [0, 0, 0, 0];
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE - 1; c += 1) {
      const cur = board[r][c];
      const next = board[r][c + 1];
      if (cur > next) totals[0] += cur - next;
      else totals[1] += next - cur;
    }
  }
  for (let c = 0; c < SIZE; c += 1) {
    for (let r = 0; r < SIZE - 1; r += 1) {
      const cur = board[r][c];
      const next = board[r + 1][c];
      if (cur > next) totals[2] += cur - next;
      else totals[3] += next - cur;
    }
  }
  return Math.max(totals[0], totals[1]) + Math.max(totals[2], totals[3]);
};

const evaluate = (board: number[][]) =>
  10 * getEmpty(board).length + monotonicity(board) + smoothness(board);

const movesMap: Record<string, (b: number[][]) => number[][]> = {
  ArrowLeft: moveLeft,
  ArrowRight: moveRight,
  ArrowUp: moveUp,
  ArrowDown: moveDown,
};

const expectimax = (
  board: number[][],
  depth: number,
  player: boolean,
  hard: boolean,
): number => {
  if (depth === 0 || !hasMoves(board)) return evaluate(board);
  if (player) {
    let max = -Infinity;
    Object.values(movesMap).forEach((fn) => {
      const next = fn(board);
      if (!boardsEqual(board, next)) {
        const val = expectimax(next, depth - 1, false, hard);
        if (val > max) max = val;
      }
    });
    return max === -Infinity ? evaluate(board) : max;
  }
  const empty = getEmpty(board);
  if (empty.length === 0) return evaluate(board);
  const p4 = hard ? 0.4 : 0.1;
  let total = 0;
  empty.forEach(([r, c]) => {
    board[r][c] = 2;
    total += (1 - p4) * expectimax(board, depth - 1, true, hard);
    board[r][c] = 4;
    total += p4 * expectimax(board, depth - 1, true, hard);
    board[r][c] = 0;
  });
  return total / empty.length;
};

const findBestMove = (board: number[][], depth = 3, hard = false): string | null => {
  let best: string | null = null;
  let bestScore = -Infinity;
  Object.entries(movesMap).forEach(([dir, fn]) => {
    const next = fn(board);
    if (!boardsEqual(board, next)) {
      const val = expectimax(next, depth - 1, false, hard);
      if (val > bestScore) {
        bestScore = val;
        best = dir;
      }
    }
  });
  return best;
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
  const rngRef = useRef(mulberry32(todaySeed()));
  const [board, setBoard] = useState<number[][]>(() => {
    const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    addRandomTile(b, rngRef.current, false);
    addRandomTile(b, rngRef.current, false);
    return b;
  });
  const [hard, setHard] = useState(false);
  const [timer, setTimer] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [moves, setMoves] = useState<string[]>([]);
  const [highest, setHighest] = useState(0);
  const [boardType, setBoardType] = useState<'classic' | 'hex'>('classic');
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setHint(findBestMove(board, 4, hard));
  }, [board, hard]);

  const resetTimer = useCallback(() => {
    if (!hard) return;
    setTimer(3);
  }, [hard]);

  useEffect(() => {
    if (!hard) return;
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
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
      addRandomTile(moved, rngRef.current, hard);
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
    [board, won, lost, highest, boardType, resetTimer, hard]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        handleMove(e.key as any);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleMove]);

  const reset = () => {
    const rand = mulberry32(todaySeed());
    rngRef.current = rand;
    const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    addRandomTile(b, rand, hard);
    addRandomTile(b, rand, hard);
    setBoard(b);
    setMoves([]);
    setWon(false);
    setLost(false);
    setHighest(0);
    resetTimer();
  };

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
    }
  }, [won, lost, moves, boardType, hard]);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2 items-center">
        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={reset}>
          Reset
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => hint && handleMove(hint as any)}
        >
          AI
        </button>
        <label className="flex items-center space-x-1 px-2">
          <input type="checkbox" checked={hard} onChange={(e) => setHard(e.target.checked)} />
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
        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={close}>
          Close
        </button>
        {hard && <div className="ml-2">{timer}</div>}
        <div className="ml-auto">Hint: {hint ? hint.replace('Arrow', '') : ''}</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {board.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className={`h-16 w-16 flex items-center justify-center text-2xl font-bold rounded ${
                cell ? tileColors[cell] || 'bg-gray-700' : 'bg-gray-800'
              }`}
            >
              {displayCell(cell)}
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

