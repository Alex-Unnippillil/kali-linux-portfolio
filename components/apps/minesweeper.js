import React, { useEffect, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

const BOARD_SIZE = 8;
const MINES_COUNT = 10;

// simple seeded pseudo random generator
const mulberry32 = (a) => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const cloneBoard = (board) =>
  board.map((row) => row.map((cell) => ({ ...cell })));

const generateBoard = (seed, sx, sy) => {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    })),
  );

  const rng = mulberry32(seed);
  const indices = Array.from(
    { length: BOARD_SIZE * BOARD_SIZE },
    (_, i) => i,
  );

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
      if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
        safe.add(nx * BOARD_SIZE + ny);
      }
    }
  }

  let placed = 0;
  for (const idx of indices) {
    if (placed >= MINES_COUNT) break;
    if (safe.has(idx)) continue;
    const x = Math.floor(idx / BOARD_SIZE);
    const y = idx % BOARD_SIZE;
    board[x][y].mine = true;
    placed++;
  }

  const dirs = [-1, 0, 1];
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (board[x][y].mine) continue;
      let count = 0;
      dirs.forEach((dx) =>
        dirs.forEach((dy) => {
          if (dx === 0 && dy === 0) return;
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < BOARD_SIZE &&
            ny >= 0 &&
            ny < BOARD_SIZE &&
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
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
          revealCell(board, nx, ny);
        }
      }
    }
  }
  return false;
};

const calculateBV = (board) => {
  const visited = board.map((row) => row.map(() => false));
  let bv = 0;
  const dirs = [-1, 0, 1];
  const inBounds = (x, y) =>
    x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;

  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
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

  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
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
  const [seed, setSeed] = useState(() =>
    Math.floor(Math.random() * 2 ** 31),
  );
  const [shareCode, setShareCode] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [bestTime, setBestTime] = usePersistentState(
    'minesweeper-best-time',
    null,
    (v) => v === null || typeof v === 'number',
  );
  const [bv, setBV] = useState(0);
  const [codeInput, setCodeInput] = useState('');
  const [flags, setFlags] = useState(0);

  useEffect(() => {
    if (status === 'playing') {
      const interval = setInterval(() => {
        setElapsed((Date.now() - startTime) / 1000);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status, startTime]);

  const startGame = (x, y) => {
    const newBoard = generateBoard(seed, x, y);
    revealCell(newBoard, x, y);
    setBoard(newBoard);
    setStatus('playing');
    setStartTime(Date.now());
    setShareCode(
      `${seed.toString(36)}-${x.toString(36)}-${y.toString(36)}`,
    );
    setBV(calculateBV(newBoard));
    setFlags(0);
  };

  const handleChord = (x, y) => {
    if (status !== 'playing' || !board) return;
    const newBoard = cloneBoard(board);
    const cell = newBoard[x][y];
    if (!cell.revealed || cell.adjacent === 0) return;
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
    if (flagged !== cell.adjacent) return;
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
    setBoard(newBoard);
    if (checkWin(newBoard)) {
      setStatus('won');
      const time = (Date.now() - startTime) / 1000;
      setElapsed(time);
      if (!bestTime || time < bestTime) {
        setBestTime(time);
      }
    }
  };

  const handlePointerDown = (e, x, y) => {
    if (e.pointerType === 'mouse' && e.buttons === 3) {
      e.preventDefault();
      handleChord(x, y);
    }
  };

  const handleClick = (x, y) => {
    if (status === 'lost' || status === 'won') return;
    if (!board) {
      startGame(x, y);
      return;
    }

    const cell = board[x][y];
    if (cell.revealed) {
      handleChord(x, y);
      return;
    }

    const newBoard = cloneBoard(board);
    const hitMine = revealCell(newBoard, x, y);
    if (hitMine) {
      setBoard(newBoard);
      setStatus('lost');
      return;
    }

    setBoard(newBoard);
    if (checkWin(newBoard)) {
      setStatus('won');
      const time = (Date.now() - startTime) / 1000;
      setElapsed(time);
      if (!bestTime || time < bestTime) {
        setBestTime(time);
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
    setFlags((f) => f + (cell.flagged ? 1 : -1));
    setBoard(newBoard);
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
    setFlags(0);
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
    setFlags(0);
    if (parts.length === 3) {
      const x = parseInt(parts[1], 36);
      const y = parseInt(parts[2], 36);
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        const newBoard = generateBoard(newSeed, x, y);
        revealCell(newBoard, x, y);
        setBoard(newBoard);
        setStatus('playing');
        setStartTime(Date.now());
        setShareCode(
          `${newSeed.toString(36)}-${x.toString(36)}-${y.toString(36)}`,
        );
        setBV(calculateBV(newBoard));
        setFlags(0);
      }
    }
    setCodeInput('');
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
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
      <div className="mb-2">Mines: {MINES_COUNT - flags}</div>
      <div className="mb-2">3BV: {bv} | Best: {bestTime !== null ? bestTime.toFixed(2) : '--'}s{status === 'won' ? ` | Time: ${elapsed.toFixed(2)}s` : ''}</div>
      <div className="grid grid-cols-8 gap-1" style={{ width: 'fit-content' }}>
        {Array.from({ length: BOARD_SIZE }).map((_, x) =>
          Array.from({ length: BOARD_SIZE }).map((_, y) => {
            const cell = board ? board[x][y] : { revealed: false, flagged: false, adjacent: 0, mine: false };
            let display = '';
            if (cell.revealed) {
              display = cell.mine ? '💣' : cell.adjacent || '';
            } else if (cell.flagged) {
              display = '🚩';
            }
            return (
              <button
                key={`${x}-${y}`}
                onClick={() => handleClick(x, y)}
                onContextMenu={(e) => handleRightClick(e, x, y)}
                onPointerDown={(e) => handlePointerDown(e, x, y)}
                className={`h-8 w-8 flex items-center justify-center text-sm font-bold ${cell.revealed ? 'bg-gray-400' : 'bg-gray-700 hover:bg-gray-600'}`}
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
    </div>
  );
};

export default Minesweeper;
