import React, { useEffect, useState, useRef } from 'react';
import GameLayout from './GameLayout';

const DIFFICULTIES = {
  beginner: { size: 8, mines: 10 },
  intermediate: { size: 16, mines: 40 },
  expert: { size: 24, mines: 99 },
};

// simple seeded pseudo random generator
const mulberry32 = (a) => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const cloneBoard = (board) =>
  board.map((row) => row.map((cell) => ({ ...cell })));

const generateBoard = (seed, sx, sy, size, minesCount) => {
  const board = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    })),
  );

  const rng = mulberry32(seed);
  const indices = Array.from({ length: size * size }, (_, i) => i);

  // Fisher-Yates shuffle using seeded rng
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const safe = new Set();
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const nx = sx + dx;
      const ny = sy + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        safe.add(nx * size + ny);
      }
    }
  }

  let placed = 0;
  for (const idx of indices) {
    if (placed >= minesCount) break;
    if (safe.has(idx)) continue;
    const x = Math.floor(idx / size);
    const y = idx % size;
    board[x][y].mine = true;
    placed++;
  }

  const dirs = [-1, 0, 1];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (board[x][y].mine) continue;
      let count = 0;
      dirs.forEach((dx) =>
        dirs.forEach((dy) => {
          if (dx === 0 && dy === 0) return;
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < size &&
            ny >= 0 &&
            ny < size &&
            board[nx][ny].mine
          ) {
            count++;
          }
        }),
      );
      board[x][y].adjacent = count;
    }
  }
  return board;
};

const revealCell = (board, x, y) => {
  const size = board.length;
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
        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
          revealCell(board, nx, ny);
        }
      }
    }
  }
  return false;
};

const calculateBV = (board) => {
  const size = board.length;
  const visited = board.map((row) => row.map(() => false));
  let bv = 0;
  const dirs = [-1, 0, 1];
  const inBounds = (x, y) => x >= 0 && x < size && y >= 0 && y < size;

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (board[x][y].mine || visited[x][y] || board[x][y].adjacent !== 0)
        continue;
      bv++;
      const queue = [[x, y]];
      visited[x][y] = true;
      while (queue.length) {
        const [cx, cy] = queue.shift();
        dirs.forEach((dx) =>
          dirs.forEach((dy) => {
            if (dx === 0 && dy === 0) return;
            const nx = cx + dx;
            const ny = cy + dy;
            if (
              inBounds(nx, ny) &&
              !visited[nx][ny] &&
              !board[nx][ny].mine
            ) {
              visited[nx][ny] = true;
              if (board[nx][ny].adjacent === 0) {
                queue.push([nx, ny]);
              }
            }
          }),
        );
      }
    }
  }

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (!board[x][y].mine && !visited[x][y]) bv++;
    }
  }
  return bv;
};

const checkWin = (board) =>
  board.flat().every((cell) => cell.revealed || cell.mine);

const Minesweeper = () => {
  const [board, setBoard] = useState(null);
  const [status, setStatus] = useState('ready');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [shareCode, setShareCode] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [bv, setBV] = useState(0);
  const [codeInput, setCodeInput] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [bestTimes, setBestTimes] = useState({
    beginner: null,
    intermediate: null,
    expert: null,
  });
  const touchTimer = useRef(null);
  const longPress = useRef(false);

  const { size: BOARD_SIZE, mines: MINES_COUNT } = DIFFICULTIES[difficulty];
  const bestTime = bestTimes[difficulty];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('minesweeper-best-times');
      if (stored) setBestTimes(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (status === 'playing') {
      const interval = setInterval(() => {
        setElapsed((Date.now() - startTime) / 1000);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status, startTime]);

  const startGame = (x, y) => {
    const newBoard = generateBoard(seed, x, y, BOARD_SIZE, MINES_COUNT);
    revealCell(newBoard, x, y);
    setBoard(newBoard);
    setStatus('playing');
    setStartTime(Date.now());
    setShareCode(`${seed.toString(36)}-${x}-${y}`);
    setBV(calculateBV(newBoard));
  };

  const handleClick = (x, y) => {
    if (status === 'lost' || status === 'won') return;
    if (!board) {
      startGame(x, y);
      return;
    }

    const newBoard = cloneBoard(board);
    const cell = newBoard[x][y];

    if (cell.revealed) {
      if (cell.adjacent > 0) {
        let flagged = 0;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (
              nx >= 0 &&
              nx < BOARD_SIZE &&
              ny >= 0 &&
              ny < BOARD_SIZE &&
              newBoard[nx][ny].flagged
            ) {
              flagged++;
            }
          }
        }
        if (flagged === cell.adjacent) {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (
                nx >= 0 &&
                nx < BOARD_SIZE &&
                ny >= 0 &&
                ny < BOARD_SIZE &&
                !newBoard[nx][ny].flagged
              ) {
                const hit = revealCell(newBoard, nx, ny);
                if (hit) {
                  setBoard(newBoard);
                  setStatus('lost');
                  return;
                }
              }
            }
          }
        }
      }
    } else {
      const hitMine = revealCell(newBoard, x, y);
      if (hitMine) {
        setBoard(newBoard);
        setStatus('lost');
        return;
      }
    }

    setBoard(newBoard);
    if (checkWin(newBoard)) {
      setStatus('won');
      const time = (Date.now() - startTime) / 1000;
      setElapsed(time);
      if (typeof window !== 'undefined') {
        if (!bestTime || time < bestTime) {
          const newTimes = { ...bestTimes, [difficulty]: time };
          setBestTimes(newTimes);
          localStorage.setItem('minesweeper-best-times', JSON.stringify(newTimes));
        }
      }
    }
  };

  const handleRightClick = (e, x, y) => {
    e.preventDefault();
    if (status !== 'playing' || !board) return;
    const newBoard = cloneBoard(board);
    const cell = newBoard[x][y];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    setBoard(newBoard);
  };

  const handleTouchStart = (x, y) => {
    longPress.current = false;
    touchTimer.current = setTimeout(() => {
      handleRightClick({ preventDefault: () => {} }, x, y);
      longPress.current = true;
    }, 500);
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  };

  const reset = () => {
    setBoard(null);
    setStatus('ready');
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setShareCode('');
    setStartTime(null);
    setElapsed(0);
    setBV(0);
    setCodeInput('');
  };

  const copyCode = () => {
    if (typeof navigator !== 'undefined' && shareCode) {
      navigator.clipboard.writeText(shareCode);
    }
  };

  const loadFromCode = () => {
    if (!codeInput) return;
    const parts = codeInput.trim().split('-');
    const newSeed = parseInt(parts[0], 36);
    if (Number.isNaN(newSeed)) return;
    setSeed(newSeed);
    setShareCode('');
    setBoard(null);
    setStatus('ready');
    setStartTime(null);
    setElapsed(0);
    setBV(0);
    if (parts.length === 3) {
      const x = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        const newBoard = generateBoard(newSeed, x, y, BOARD_SIZE, MINES_COUNT);
        revealCell(newBoard, x, y);
        setBoard(newBoard);
        setStatus('playing');
        setStartTime(Date.now());
        setShareCode(codeInput.trim());
        setBV(calculateBV(newBoard));
      }
    }
    setCodeInput('');
  };

  const minesLeft = board
    ? MINES_COUNT - board.flat().filter((c) => c.flagged).length
    : MINES_COUNT;

  const changeDifficulty = (e) => {
    setDifficulty(e.target.value);
    reset();
  };

  return (
    <GameLayout minesLeft={minesLeft} time={elapsed}>
      <div className="mb-2">
        <select
          className="text-black px-1"
          value={difficulty}
          onChange={changeDifficulty}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="expert">Expert</option>
        </select>
      </div>
      <div className="mb-2 flex items-center space-x-2">
        <span>Seed:</span>
        <span className="font-mono">{seed.toString(36)}</span>
        {shareCode && (
          <button
            onClick={copyCode}
            className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Copy Code
          </button>
        )}
      </div>
      <div className="mb-2 flex items-center space-x-2">
        <input
          className="px-1 text-black"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          placeholder="seed or share code"
        />
        <button
          onClick={loadFromCode}
          className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Load
        </button>
      </div>
      <div className="mb-2">
        3BV: {bv} | Best: {bestTime ? bestTime.toFixed(2) : '--'}s
        {status === 'won' ? ` | Time: ${elapsed.toFixed(2)}s` : ''}
      </div>
      <div
        className="grid gap-1"
        style={{ width: 'fit-content', gridTemplateColumns: `repeat(${BOARD_SIZE}, 2rem)` }}
      >
        {Array.from({ length: BOARD_SIZE }).map((_, x) =>
          Array.from({ length: BOARD_SIZE }).map((_, y) => {
            const cell = board
              ? board[x][y]
              : { revealed: false, flagged: false, adjacent: 0, mine: false };
            let display = '';
            if (cell.revealed) {
              display = cell.mine ? '💣' : cell.adjacent || '';
            } else if (cell.flagged) {
              display = '🚩';
            }
            return (
              <button
                key={`${x}-${y}`}
                onClick={(e) => {
                  if (longPress.current) {
                    longPress.current = false;
                    return;
                  }
                  handleClick(x, y);
                }}
                onContextMenu={(e) => handleRightClick(e, x, y)}
                onTouchStart={() => handleTouchStart(x, y)}
                onTouchEnd={() => handleTouchEnd()}
                className={`h-8 w-8 flex items-center justify-center text-sm font-bold ${
                  cell.revealed ? 'bg-gray-400' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {display}
              </button>
            );
          }),
        )}
      </div>
      <div className="mt-4 mb-2">
        {status === 'ready'
          ? 'Click any cell to start'
          : status === 'playing'
          ? 'Game in progress'
          : status === 'won'
          ? 'You win!'
          : 'Boom! Game over'}
      </div>
      <button
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={reset}
      >
        Reset
      </button>
    </GameLayout>
  );
};

export default Minesweeper;
