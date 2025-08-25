import React, { useState } from 'react';
import { withGameErrorBoundary } from './GameErrorBoundary';

const ROWS = 6;
const COLS = 7;

const createEmptyBoard = () =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const checkWinner = (board, player) => {
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== player) continue;
      for (const { dr, dc } of directions) {
        let count = 0;
        for (let i = 0; i < 4; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
          if (board[rr][cc] !== player) break;
          count++;
        }
        if (count === 4) return true;
      }
    }
  }

  return false;
};

const ConnectFour = () => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [player, setPlayer] = useState('red');
  const [winner, setWinner] = useState(null);

  const dropDisc = (col) => {
    if (winner) return;
    const newBoard = board.map((row) => row.slice());
    for (let row = ROWS - 1; row >= 0; row--) {
      if (!newBoard[row][col]) {
        newBoard[row][col] = player;
        break;
      }
    }
    setBoard(newBoard);
    if (checkWinner(newBoard, player)) {
      setWinner(player);
    } else {
      setPlayer(player === 'red' ? 'yellow' : 'red');
    }
  };

  const reset = () => {
    setBoard(createEmptyBoard());
    setWinner(null);
    setPlayer('red');
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      {winner && <div className="mb-4 capitalize">{`${winner} wins!`}</div>}
      <div className="grid grid-cols-7 gap-1">
        {board.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className="h-10 w-10 bg-blue-700 flex items-center justify-center cursor-pointer"
              onClick={() => dropDisc(cIdx)}
            >
              {cell && (
                <div
                  className={`h-8 w-8 rounded-full ${
                    cell === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                  }`}
                />
              )}
            </div>
          ))
        )}
      </div>
      <button
        className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={reset}
      >
        Reset
      </button>
    </div>
  );
};

const ConnectFourWithBoundary = withGameErrorBoundary(ConnectFour);

export default ConnectFourWithBoundary;

