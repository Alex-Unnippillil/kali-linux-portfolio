import React, { useState, useEffect, useCallback } from 'react';

const ROWS = 20;
const COLS = 10;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
};

const COLORS = {
  I: 'bg-cyan-500',
  J: 'bg-blue-500',
  L: 'bg-orange-500',
  O: 'bg-yellow-500',
  S: 'bg-green-500',
  T: 'bg-purple-500',
  Z: 'bg-red-500',
};

const randomPiece = () => {
  const types = Object.keys(SHAPES);
  const type = types[Math.floor(Math.random() * types.length)];
  const shape = SHAPES[type];
  return {
    type,
    shape,
    row: 0,
    col: Math.floor((COLS - shape[0].length) / 2),
  };
};

const rotate = (matrix) => matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());

const isValidMove = (shape, row, col, board) => {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const newRow = row + r;
        const newCol = col + c;
        if (newCol < 0 || newCol >= COLS || newRow >= ROWS) return false;
        if (newRow >= 0 && board[newRow][newCol]) return false;
      }
    }
  }
  return true;
};

const Tetris = () => {
  const [board, setBoard] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
  );
  const [piece, setPiece] = useState(randomPiece());
  const [speed, setSpeed] = useState(1000);

  const mergePiece = useCallback(() => {
    const newBoard = board.map((row) => row.slice());
    piece.shape.forEach((row, r) => {
      row.forEach((value, c) => {
        if (value) {
          const newRow = piece.row + r;
          const newCol = piece.col + c;
          if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS) {
            newBoard[newRow][newCol] = piece.type;
          }
        }
      });
    });

    // Clear lines
    let cleared = 0;
    const filtered = newBoard.filter((row) => row.some((cell) => !cell));
    cleared = ROWS - filtered.length;
    while (filtered.length < ROWS) {
      filtered.unshift(Array(COLS).fill(0));
    }
    if (cleared) {
      setSpeed((s) => Math.max(100, s - 50 * cleared));
    }
    setBoard(filtered);
    setPiece(randomPiece());
  }, [board, piece]);

  const movePiece = useCallback(
    (dr, dc, newShape = piece.shape) => {
      const newRow = piece.row + dr;
      const newCol = piece.col + dc;
      if (isValidMove(newShape, newRow, newCol, board)) {
        setPiece({ ...piece, row: newRow, col: newCol, shape: newShape });
        return true;
      }
      if (dr === 1 && dc === 0) {
        mergePiece();
      }
      return false;
    },
    [board, piece, mergePiece],
  );

  const handleKey = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          movePiece(0, -1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          movePiece(0, 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          movePiece(1, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          const rotated = rotate(piece.shape);
          movePiece(0, 0, rotated);
          break;
        default:
          break;
      }
    },
    [movePiece, piece.shape],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      movePiece(1, 0);
    }, speed);
    return () => clearInterval(interval);
  }, [movePiece, speed]);

  const renderBoard = () => {
    const display = board.map((row) => row.slice());
    piece.shape.forEach((row, r) => {
      row.forEach((value, c) => {
        if (value) {
          const newRow = piece.row + r;
          const newCol = piece.col + c;
          if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS) {
            display[newRow][newCol] = piece.type;
          }
        }
      });
    });
    return display;
  };

  const display = renderBoard();

  return (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white p-4">
      <div
        className="grid gap-[1px] bg-gray-700"
        style={{
          gridTemplateRows: `repeat(${ROWS}, 1rem)`,
          gridTemplateColumns: `repeat(${COLS}, 1rem)`,
        }}
      >
        {display.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-4 h-4 sm:w-5 sm:h-5 ${cell ? COLORS[cell] : 'bg-gray-900'}`}
            />
          )),
        )}
      </div>
    </div>
  );
};

export default Tetris;
