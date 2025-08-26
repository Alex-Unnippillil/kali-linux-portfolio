import React, { useEffect, useState, useCallback } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import GameLayout from './GameLayout';
import useGameControls from './useGameControls';

const SIZE = 4;
const TILE_PX = 64; // tailwind h-16 w-16 => 4rem => 64px
const GAP_PX = 8; // gap-2 => 0.5rem => 8px
const BOARD_PX = SIZE * TILE_PX + (SIZE - 1) * GAP_PX;

let nextId = 1;
const createTile = (value) => ({ id: nextId++, value });
const cloneBoard = (b) => b.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

const initBoard = (hard = false) => {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
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
        if (!cell) empty.push([r, c]);
      }),
    );
    if (empty.length === 0) return added;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const tile = createTile(hard ? 4 : Math.random() < 0.9 ? 2 : 4);
    board[r][c] = tile;
    added.push(tile.id);
  }
  return added;
};

const slideRow = (row) => {
  const arr = row.filter((t) => t !== null);
  let gained = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] && arr[i + 1] && arr[i].value === arr[i + 1].value) {
      arr[i] = { ...arr[i], value: arr[i].value * 2 };
      gained += arr[i].value;
      arr[i + 1] = null;
    }
  }
  const newRow = arr.filter((t) => t !== null);
  while (newRow.length < SIZE) newRow.push(null);
  return { row: newRow, score: gained };
};

const transpose = (board) =>
  board[0].map((_, c) => board.map((row) => row[c]));

const flip = (board) => board.map((row) => [...row].reverse());

const moveLeft = (board) => {
  let gained = 0;
  const newBoard = board.map((row) => {
    const { row: r, score } = slideRow(row);
    gained += score;
    return r;
  });
  return { board: newBoard, score: gained };
};

const moveRight = (board) => {
  const flipped = flip(board);
  const { board: moved, score } = moveLeft(flipped);
  return { board: flip(moved), score };
};

const moveUp = (board) => {
  const transposed = transpose(board);
  const { board: moved, score } = moveLeft(transposed);
  return { board: transpose(moved), score };
};

const moveDown = (board) => {
  const transposed = transpose(board);
  const { board: moved, score } = moveRight(transposed);
  return { board: transpose(moved), score };
};

const boardsEqual = (a, b) =>
  a.every((row, r) => row.every((cell, c) => (cell ? cell.value : 0) === (b[r][c] ? b[r][c].value : 0)));

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

const validateBoard = (b) =>
  Array.isArray(b) &&
  b.length === SIZE &&
  b.every((row) =>
    Array.isArray(row) &&
    row.length === SIZE &&
    row.every(
      (cell) =>
        cell === null ||
        (typeof cell === 'object' && typeof cell.id === 'number' && typeof cell.value === 'number'),
    ),
  );

const Game2048 = () => {
  const [board, setBoard] = usePersistentState('2048-board', initBoard, validateBoard);
  const [won, setWon] = usePersistentState('2048-won', false, (v) => typeof v === 'boolean');
  const [lost, setLost] = usePersistentState('2048-lost', false, (v) => typeof v === 'boolean');
  const [hardMode, setHardMode] = usePersistentState('2048-hard', false, (v) => typeof v === 'boolean');
  const [prevState, setPrevState] = useState(null); // { board, score }
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = usePersistentState('2048-best', 0, (v) => typeof v === 'number');
  const [animTiles, setAnimTiles] = useState(new Set());

  // ensure id counter greater than existing ids
  useEffect(() => {
    const maxId = Math.max(
      0,
      ...board.flat().map((cell) => (cell ? cell.id : 0)),
    );
    nextId = maxId + 1;
  }, []);

  useEffect(() => {
    if (animTiles.size > 0) {
      const t = setTimeout(() => setAnimTiles(new Set()), 200);
      return () => clearTimeout(t);
    }
  }, [animTiles]);

  const move = useCallback(
    (dir) => {
      if (won || lost) return;
      let result;
      if (dir.x === -1) result = moveLeft(board);
      else if (dir.x === 1) result = moveRight(board);
      else if (dir.y === -1) result = moveUp(board);
      else if (dir.y === 1) result = moveDown(board);
      else return;
      if (!boardsEqual(board, result.board)) {
        setPrevState({ board: cloneBoard(board), score });
        const addedIds = addRandomTile(result.board, hardMode, hardMode ? 2 : 1);
        setBoard(cloneBoard(result.board));
        const newScore = score + result.score;
        setScore(newScore);
        if (newScore > bestScore) setBestScore(newScore);
        setAnimTiles(new Set(addedIds));
        if (checkWin(result.board)) setWon(true);
        else if (!hasMoves(result.board)) setLost(true);
      }
    },
    [board, won, lost, hardMode, score, bestScore, setBoard, setBestScore, setLost, setWon],
  );

  useGameControls(move);

  // handle escape for closing
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
    const b = initBoard(hardMode);
    setBoard(b);
    setScore(0);
    setPrevState(null);
    setWon(false);
    setLost(false);
    setAnimTiles(new Set());
  };

  const undo = () => {
    if (prevState) {
      setBoard(cloneBoard(prevState.board));
      setScore(prevState.score);
      setWon(checkWin(prevState.board));
      setLost(!hasMoves(prevState.board));
      setPrevState(null);
      setAnimTiles(new Set());
    }
  };

  const close = () => {
    document.getElementById('close-2048')?.click();
  };

  return (
    <GameLayout
      title="2048"
      instructions="Use arrow keys or swipe to move tiles. Reach 2048 to win."
      controls={
        <>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={reset}
          >
            Reset
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
            onClick={undo}
            disabled={!prevState}
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
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={close}
          >
            Close
          </button>
        </>
      }
    >
      <>
        <div className="flex justify-between mb-2 w-[280px] mx-auto">
          <div>Score: {score}</div>
          <div>Best: {bestScore}</div>
        </div>
        <div
          className="relative mx-auto"
          style={{ width: BOARD_PX, height: BOARD_PX }}
        >
          {/* background cells */}
          {Array.from({ length: SIZE }).map((_, r) =>
            Array.from({ length: SIZE }).map((_, c) => (
              <div
                key={`bg-${r}-${c}`}
                className="absolute bg-gray-800 rounded"
                style={{
                  width: TILE_PX,
                  height: TILE_PX,
                  top: r * (TILE_PX + GAP_PX),
                  left: c * (TILE_PX + GAP_PX),
                }}
              />
            )),
          )}
          {/* tiles */}
          {board.map((row, r) =>
            row.map((cell, c) =>
              cell && (
                <div
                  key={cell.id}
                  className={`tile absolute flex items-center justify-center text-2xl font-bold rounded ${
                    tileColors[cell.value] || 'bg-gray-700'
                  } ${animTiles.has(cell.id) ? 'tile-pop' : ''}`}
                  style={{
                    width: TILE_PX,
                    height: TILE_PX,
                    top: r * (TILE_PX + GAP_PX),
                    left: c * (TILE_PX + GAP_PX),
                  }}
                >
                  {cell.value}
                </div>
              ),
            ),
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
