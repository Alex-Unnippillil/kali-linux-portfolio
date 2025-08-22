import React, { useState, useEffect, useRef, useCallback } from 'react';

const SIZE = 4;
let nextId = 0;

const createRNG = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const stringToSeed = (str) => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
};

const getDailySeed = () => stringToSeed(new Date().toISOString().slice(0, 10));

const cloneBoard = (board) =>
  board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

const emptyBoard = () =>
  Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

const addRandomTile = (board, rng) => {
  const empty = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (!cell) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(rng() * empty.length)];
  const value = rng() < 0.9 ? 2 : 4;
  board[r][c] = { id: nextId++, value, row: r, col: c };
  return board;
};

const initBoard = (rng) => {
  const board = emptyBoard();
  addRandomTile(board, rng);
  addRandomTile(board, rng);
  return board;
};

const slideRow = (row) => {
  const arr = row.filter((cell) => cell);
  let moved = false;
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i].value === arr[i + 1].value && !arr[i].merged && !arr[i + 1].merged) {
      arr[i] = {
        id: nextId++,
        value: arr[i].value * 2,
        row: arr[i].row,
        col: arr[i].col,
        merged: true,
      };
      arr.splice(i + 1, 1);
      moved = true;
    }
  }
  while (arr.length < SIZE) arr.push(null);
  arr.forEach((cell, idx) => {
    if (cell && cell.col !== idx) moved = true;
    if (cell) cell.col = idx;
  });
  return { newRow: arr, moved };
};

const moveLeft = (board) => {
  let moved = false;
  const newBoard = board.map((row, r) => {
    const { newRow, moved: m } = slideRow(row.map((cell) => (cell ? { ...cell, merged: false } : null)));
    newRow.forEach((cell) => {
      if (cell) cell.row = r;
    });
    if (m) moved = true;
    return newRow;
  });
  return { board: newBoard, moved };
};

const flip = (board) => board.map((row) => [...row].reverse());
const transpose = (board) => board[0].map((_, c) => board.map((row) => row[c]));

const moveRight = (board) => {
  const flipped = flip(board);
  const { board: movedBoard, moved } = moveLeft(flipped);
  return { board: flip(movedBoard), moved };
};

const moveUp = (board) => {
  const transposed = transpose(board);
  const { board: movedBoard, moved } = moveLeft(transposed);
  return { board: transpose(movedBoard), moved };
};

const moveDown = (board) => {
  const transposed = transpose(board);
  const { board: movedBoard, moved } = moveRight(transposed);
  return { board: transpose(movedBoard), moved };
};

const boardsEqual = (a, b) =>
  a.every((row, r) => row.every((cell, c) => {
    const other = b[r][c];
    if (!cell && !other) return true;
    if (!cell || !other) return false;
    return cell.id === other.id && cell.value === other.value;
  }));

const checkWin = (board) => board.some((row) => row.some((cell) => cell && cell.value === 2048));

const hasMoves = (board) => {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = board[r][c];
      if (!cell) return true;
      if (c < SIZE - 1 && board[r][c + 1] && board[r][c + 1].value === cell.value) return true;
      if (r < SIZE - 1 && board[r + 1][c] && board[r + 1][c].value === cell.value) return true;
    }
  }
  return false;
};

const boardToValues = (board) => board.map((row) => row.map((cell) => (cell ? cell.value : 0)));

const Game2048 = () => {
  const [seed, setSeed] = useState(() => getDailySeed());
  const rngRef = useRef(createRNG(seed));
  const [board, setBoard] = useState(() => initBoard(rngRef.current));
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState([]);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [ghost, setGhost] = useState(false);
  const workerRef = useRef(null);
  const touchRef = useRef({});

  useEffect(() => {
    const saved = localStorage.getItem('game2048');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data && data.board) {
          setBoard(data.board);
          setScore(data.score || 0);
          setSeed(data.seed || seed);
          rngRef.current = createRNG(data.seed || seed);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('game2048', JSON.stringify({ board, score, seed }));
  }, [board, score, seed]);

  const doMove = useCallback(
    (dir) => {
      if (won || lost) return;
      let result;
      if (dir === 'left') result = moveLeft(board);
      else if (dir === 'right') result = moveRight(board);
      else if (dir === 'up') result = moveUp(board);
      else if (dir === 'down') result = moveDown(board);
      if (!result || !result.moved) return;
      const newBoard = addRandomTile(result.board, rngRef.current);
      setHistory((h) => [...h, { board: cloneBoard(board), score }]);
      setBoard(newBoard);
      const newScore = newBoard.flat().reduce((acc, cell) => acc + (cell ? cell.value : 0), 0);
      setScore(newScore);
      if (checkWin(newBoard)) setWon(true);
      else if (!hasMoves(newBoard)) setLost(true);
    },
    [board, score, won, lost]
  );

  const handleKey = useCallback(
    (e) => {
      if (e.key === 'ArrowLeft') doMove('left');
      else if (e.key === 'ArrowRight') doMove('right');
      else if (e.key === 'ArrowUp') doMove('up');
      else if (e.key === 'ArrowDown') doMove('down');
    },
    [doMove]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };

  const onTouchEnd = (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.time;
    const vx = dx / dt;
    const vy = dy / dt;
    const threshold = 0.3;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const v = Math.max(Math.abs(vx), Math.abs(vy));
    if (v < threshold || Math.max(adx, ady) < 20) return;
    if (adx > ady) doMove(dx > 0 ? 'right' : 'left');
    else doMove(dy > 0 ? 'down' : 'up');
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setBoard(last.board);
      setScore(last.score);
      setWon(false);
      setLost(false);
      return h.slice(0, -1);
    });
  };

  const restart = (useDaily) => {
    const newSeed = useDaily ? getDailySeed() : Date.now();
    setSeed(newSeed);
    rngRef.current = createRNG(newSeed);
    setBoard(initBoard(rngRef.current));
    setScore(0);
    setHistory([]);
    setWon(false);
    setLost(false);
  };

  // AI worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./2048.worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      if (ghost) doMove(e.data);
    };
    return () => workerRef.current.terminate();
  }, [ghost, doMove]);

  useEffect(() => {
    if (ghost && !won && !lost) {
      workerRef.current.postMessage({ board: boardToValues(board) });
    }
  }, [board, ghost, won, lost]);

  const tiles = board.flat().filter(Boolean);

  const submitScore = async (name) => {
    if (!name) return;
    await fetch('/api/2048-leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score }),
    });
  };

  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative" style={{ width: 256, height: 256 }}>
        <div className="grid grid-cols-4 gap-2 absolute inset-0">
          {Array.from({ length: SIZE * SIZE }).map((_, idx) => (
            <div
              key={idx}
              className="h-16 w-16 bg-gray-700 rounded"
            />
          ))}
        </div>
        {tiles.map((tile) => (
          <div
            key={tile.id}
            className="h-16 w-16 bg-gray-500 rounded flex items-center justify-center text-2xl font-bold absolute transition-transform duration-150"
            style={{
              transform: `translate(${tile.col * 66}px, ${tile.row * 66}px)`,
            }}
          >
            {tile.value}
          </div>
        ))}
      </div>
      <div className="mt-2">Score: {score}</div>
      {(won || lost) && (
        <div className="mt-2 text-xl">{won ? 'You win!' : 'Game over'}</div>
      )}
      <div className="mt-2 flex gap-2">
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={undo}>
          Undo
        </button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => restart(false)}>
          Restart
        </button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => restart(true)}>
          Daily
        </button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => setGhost((g) => !g)}>
          {ghost ? 'Stop' : 'Ghost'}
        </button>
      </div>
      {lost && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = e.target.elements.name.value;
            submitScore(name);
          }}
        >
          <input name="name" className="text-black px-1" placeholder="Name" />
          <button className="px-2 py-1 bg-gray-700 rounded" type="submit">
            Submit
          </button>
        </form>
      )}
    </div>
  );
};

export default Game2048;
