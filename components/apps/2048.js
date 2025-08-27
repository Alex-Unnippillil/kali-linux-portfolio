import { useEffect, useCallback, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import GameLayout from './GameLayout';
import useGameControls from './useGameControls';
import { findHint } from '../../apps/games/_2048/ai';

const SIZE = 4;

// seeded RNG so tests can be deterministic
let rng = Math.random;
export const setSeed = (seed) => {
  let t = seed >>> 0;
  rng = () => {
    t += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

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
    const [r, c] = empty[Math.floor(rng() * empty.length)];
    board[r][c] = hard ? 4 : rng() < 0.9 ? 2 : 4;
    added.push(`${r}-${c}`);
  }
  return added;
};

const slide = (row) => {
  const arr = row.filter((n) => n !== 0);
  let merged = false;
  let score = 0;
  const mergedPositions = [];
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      score += arr[i];
      arr[i + 1] = 0;
      merged = true;
      mergedPositions.push(i);
    }
  }
  const newRow = arr.filter((n) => n !== 0);
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

const validateBoard = (b) =>
  Array.isArray(b) &&
  b.length === SIZE &&
  b.every(
    (row) => Array.isArray(row) && row.length === SIZE && row.every((n) => typeof n === 'number'),
  );

const Game2048 = () => {
  const [board, setBoard] = usePersistentState('2048-board', initBoard, validateBoard);
  const [won, setWon] = usePersistentState('2048-won', false, (v) => typeof v === 'boolean');
  const [lost, setLost] = usePersistentState('2048-lost', false, (v) => typeof v === 'boolean');
  const [history, setHistory] = useState(null);
  const [hardMode, setHardMode] = usePersistentState('2048-hard', false, (v) => typeof v === 'boolean');
  const [colorBlind, setColorBlind] = usePersistentState('2048-cb', false, (v) => typeof v === 'boolean');
  const [animCells, setAnimCells] = useState(new Set());
  const [mergeCells, setMergeCells] = useState(new Set());
  const [score, setScore] = useState(0);
  const [scorePop, setScorePop] = useState(false);
  const [combo, setCombo] = useState(0);
  const [hint, setHint] = useState(null);
  const [demo, setDemo] = useState(false);

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
    setHint(findHint(board));
  }, [board]);

  const handleDirection = useCallback(
    ({ x, y }) => {
      if (won || lost) return;
      let result;
      if (x === -1) result = moveLeft(board);
      else if (x === 1) result = moveRight(board);
      else if (y === -1) result = moveUp(board);
      else if (y === 1) result = moveDown(board);
      else return;
      const { board: moved, merged, score: gained, mergedCells } = result;
      if (!boardsEqual(board, moved)) {
        const added = addRandomTile(moved, hardMode, hardMode ? 2 : 1);
        setHistory({ board: cloneBoard(board), score });
        setAnimCells(new Set(added));
        setMergeCells(new Set(mergedCells));
        if (gained > 0) {
          setScore((s) => s + gained);
          setScorePop(true);
        }
        setBoard(cloneBoard(moved));
        if (merged) navigator.vibrate?.(50);
        if (mergedCells.length > 1) {
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
    [board, won, lost, hardMode, score, setBoard, setLost, setWon],
  );

  useGameControls(handleDirection, '2048');

  useEffect(() => {
    const stop = () => setDemo(false);
    window.addEventListener('keydown', stop);
    return () => window.removeEventListener('keydown', stop);
  }, []);

  useEffect(() => {
    if (!demo) return;
    const dirMap = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const id = setInterval(() => {
      const best = findHint(board);
      if (!best) {
        setDemo(false);
        return;
      }
      handleDirection(dirMap[best]);
    }, 400);
    return () => clearInterval(id);
  }, [demo, board, handleDirection]);

  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Escape') {
        document.getElementById('close-2048')?.click();
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const reset = () => {
    setBoard(initBoard(hardMode));
    setHistory(null);
    setWon(false);
    setLost(false);
    setAnimCells(new Set());
    setMergeCells(new Set());
    setScore(0);
  };

  const close = () => {
    document.getElementById('close-2048')?.click();
  };

  const undo = () => {
    if (!history) return;
    setBoard(cloneBoard(history.board));
    setScore(history.score);
    setWon(checkWin(history.board));
    setLost(!hasMoves(history.board));
    setAnimCells(new Set());
    setMergeCells(new Set());
    setHistory(null);
  };

  return (
    <GameLayout>
      <>
        <div className="mb-2 flex flex-wrap gap-2 items-center">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={reset}
          >
            Reset
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
            onClick={undo}
            disabled={!history}
          >
            Undo
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
              checked={colorBlind}
              onChange={() => setColorBlind(!colorBlind)}
            />
            <span>Colorblind</span>
          </label>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => setDemo((d) => !d)}
          >
            {demo ? 'Stop' : 'Demo'}
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={close}
          >
            Close
          </button>
          <div
            className="px-4 py-2 bg-gray-700 rounded ml-auto"
            aria-live="polite" aria-atomic="true"
          >
            Score: <span className={scorePop ? 'score-pop' : ''}>{score}</span>
          </div>
          <div className="px-4 py-2 bg-gray-700 rounded" data-testid="combo-meter">
            Combo: {combo}
          </div>
          <div className="px-4 py-2 bg-gray-700 rounded" data-testid="hint-display">
            Hint: {hint ? hint.replace('Arrow', '') : ''}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2" data-combo={combo} style={{ filter: combo ? `hue-rotate(${combo * 45}deg)` : undefined }}>
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const key = `${rIdx}-${cIdx}`;
              const colors = colorBlind ? colorBlindColors : tileColors;
              return (
                <div
                  key={key}
                  className={`relative overflow-hidden h-16 w-16 flex items-center justify-center text-2xl font-bold rounded ${
                    cell ? colors[cell] || 'bg-gray-700' : 'bg-gray-800'
                  } ${animCells.has(key) ? 'tile-pop' : ''}`}
                >
                  {cell !== 0 ? cell : ''}
                  {mergeCells.has(key) && <span className="merge-ripple" />}
                </div>
              );
            })
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

