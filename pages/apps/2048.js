 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactGA from 'react-ga4';

const SIZE = 4;

// simple seeded PRNG
const mulberry32 = (seed) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const todaySeed = () => {
  const d = new Date();
  return parseInt(`${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`, 10);
};

const slideRow = (row) => {
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

const transpose = (board) => board[0].map((_, c) => board.map((row) => row[c]));
const flip = (board) => board.map((row) => [...row].reverse());

const moveLeft = (board) => board.map((row) => slideRow(row));
const moveRight = (board) => flip(moveLeft(flip(board)));
const moveUp = (board) => transpose(moveLeft(transpose(board)));
const moveDown = (board) => transpose(moveRight(transpose(board)));

const boardsEqual = (a, b) =>
  a.every((row, r) => row.every((cell, c) => cell === b[r][c]));

const hasMoves = (board) => {
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === 0) return true;
      if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
};

const checkHighest = (board) => {
  let m = 0;
  board.forEach((row) => row.forEach((v) => { if (v > m) m = v; }));
  return m;
};

const addRandomTile = (b, rand) => {
  const empty = [];
  b.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(rand() * empty.length)];
  b[r][c] = rand() < 0.9 ? 2 : 4;
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

const DB_NAME = '2048';
const STORE_NAME = 'replays';

const saveReplay = (replay) => {
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
  const rngRef = useRef(mulberry32(0));
  const seedRef = useRef(0);
  const [board, setBoard] = useState(
    Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
  );
  const [hard, setHard] = useState(false);
  const [timer, setTimer] = useState(3);
  const timerRef = useRef(null);
  const [moves, setMoves] = useState([]);
  const [highest, setHighest] = useState(0);
  const [boardType, setBoardType] = useState('classic');
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const seed = todaySeed();
    const rand = mulberry32(seed);
    const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    addRandomTile(b, rand);
    addRandomTile(b, rand);
    setBoard(b);
    rngRef.current = rand;
    seedRef.current = seed;
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
    (dir) => {
      if (won || lost) return;
      let moved;
      if (dir === 'ArrowLeft') moved = moveLeft(board);
      if (dir === 'ArrowRight') moved = moveRight(board);
      if (dir === 'ArrowUp') moved = moveUp(board);
      if (dir === 'ArrowDown') moved = moveDown(board);
      if (!moved || boardsEqual(board, moved)) return;
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

  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        handleMove(e.key );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleMove]);

  const reset = () => {
    const rand = mulberry32(seedRef.current);
    rngRef.current = rand;
    const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    addRandomTile(b, rand);
    addRandomTile(b, rand);
    setBoard(b);
    setMoves([]);
    setWon(false);
    setLost(false);
    setHighest(0);
    resetTimer();
  };

  const close = () => {
    if (typeof document !== 'undefined') {
      _optionalChain([document, 'access', _2 => _2.getElementById, 'call', _3 => _3('close-2048'), 'optionalAccess', _4 => _4.click, 'call', _5 => _5()]);
    }
  };

  const displayCell = (v) => {
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
    React.createElement('div', { className: "h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4"       ,}
      , React.createElement('div', { className: "flex space-x-2" ,}
        , React.createElement('button', { className: "px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"    , onClick: reset,}, "Reset"

        )
        , React.createElement('label', { className: "flex items-center space-x-1 px-2"   ,}
          , React.createElement('input', { type: "checkbox", checked: hard, onChange: (e) => setHard(e.target.checked),} )
          , React.createElement('span', null, "Hard")
        )
        , React.createElement('select', {
          className: "text-black px-1 rounded"  ,
          value: boardType,
          onChange: (e) => setBoardType(e.target.value ),}

          , React.createElement('option', { value: "classic",}, "Classic")
          , React.createElement('option', { value: "hex",}, "Hex 2048" )
        )
        , React.createElement('button', { className: "px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"    , onClick: close,}, "Close"

        )
        , hard && React.createElement('div', { className: "ml-2",}, timer)
      )
      , React.createElement('div', { className: "grid grid-cols-4 gap-2"  ,}
        , board.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            React.createElement('div', {
              key: `${rIdx}-${cIdx}`,
              className: `h-16 w-16 flex items-center justify-center text-2xl font-bold rounded ${
                cell ? tileColors[cell] || 'bg-gray-700' : 'bg-gray-800'
              }`,}

              , displayCell(cell)
            )
          ))
        )
      )
      , (won || lost) && (
        React.createElement('div', { className: "mt-4 text-xl" ,}, won ? 'You win!' : 'Game over')
      )
    )
  );
};

export default Page2048;

