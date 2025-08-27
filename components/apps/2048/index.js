import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameLayout from '../GameLayout';
import usePersistentState from '../../hooks/usePersistentState';

const SIZE = 4;

const cloneBoard = (b) => b.map((row) => [...row]);

const initBoard = () => {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  addRandomTile(board);
  addRandomTile(board);
  return board;
};

const addRandomTile = (board) => {
  const empty = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
  return board;
};

const slide = (row) => {
  const arr = row.filter((n) => n !== 0);
  let score = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      score += arr[i];
      arr[i + 1] = 0;
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < SIZE) newRow.push(0);
  return { row: newRow, score };
};

const transpose = (board) => board[0].map((_, c) => board.map((row) => row[c]));
const flip = (board) => board.map((row) => [...row].reverse());

const moveLeft = (board) => {
  let score = 0;
  const newBoard = board.map((row) => {
    const { row: newRow, score: s } = slide(row);
    score += s;
    return newRow;
  });
  return { board: newBoard, score };
};

const moveRight = (board) => {
  const { board: b, score } = moveLeft(flip(board));
  return { board: flip(b), score };
};

const moveUp = (board) => {
  const { board: b, score } = moveLeft(transpose(board));
  return { board: transpose(b), score };
};

const moveDown = (board) => {
  const { board: b, score } = moveRight(transpose(board));
  return { board: transpose(b), score };
};

const boardsEqual = (a, b) =>
  a.every((row, r) => row.every((cell, c) => cell === b[r][c]));

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

const Game2048 = () => {
  const [board, setBoard] = useState(initBoard);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = usePersistentState('2048-highscore', 0, (v) => typeof v === 'number');
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const requestRef = useRef();
  const pausedRef = useRef(false);

  const playSound = useCallback(() => {
    if (!soundOn) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 200;
    osc.connect(ctx.destination);
    osc.start();
    setTimeout(() => osc.stop(), 100);
  }, [soundOn]);

  const loop = useCallback(() => {
    if (!pausedRef.current) {
      // Game could handle animations here
    }
    requestRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handleMove = useCallback(
    (dir) => {
      if (paused) return;
      let result;
      if (dir === 'left') result = moveLeft(board);
      else if (dir === 'right') result = moveRight(board);
      else if (dir === 'up') result = moveUp(board);
      else if (dir === 'down') result = moveDown(board);
      if (!result) return;
      const { board: moved, score: gained } = result;
      if (!boardsEqual(board, moved)) {
        addRandomTile(moved);
        setBoard(cloneBoard(moved));
        if (gained > 0) playSound();
        const newScore = score + gained;
        setScore(newScore);
        setHighScore((h) => Math.max(h, newScore));
      }
    },
    [board, score, paused, playSound, setHighScore]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') handleMove('left');
      else if (e.key === 'ArrowRight') handleMove('right');
      else if (e.key === 'ArrowUp') handleMove('up');
      else if (e.key === 'ArrowDown') handleMove('down');
      else if (e.key === 'Escape') document.getElementById('close-2048')?.click();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleMove]);

  const reset = () => {
    setBoard(initBoard());
    setScore(0);
  };

  const tileColors = {
    0: 'bg-gray-700',
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

  return (
    <GameLayout
      title="2048"
      instructions="Use arrow keys to move tiles."
      controls={
        <>
          <button className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded" onClick={reset}>Reset</button>
          <button
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => setSoundOn((s) => !s)}
          >
            Sound: {soundOn ? 'On' : 'Off'}
          </button>
          <div className="px-2">Score: {score}</div>
          <div className="px-2">High: {highScore}</div>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-1 bg-gray-600 p-1 rounded">
        {board.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-12 h-12 flex items-center justify-center font-bold ${
                tileColors[cell] || 'bg-gray-800 text-white'
              }`}
            >
              {cell !== 0 ? cell : ''}
            </div>
          ))
        )}
      </div>
    </GameLayout>
  );
};

export default Game2048;
