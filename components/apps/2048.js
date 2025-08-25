import React, { useState, useEffect, useCallback } from 'react';
import GameLayout from './GameLayout';

const tileColors: Record<number, string> = {
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

const addRandomTile = (board: number[][], size: number) => {
  const empty: Array<[number, number]> = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return { board, spawn: null as null | [number, number] };
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
  return { board, spawn: [r, c] as [number, number] };
};

const initBoard = (size: number) => {
  const board = Array.from({ length: size }, () => Array(size).fill(0));
  let b = addRandomTile(board, size).board;
  b = addRandomTile(b, size).board;
  return b;
};

const slide = (row: number[], size: number) => {
  const arr = row.filter((n) => n !== 0);
  let score = 0;
  const merges: number[] = [];
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      score += arr[i];
      arr[i + 1] = 0;
      merges.push(i);
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < size) newRow.push(0);
  return { row: newRow, score, merges };
};

const transpose = (board: number[][]) => board[0].map((_, c) => board.map((row) => row[c]));
const flip = (board: number[][]) => board.map((row) => [...row].reverse());

const moveLeft = (board: number[][], size: number) => {
  let score = 0;
  const merges: Array<[number, number]> = [];
  const newBoard = board.map((row, r) => {
    const { row: newRow, score: rowScore, merges: rowMerges } = slide(row, size);
    rowMerges.forEach((c) => merges.push([r, c]));
    score += rowScore;
    return newRow;
  });
  return { board: newBoard, score, merges };
};

const moveRight = (board: number[][], size: number) => {
  const flipped = flip(board);
  const { board: moved, score, merges } = moveLeft(flipped, size);
  return {
    board: flip(moved),
    score,
    merges: merges.map(([r, c]) => [r, size - 1 - c] as [number, number]),
  };
};

const moveUp = (board: number[][], size: number) => {
  const transposed = transpose(board);
  const { board: moved, score, merges } = moveLeft(transposed, size);
  return {
    board: transpose(moved),
    score,
    merges: merges.map(([r, c]) => [c, r] as [number, number]),
  };
};

const moveDown = (board: number[][], size: number) => {
  const transposed = transpose(board);
  const { board: moved, score, merges } = moveRight(transposed, size);
  return {
    board: transpose(moved),
    score,
    merges: merges.map(([r, c]) => [c, size - 1 - r] as [number, number]),
  };
};

const boardsEqual = (a: number[][], b: number[][]) =>
  a.every((row, r) => row.every((cell, c) => cell === b[r][c]));

const checkWin = (board: number[][]) => board.some((row) => row.some((cell) => cell === 2048));

const hasMoves = (board: number[][], size: number) => {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 0) return true;
      if (c < size - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < size - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
};

const Game2048: React.FC = () => {
  const [size, setSize] = useState(4);
  const [board, setBoard] = useState<number[][]>(() => initBoard(4));
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<{ board: number[][]; score: number }[]>([]);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [animCells, setAnimCells] = useState<Record<string, 'spawn' | 'merge'>>({});
  const [highScores, setHighScores] = useState<number[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('2048HighScores') : null;
    if (saved) setHighScores(JSON.parse(saved));
  }, []);

  // Save high score when a game ends
  useEffect(() => {
    if (!(won || lost)) return;
    setHighScores((prev) => {
      const updated = [...prev, score].sort((a, b) => b - a).slice(0, 5);
      if (typeof window !== 'undefined') {
        localStorage.setItem('2048HighScores', JSON.stringify(updated));
      }
      return updated;
    });
  }, [won, lost, score]);

  useEffect(() => {
    if (Object.keys(animCells).length) {
      const t = setTimeout(() => setAnimCells({}), 200);
      return () => clearTimeout(t);
    }
  }, [animCells]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.getElementById('close-2048')?.click();
        return;
      }
      if (won || lost) return;

      let result:
        | { board: number[][]; score: number; merges: Array<[number, number]> }
        | undefined;

      if (e.key === 'ArrowLeft') result = moveLeft(board.map((r) => [...r]), size);
      else if (e.key === 'ArrowRight') result = moveRight(board.map((r) => [...r]), size);
      else if (e.key === 'ArrowUp') result = moveUp(board.map((r) => [...r]), size);
      else if (e.key === 'ArrowDown') result = moveDown(board.map((r) => [...r]), size);
      else return;

      if (!result || boardsEqual(board, result.board)) return;

      const prev = board.map((row) => [...row]);
      setHistory((h) => [...h, { board: prev, score }]);

      const { board: withTile, spawn } = addRandomTile(result.board.map((r) => [...r]), size);
      setBoard(withTile.map((r) => [...r]));
      setScore((s) => s + result.score);

      const anim: Record<string, 'spawn' | 'merge'> = {};
      if (spawn) anim[`${spawn[0]}-${spawn[1]}`] = 'spawn';
      result.merges.forEach(([r, c]) => {
        anim[`${r}-${c}`] = 'merge';
      });
      setAnimCells(anim);

      if (checkWin(withTile)) setWon(true);
      else if (!hasMoves(withTile, size)) setLost(true);
    },
    [board, size, won, lost, score]
  );

  useEffect(() => {
    // Correct setup and cleanup of the event listener
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]); // keep in sync with current handler

  const reset = () => {
    setBoard(initBoard(size));
    setScore(0);
    setHistory([]);
    setWon(false);
    setLost(false);
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const last = h[h.length - 1];
      setBoard(last.board);
      setScore(last.score);
      setWon(false);
      setLost(false);
      return h.slice(0, -1);
    });
  };

  const changeSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setSize(newSize);
    setBoard(initBoard(newSize));
    setScore(0);
    setHistory([]);
    setWon(false);
    setLost(false);
  };

  const close = () => {
    document.getElementById('close-2048')?.click();
  };

  const textSizeClass =
    size <= 4 ? 'text-2xl' : size === 5 ? 'text-xl' : size === 6 ? 'text-lg' : 'text-base';

  return (
    <GameLayout
      title="2048"
      instructions="Use arrow keys to move tiles. Reach 2048 to win."
      controls={
        <>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={reset}>
            Reset
          </button>
          <button
            id="close-2048"
            className="ml-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={close}
          >
            Close
          </button>
        </>
      }
    >
      <>
        {showLeaderboard && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
            <div className="bg-gray-900 p-4 rounded">
              <div className="text-xl mb-2">Leaderboard</div>
              {highScores.length ? (
                <ol className="list-decimal pl-4">
                  {highScores.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              ) : (
                <div>No scores yet</div>
              )}
              <button
                className="mt-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                onClick={() => setShowLeaderboard(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="h-full w-full p-4 flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none relative">
          <div className="mb-2 flex items-center space-x-2">
            <span>Size:</span>
            <select value={size} onChange={changeSize} className="text-black rounded px-1">
              {[4, 5, 6].map((s) => (
                <option key={s} value={s}>{`${s}x${s}`}</option>
              ))}
            </select>
          </div>

          <div className="mb-2">Score: {score}</div>

          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: '16rem' }}
          >
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const key = `${rIdx}-${cIdx}`;
                const anim = animCells[key];
                return (
                  <div
                    key={key}
                    className={`aspect-square flex items-center justify-center font-bold rounded transition-all ${
                      cell ? tileColors[cell] || 'bg-gray-700' : 'bg-gray-800'
                    } ${textSizeClass} ${
                      anim === 'spawn' ? 'tile-pop' : anim === 'merge' ? 'tile-merge' : ''
                    }`}
                  >
                    {cell !== 0 ? cell : ''}
                  </div>
                );
              })
            )}
          </div>

          {(won || lost) && (
            <div className="mt-4 text-xl">{won ? 'You win!' : 'Game over'}</div>
          )}

          <div className="mt-4 space-x-2">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={undo}>
              Undo
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={reset}>
              Reset
            </button>
            <button
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={() => setShowLeaderboard(true)}
            >
              Leaderboard
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={close}>
              Close
            </button>
          </div>
        </div>
      </>
    </GameLayout>
  );
};

export default Game2048;
