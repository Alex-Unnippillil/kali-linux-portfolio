import { useEffect, useCallback, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import GameLayout from './GameLayout';
import useGameControls from './useGameControls';
// Expectimax AI logic implemented within this file

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

const addRandomTile = (board, hard) => {
  const added = [];
  const empty = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    }),
  );
  if (empty.length === 0) return added;
  const [r, c] = empty[Math.floor(rng() * empty.length)];
  const prob = hard ? 0.6 : 0.9; // more 4s in hard mode
  board[r][c] = rng() < prob ? 2 : 4;
  added.push(`${r}-${c}`);
  return added;
};

const slide = (row) => {
  const arr = row.filter((n) => n !== 0);
  const newRow = [];
  let score = 0;
  const mergedPositions = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === arr[i + 1]) {
      const val = arr[i] * 2;
      newRow.push(val);
      score += val;
      mergedPositions.push(newRow.length - 1);
      i++;
    } else {
      newRow.push(arr[i]);
    }
  }
  while (newRow.length < SIZE) newRow.push(0);
  return { row: newRow, merged: mergedPositions.length > 0, score, mergedPositions };
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

// ---------- Expectimax AI ----------
const getEmpty = (board) => {
  const empty = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    }),
  );
  return empty;
};

const smoothness = (board) => {
  let sum = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (c < SIZE - 1 && board[r][c] && board[r][c + 1])
        sum -= Math.abs(board[r][c] - board[r][c + 1]);
      if (r < SIZE - 1 && board[r][c] && board[r + 1][c])
        sum -= Math.abs(board[r][c] - board[r + 1][c]);
    }
  }
  return sum;
};

const monotonicity = (board) => {
  const totals = [0, 0, 0, 0];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE - 1; c++) {
      const cur = board[r][c];
      const next = board[r][c + 1];
      if (cur > next) totals[0] += cur - next;
      else totals[1] += next - cur;
    }
  }
  for (let c = 0; c < SIZE; c++) {
    for (let r = 0; r < SIZE - 1; r++) {
      const cur = board[r][c];
      const next = board[r + 1][c];
      if (cur > next) totals[2] += cur - next;
      else totals[3] += next - cur;
    }
  }
  return Math.max(totals[0], totals[1]) + Math.max(totals[2], totals[3]);
};

const evaluate = (board) =>
  10 * getEmpty(board).length + monotonicity(board) + smoothness(board);

const movesMap = {
  ArrowLeft: moveLeft,
  ArrowRight: moveRight,
  ArrowUp: moveUp,
  ArrowDown: moveDown,
};

const expectimax = (board, depth, player, hard) => {
  if (depth === 0 || !hasMoves(board)) return evaluate(board);
  if (player) {
    let max = -Infinity;
    Object.values(movesMap).forEach((fn) => {
      const { board: next } = fn(board);
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

const findBestMove = (board, depth = 3, hard = false) => {
  let best = null;
  let bestScore = -Infinity;
  Object.entries(movesMap).forEach(([dir, fn]) => {
    const { board: next } = fn(board);
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
  const [history, setHistory] = useState([]);
  const [moves, setMoves] = useState(0);
  const [hardMode, setHardMode] = usePersistentState('2048-hard', false, (v) => typeof v === 'boolean');
  const [colorBlind, setColorBlind] = usePersistentState('2048-cb', false, (v) => typeof v === 'boolean');
  const [animCells, setAnimCells] = useState(new Set());
  const [mergeCells, setMergeCells] = useState(new Set());
  const [moveDir, setMoveDir] = useState(null);
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
    if (moveDir) {
      const t = setTimeout(() => setMoveDir(null), 200);
      return () => clearTimeout(t);
    }
  }, [moveDir]);

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
    setHint(findBestMove(board, 4, hardMode));
  }, [board, hardMode]);

  const handleDirection = useCallback(
    ({ x, y }) => {
      if (won || lost) return;
      let result;
      let dir = null;
      if (x === -1) {
        result = moveLeft(board);
        dir = 'left';
      } else if (x === 1) {
        result = moveRight(board);
        dir = 'right';
      } else if (y === -1) {
        result = moveUp(board);
        dir = 'up';
      } else if (y === 1) {
        result = moveDown(board);
        dir = 'down';
      } else return;
      const { board: moved, merged, score: gained, mergedCells } = result;
      if (!boardsEqual(board, moved)) {
        const added = addRandomTile(moved, hardMode);
        setHistory((h) => [...h, { board: cloneBoard(board), score, moves }]);
        setAnimCells(new Set(added));
        setMergeCells(new Set(mergedCells));
        setMoveDir(dir);
        if (gained > 0) {
          setScore((s) => s + gained);
          setScorePop(true);
        }
        setBoard(cloneBoard(moved));
        setMoves((m) => m + 1);
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
    [board, won, lost, hardMode, score, moves, setBoard, setLost, setWon],
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
      const best = findBestMove(board, 4, hardMode);
      if (!best) {
        setDemo(false);
        return;
      }
      handleDirection(dirMap[best]);
    }, 400);
    return () => clearInterval(id);
  }, [demo, board, handleDirection, hardMode]);

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
    setHistory([]);
    setMoves(0);
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
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setBoard(cloneBoard(prev.board));
      setScore(prev.score);
      setMoves(prev.moves);
      setWon(checkWin(prev.board));
      setLost(!hasMoves(prev.board));
      setAnimCells(new Set());
      setMergeCells(new Set());
      return h.slice(0, -1);
    });
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
            disabled={history.length === 0}
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
          <div className="px-4 py-2 bg-gray-700 rounded">Moves: {moves}</div>
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
                  } ${animCells.has(key) ? 'tile-pop' : ''} ${
                    moveDir ? `tile-move-${moveDir}` : ''
                  }`}
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

