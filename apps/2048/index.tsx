'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logEvent } from '../../utils/analytics';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { getDailySeed } from '../../utils/dailySeed';

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

const slideRowLeft = (row: number[]) => {
  const arr = row.filter((n) => n !== 0);
  const merges: number[] = [];
  for (let i = 0; i < arr.length - 1; i += 1) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      arr[i + 1] = 0;
      merges.push(i);
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < SIZE) newRow.push(0);
  return { row: newRow, merges };
};

const transpose = (board: number[][]) => board[0].map((_, c) => board.map((row) => row[c]));

const moveBoard = (
  board: number[][],
  direction: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'
) => {
  const merges: string[] = [];
  if (direction === 'ArrowLeft') {
    const next = board.map((row, rIdx) => {
      const { row: newRow, merges: rowMerges } = slideRowLeft(row);
      rowMerges.forEach((colIdx) => merges.push(`${rIdx}-${colIdx}`));
      return newRow;
    });
    return { board: next, merges };
  }
  if (direction === 'ArrowRight') {
    const next = board.map((row, rIdx) => {
      const reversed = [...row].reverse();
      const { row: newRow, merges: rowMerges } = slideRowLeft(reversed);
      rowMerges.forEach((colIdx) => merges.push(`${rIdx}-${SIZE - 1 - colIdx}`));
      return [...newRow].reverse();
    });
    return { board: next, merges };
  }
  if (direction === 'ArrowUp') {
    const transposed = transpose(board);
    const moved = transposed.map((row, colIdx) => {
      const { row: newRow, merges: rowMerges } = slideRowLeft(row);
      rowMerges.forEach((rowIdx) => merges.push(`${rowIdx}-${colIdx}`));
      return newRow;
    });
    return { board: transpose(moved), merges };
  }
  const transposed = transpose(board);
  const moved = transposed.map((row, colIdx) => {
    const reversed = [...row].reverse();
    const { row: newRow, merges: rowMerges } = slideRowLeft(reversed);
    rowMerges.forEach((rowIdx) => merges.push(`${SIZE - 1 - rowIdx}-${colIdx}`));
    return [...newRow].reverse();
  });
  return { board: transpose(moved), merges };
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

const addRandomTile = (b: number[][], rand: () => number): [number, number] | null => {
  const empty: [number, number][] = [];
  b.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return null;
  const [r, c] = empty[Math.floor(rand() * empty.length)];
  b[r][c] = rand() < 0.9 ? 2 : 4;
  return [r, c];
};

const tileColors: Record<number, string> = {
  2: 'bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,var(--kali-control)_8%)] text-[var(--kali-text)]',
  4: 'bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,var(--kali-control)_12%)] text-[var(--kali-text)]',
  8: 'bg-[color:color-mix(in_srgb,var(--color-warning)_45%,var(--kali-panel))] text-[var(--kali-text)]',
  16: 'bg-[color:color-mix(in_srgb,var(--color-warning)_55%,var(--kali-panel))] text-[var(--kali-text)]',
  32: 'bg-[color:color-mix(in_srgb,var(--color-warning)_65%,var(--kali-panel))] text-[var(--kali-text)]',
  64: 'bg-[color:color-mix(in_srgb,var(--color-warning)_75%,var(--kali-panel))] text-[var(--kali-text)]',
  128: 'bg-[color:color-mix(in_srgb,var(--color-info)_55%,var(--kali-panel))] text-[var(--kali-text)]',
  256: 'bg-[color:color-mix(in_srgb,var(--color-info)_65%,var(--kali-panel))] text-[var(--kali-text)]',
  512: 'bg-[color:color-mix(in_srgb,var(--color-info)_75%,var(--kali-panel))] text-[var(--kali-text)]',
  1024: 'bg-[color:color-mix(in_srgb,var(--game-color-success)_60%,var(--kali-panel))] text-[var(--kali-text)]',
  2048: 'bg-[color:color-mix(in_srgb,var(--game-color-success)_72%,var(--kali-panel))] text-[var(--kali-text)]',
  4096: 'bg-[color:color-mix(in_srgb,var(--color-control-accent)_75%,var(--kali-panel))] text-[var(--kali-text)]',
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
  const [mergeHighlights, setMergeHighlights] = useState<string[]>([]);
  const mergeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [spawnHighlight, setSpawnHighlight] = useState<string | null>(null);
  const spawnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const { board: moved, merges } = moveBoard(board, dir);
      if (!moved || boardsEqual(board, moved)) return;
      setHistory((h) => [...h, board.map((row) => [...row])]);
      const spawn = addRandomTile(moved, rngRef.current);
      const newHighest = checkHighest(moved);
      if ((newHighest === 2048 || newHighest === 4096) && newHighest > highest) {
        logEvent({ category: '2048', action: 'post_score', value: newHighest, label: boardType });
      }
      setHighest(newHighest);
      setBoard(moved);
      setMoves((m) => [...m, dir]);
      if (mergeTimeoutRef.current) {
        clearTimeout(mergeTimeoutRef.current);
        mergeTimeoutRef.current = null;
      }
      setMergeHighlights(merges);
      mergeTimeoutRef.current = setTimeout(
        () => setMergeHighlights([]),
        prefersReducedMotion ? 600 : 350
      );
      if (spawnTimeoutRef.current) {
        clearTimeout(spawnTimeoutRef.current);
        spawnTimeoutRef.current = null;
      }
      setSpawnHighlight(spawn ? `${spawn[0]}-${spawn[1]}` : null);
      if (spawn) {
        spawnTimeoutRef.current = setTimeout(
          () => setSpawnHighlight(null),
          prefersReducedMotion ? 600 : 350
        );
      }
      resetTimer();
      if (newHighest >= 2048) setWon(true);
      else if (!hasMoves(moved)) setLost(true);
    },
    [board, won, lost, highest, boardType, resetTimer, prefersReducedMotion]
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
      if (mergeTimeoutRef.current) {
        clearTimeout(mergeTimeoutRef.current);
        mergeTimeoutRef.current = null;
      }
      setMergeHighlights([]);
      if (spawnTimeoutRef.current) {
        clearTimeout(spawnTimeoutRef.current);
        spawnTimeoutRef.current = null;
      }
      setSpawnHighlight(null);
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
    if (mergeTimeoutRef.current) {
      clearTimeout(mergeTimeoutRef.current);
      mergeTimeoutRef.current = null;
    }
    setMergeHighlights([]);
    if (spawnTimeoutRef.current) {
      clearTimeout(spawnTimeoutRef.current);
      spawnTimeoutRef.current = null;
    }
    setSpawnHighlight(null);
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
    if (typeof document !== 'undefined') {
      document.getElementById('close-2048')?.click();
    }
  };

  const displayCell = (v: number) => {
    if (v === 0) return '';
    if (boardType === 'hex') return v.toString(16).toUpperCase();
    return v;
  };

  useEffect(
    () => () => {
      if (mergeTimeoutRef.current) clearTimeout(mergeTimeoutRef.current);
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
      mergeTimeoutRef.current = null;
      spawnTimeoutRef.current = null;
    },
    []
  );

  const currentScore = useMemo(
    () => board.flat().reduce((sum, tile) => sum + tile, 0),
    [board]
  );

  const renderTileStyles = (key: string, hasValue: boolean) => {
    const isMerged = mergeHighlights.includes(key);
    const isSpawned = spawnHighlight === key;
    const emphasisBase = isMerged
      ? 'ring-2 ring-[color:color-mix(in_srgb,var(--color-warning)_70%,transparent)] ring-offset-2 ring-offset-[color:var(--kali-bg)]'
      : isSpawned
        ? 'ring-2 ring-[color:color-mix(in_srgb,var(--color-control-accent)_70%,transparent)] ring-offset-2 ring-offset-[color:var(--kali-bg)]'
        : '';
    const motionStyles = prefersReducedMotion
      ? ''
      : isMerged
        ? 'scale-105'
        : isSpawned
          ? 'scale-110'
          : '';
    return [
      'h-full w-full rounded-lg font-semibold flex items-center justify-center text-2xl md:text-3xl transition-colors',
      prefersReducedMotion ? '' : 'transition-transform duration-200 ease-out',
      emphasisBase,
      motionStyles,
      hasValue ? '' : 'text-[color:color-mix(in_srgb,var(--kali-text)_45%,transparent)]',
    ]
      .filter(Boolean)
      .join(' ');
  };

  // Layout readability audit: split the header into a metrics stack and action tray, widened grid gaps,
  // and promoted status banners into high-contrast cards using Tailwind spacing tokens (gap-3, px-3, py-2).

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
    <div className="h-full w-full overflow-auto bg-[var(--kali-bg)] text-[var(--kali-text)]">
      <main className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--kali-text)]">2048</h1>
            <p className="text-sm text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
              Merge tiles to hit 2048. Hard mode adds a countdown after each move.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] px-3 py-2 text-right">
              <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">Best Tile</div>
              <div className="text-lg font-semibold text-[var(--kali-text)]">{highest || 0}</div>
            </div>
            <div className="rounded-lg bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] px-3 py-2 text-right">
              <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">Score</div>
              <div className="text-lg font-semibold text-[var(--kali-text)]">{currentScore}</div>
            </div>
            <div className="rounded-lg bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] px-3 py-2 text-right">
              <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">Moves</div>
              <div className="text-lg font-semibold text-[var(--kali-text)]">{moves.length}</div>
            </div>
            {hard && (
              <div className="rounded-lg bg-[color:color-mix(in_srgb,var(--color-warning)_35%,var(--kali-panel))] px-3 py-2 text-right">
                <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--color-warning)_70%,var(--kali-text))]">Countdown</div>
                <div className="text-lg font-semibold text-[color:color-mix(in_srgb,var(--color-warning)_80%,var(--kali-text))]">{timer}</div>
              </div>
            )}
          </div>
        </header>
        <section aria-label="Game controls" className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-[color:color-mix(in_srgb,var(--kali-control)_24%,var(--kali-panel))] px-4 py-2 text-sm font-medium text-[var(--kali-text)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--kali-control)_32%,var(--kali-panel))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            onClick={restart}
          >
            Restart
          </button>
          <button
            className="rounded-md bg-[color:color-mix(in_srgb,var(--kali-control)_24%,var(--kali-panel))] px-4 py-2 text-sm font-medium text-[var(--kali-text)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--kali-control)_32%,var(--kali-panel))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            onClick={handleUndo}
          >
            Undo
          </button>
          <div className="flex items-center gap-2 rounded-md bg-[color:color-mix(in_srgb,var(--kali-panel)_80%,transparent)] px-3 py-2 text-sm text-[var(--kali-text)]">
            <input
              type="checkbox"
              checked={hard}
              onChange={(e) => setHard(e.target.checked)}
              className="h-4 w-4 rounded border-[color:color-mix(in_srgb,var(--kali-control)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_65%,transparent)] text-[color:var(--color-control-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
              id="hard-mode-toggle"
              aria-label="Enable hard mode"
            />
            <label htmlFor="hard-mode-toggle" className="cursor-pointer select-none">
              Hard mode
            </label>
          </div>
          <select
            className="rounded-md border border-[color:color-mix(in_srgb,var(--kali-control)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,transparent)] px-3 py-2 text-sm font-medium text-[var(--kali-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            value={boardType}
            onChange={(e) => setBoardType(e.target.value as any)}
            aria-label="Tile notation"
          >
            <option value="classic">Classic</option>
            <option value="hex">Hex 2048</option>
          </select>
          <button
            className="rounded-md bg-[color:color-mix(in_srgb,var(--kali-control)_24%,var(--kali-panel))] px-4 py-2 text-sm font-medium text-[var(--kali-text)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--kali-control)_32%,var(--kali-panel))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            onClick={close}
          >
            Close
          </button>
        </section>
        <section
          aria-label="2048 board"
          className="mx-auto w-full max-w-lg rounded-2xl bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] p-3 shadow-inner"
        >
          <div className="grid grid-cols-4 gap-3">
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const key = `${rIdx}-${cIdx}`;
                const tileClassName = renderTileStyles(key, Boolean(cell));
                return (
                  <div
                    key={key}
                    className={`aspect-square w-full rounded-xl bg-[color:color-mix(in_srgb,var(--kali-panel)_55%,transparent)] p-1 ${
                      prefersReducedMotion ? '' : 'transition-colors'
                    }`}
                  >
                    <div
                      className={`${tileClassName} ${
                        cell
                          ? tileColors[cell] ||
                            'bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,var(--kali-control)_18%)] text-[var(--kali-text)]'
                          : 'bg-[color:color-mix(in_srgb,var(--kali-panel)_35%,transparent)]'
                      }`}
                    >
                      {displayCell(cell)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
        {(won || lost) && (
          <div
            className={`rounded-xl border px-4 py-3 text-base font-semibold shadow-lg ${
              won
                ? 'border-[color:color-mix(in_srgb,var(--game-color-success)_65%,transparent)] bg-[color:color-mix(in_srgb,var(--game-color-success)_22%,var(--kali-panel))] text-[color:color-mix(in_srgb,var(--game-color-success)_75%,var(--kali-text))]'
                : 'border-[color:color-mix(in_srgb,var(--game-color-danger)_65%,transparent)] bg-[color:color-mix(in_srgb,var(--game-color-danger)_22%,var(--kali-panel))] text-[color:color-mix(in_srgb,var(--game-color-danger)_75%,var(--kali-text))]'
            }`}
            role="status"
            aria-live="polite"
          >
            {won
              ? 'You win! Keep playing to chase a higher tile.'
              : 'Game over. Restart to try the daily board again.'}
          </div>
        )}
      </main>
    </div>
  );
};

export default Page2048;
