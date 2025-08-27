import React, { useEffect, useState } from 'react';

// Cell type for board state
interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

// Board size presets
const PRESETS = {
  small: { width: 8, height: 8, mines: 10, label: '8x8' },
  medium: { width: 16, height: 16, mines: 40, label: '16x16' },
  large: { width: 30, height: 16, mines: 99, label: '30x16' },
};

// Simple seeded RNG
const mulberry32 = (a: number) => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const cloneBoard = (board: Cell[][]): Cell[][] =>
  board.map((row) => row.map((cell) => ({ ...cell })));

// Generate board ensuring first click (sx,sy) is safe
const generateBoard = (
  seed: number,
  width: number,
  height: number,
  mines: number,
  sx: number,
  sy: number,
): Cell[][] => {
  const board: Cell[][] = Array.from({ length: width }, () =>
    Array.from({ length: height }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    })),
  );
  const rng = mulberry32(seed);
  const total = width * height;
  const indices = Array.from({ length: total }, (_, i) => i);
  // shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  // avoid first click and neighbours
  const safe = new Set<number>();
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const nx = sx + dx;
      const ny = sy + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        safe.add(nx * height + ny);
      }
    }
  }
  let placed = 0;
  for (const idx of indices) {
    if (placed >= mines) break;
    if (safe.has(idx)) continue;
    const x = Math.floor(idx / height);
    const y = idx % height;
    board[x][y].mine = true;
    placed++;
  }
  const dirs = [-1, 0, 1];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (board[x][y].mine) continue;
      let count = 0;
      dirs.forEach((dx) =>
        dirs.forEach((dy) => {
          if (dx === 0 && dy === 0) return;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && board[nx][ny].mine) {
            count++;
          }
        }),
      );
      board[x][y].adjacent = count;
    }
  }
  return board;
};

// Reveal cell and flood fill zeros recursively (no animation)
const revealCellRecursive = (board: Cell[][], x: number, y: number): boolean => {
  const cell = board[x][y];
  if (cell.revealed || cell.flagged) return false;
  cell.revealed = true;
  if (cell.mine) return true;
  if (cell.adjacent === 0) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < board.length && ny >= 0 && ny < board[0].length) {
          revealCellRecursive(board, nx, ny);
        }
      }
    }
  }
  return false;
};

// Get cells to reveal in BFS order for ripple animation
const getRippleOrder = (board: Cell[][], starts: [number, number][]): [number, number][] => {
  const width = board.length;
  const height = board[0].length;
  const visited = Array.from({ length: width }, () => Array(height).fill(false));
  const queue: [number, number][] = [];
  for (const [sx, sy] of starts) {
    if (
      sx >= 0 &&
      sx < width &&
      sy >= 0 &&
      sy < height &&
      !visited[sx][sy] &&
      !board[sx][sy].flagged &&
      !board[sx][sy].mine
    ) {
      queue.push([sx, sy]);
      visited[sx][sy] = true;
    }
  }
  const order: [number, number][] = [];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    const cell = board[x][y];
    if (cell.revealed || cell.flagged) continue;
    order.push([x, y]);
    if (cell.adjacent === 0) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < width &&
            ny >= 0 &&
            ny < height &&
            !visited[nx][ny] &&
            !board[nx][ny].mine &&
            !board[nx][ny].flagged
          ) {
            visited[nx][ny] = true;
            queue.push([nx, ny]);
          }
        }
      }
    }
  }
  return order;
};

// Basic logical solver to ensure board solvable without guessing
const isSolvable = (board: Cell[][]): boolean => {
  const width = board.length;
  const height = board[0].length;
  let changed = true;
  while (changed) {
    changed = false;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const cell = board[x][y];
        if (!cell.revealed || cell.mine || cell.adjacent === 0) continue;
        const neighbors: { cell: Cell; x: number; y: number }[] = [];
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              neighbors.push({ cell: board[nx][ny], x: nx, y: ny });
            }
          }
        }
        const flagged = neighbors.filter((n) => n.cell.flagged).length;
        const hidden = neighbors.filter((n) => !n.cell.revealed && !n.cell.flagged);
        if (!hidden.length) continue;
        if (flagged === cell.adjacent) {
          for (const n of hidden) {
            const hit = revealCellRecursive(board, n.x, n.y);
            if (hit) return false;
            changed = true;
          }
        } else if (flagged + hidden.length === cell.adjacent) {
          for (const n of hidden) {
            n.cell.flagged = true;
            changed = true;
          }
        }
      }
    }
  }
  return board.flat().every((c) => c.revealed || c.mine);
};

// Generate a board that is solvable without guessing and start cell is zero
const generateSolvableBoard = (
  seed: number,
  width: number,
  height: number,
  mines: number,
  sx: number,
  sy: number,
): { board: Cell[][]; seed: number } => {
  let attempt = 0;
  while (attempt < 1000) {
    const currentSeed = seed + attempt;
    const board = generateBoard(currentSeed, width, height, mines, sx, sy);
    const testBoard = cloneBoard(board);
    revealCellRecursive(testBoard, sx, sy);
    if (testBoard[sx][sy].adjacent !== 0) {
      attempt++;
      continue;
    }
    if (isSolvable(testBoard)) {
      return { board, seed: currentSeed };
    }
    attempt++;
  }
  const board = generateBoard(seed, width, height, mines, sx, sy);
  return { board, seed };
};

// React component implementing Minesweeper
const Minesweeper: React.FC = () => {
  const [sizeKey, setSizeKey] = useState<keyof typeof PRESETS>('small');
  const { width, height, mines, label } = PRESETS[sizeKey];
  const [board, setBoard] = useState<Cell[][] | null>(null);
  const [status, setStatus] = useState<'ready' | 'playing' | 'won' | 'lost'>('ready');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [flags, setFlags] = useState(0);

  // Load best time when size changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `minesweeper-best-${width}x${height}-${mines}`;
    const best = window.localStorage.getItem(key);
    setBestTime(best ? parseFloat(best) : null);
    reset();
  }, [sizeKey]);

  // Timer effect
  useEffect(() => {
    if (status !== 'playing' || startTime === null) return;
    const id = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 100);
    return () => clearInterval(id);
  }, [status, startTime]);

  const startGame = (x: number, y: number): Cell[][] => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const { board: newBoard } = generateSolvableBoard(seed, width, height, mines, x, y);
    setBoard(newBoard);
    setStatus('playing');
    setStartTime(Date.now());
    setFlags(0);
    return newBoard;
  };

  const inBounds = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height;

  const handleReveal = (x: number, y: number) => {
    let currentBoard = board;
    let currentStatus = status;
    if (!currentBoard) {
      currentBoard = startGame(x, y);
      currentStatus = 'playing';
    }
    if (!currentBoard || currentStatus !== 'playing') return;
    const newBoard = cloneBoard(currentBoard);
    const cell = newBoard[x][y];
    if (cell.revealed || cell.flagged) return;
    if (cell.mine) {
      for (let i = 0; i < newBoard.length; i++) {
        for (let j = 0; j < newBoard[0].length; j++) {
          if (newBoard[i][j].mine) newBoard[i][j].revealed = true;
        }
      }
      setBoard(newBoard);
      setStatus('lost');
      return;
    }
    const order = getRippleOrder(newBoard, [[x, y]]);
    order.forEach(([cx, cy], idx) => {
      setTimeout(() => {
        newBoard[cx][cy].revealed = true;
        setBoard(cloneBoard(newBoard));
        if (idx === order.length - 1) {
          if (newBoard.flat().every((c) => c.revealed || c.mine)) {
            setStatus('won');
            const time = (Date.now() - (startTime || 0)) / 1000;
            setElapsed(time);
            const key = `minesweeper-best-${width}x${height}-${mines}`;
            if (typeof window !== 'undefined') {
              const best = window.localStorage.getItem(key);
              if (!best || time < parseFloat(best)) {
                window.localStorage.setItem(key, time.toString());
                setBestTime(time);
              }
            }
          }
        }
      }, idx * 30);
    });
  };

  const handleFlag = (x: number, y: number) => {
    if (!board || status !== 'playing') return;
    const newBoard = cloneBoard(board);
    const cell = newBoard[x][y];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    setFlags((f) => f + (cell.flagged ? 1 : -1));
    setBoard(newBoard);
  };

  const handleChord = (x: number, y: number) => {
    if (!board || status !== 'playing') return;
    const cell = board[x][y];
    if (!cell.revealed || cell.adjacent === 0) return;
    let flagged = 0;
    const hidden: [number, number][] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny)) continue;
        const nCell = board[nx][ny];
        if (nCell.flagged) flagged++;
        if (!nCell.revealed && !nCell.flagged) hidden.push([nx, ny]);
      }
    }
    if (flagged !== cell.adjacent) return;
    const newBoard = cloneBoard(board);
    let hitMine = false;
    const starts: [number, number][] = [];
    for (const [nx, ny] of hidden) {
      if (newBoard[nx][ny].mine) {
        hitMine = true;
      } else {
        starts.push([nx, ny]);
      }
    }
    if (hitMine) {
      for (let i = 0; i < newBoard.length; i++) {
        for (let j = 0; j < newBoard[0].length; j++) {
          if (newBoard[i][j].mine) newBoard[i][j].revealed = true;
        }
      }
      setBoard(newBoard);
      setStatus('lost');
      return;
    }
    const order = getRippleOrder(newBoard, starts);
    order.forEach(([cx, cy], idx) => {
      setTimeout(() => {
        newBoard[cx][cy].revealed = true;
        setBoard(cloneBoard(newBoard));
        if (idx === order.length - 1) {
          if (newBoard.flat().every((c) => c.revealed || c.mine)) {
            setStatus('won');
            const time = (Date.now() - (startTime || 0)) / 1000;
            setElapsed(time);
            const key = `minesweeper-best-${width}x${height}-${mines}`;
            if (typeof window !== 'undefined') {
              const best = window.localStorage.getItem(key);
              if (!best || time < parseFloat(best)) {
                window.localStorage.setItem(key, time.toString());
                setBestTime(time);
              }
            }
          }
        }
      }, idx * 30);
    });
  };

  const handlePointerDown = (e: React.PointerEvent, x: number, y: number) => {
    e.preventDefault();
    if (e.buttons === 3) {
      handleChord(x, y);
      return;
    }
    if (e.button === 2) {
      handleFlag(x, y);
    } else if (e.button === 0) {
      handleReveal(x, y);
    }
  };

  const reset = () => {
    setBoard(null);
    setStatus('ready');
    setStartTime(null);
    setElapsed(0);
    setFlags(0);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 select-none">
      <div className="flex space-x-2 mb-2 items-center">
        <label>
          Size:
          <select
            className="ml-2 text-black"
            value={sizeKey}
            onChange={(e) => setSizeKey(e.target.value as keyof typeof PRESETS)}
          >
            {Object.entries(PRESETS).map(([key, val]) => (
              <option key={key} value={key}>{`${val.label}`}</option>
            ))}
          </select>
        </label>
        <div className="ml-4">Mines: {mines - flags}</div>
        <div className="ml-4">
          Best: {bestTime ? bestTime.toFixed(2) : '--'}s{status === 'won' ? ` | Time: ${elapsed.toFixed(2)}s` : ''}
        </div>
      </div>
      <div
        className="grid gap-1 mb-2"
        style={{ gridTemplateColumns: `repeat(${width}, 32px)` }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {Array.from({ length: width }).map((_, x) =>
          Array.from({ length: height }).map((_, y) => {
            const cell = board ? board[x][y] : { revealed: false, flagged: false, adjacent: 0, mine: false };
            let display = '';
            if (cell.revealed) {
              display = cell.mine ? '💣' : cell.adjacent ? String(cell.adjacent) : '';
            } else if (cell.flagged) {
              display = '🚩';
            }
            return (
              <button
                key={`${x}-${y}`}
                className={`h-8 w-8 flex items-center justify-center text-sm font-bold transition-colors ${
                  cell.revealed
                    ? cell.mine
                      ? 'bg-red-500 animate-mine'
                      : 'bg-gray-400'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                onPointerDown={(e) => handlePointerDown(e, x, y)}
              >
                {display}
              </button>
            );
          }),
        )}
      </div>
      <div className="mb-2">
        {status === 'ready'
          ? 'Click any cell to start'
          : status === 'playing'
          ? `Time: ${elapsed.toFixed(2)}s`
          : status === 'won'
          ? 'You win!'
          : 'Boom! Game over'}
      </div>
      <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={reset}>
        Reset
      </button>
    </div>
  );
};

export default Minesweeper;
