import React, { useState, useEffect } from 'react';

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const checkWinner = (board) => {
  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every(Boolean)) return 'draw';
  return null;
};

const minimax = (board, player) => {
  const winner = checkWinner(board);
  if (winner === 'O') return { score: 1 };
  if (winner === 'X') return { score: -1 };
  if (winner === 'draw') return { score: 0 };

  const moves = [];
  board.forEach((cell, idx) => {
    if (!cell) {
      const newBoard = board.slice();
      newBoard[idx] = player;
      const result = minimax(newBoard, player === 'O' ? 'X' : 'O');
      moves.push({ index: idx, score: result.score });
    }
  });

  if (player === 'O') {
    return moves.reduce((best, move) => (move.score > best.score ? move : best), {
      score: -Infinity,
    });
  }
  return moves.reduce((best, move) => (move.score < best.score ? move : best), {
    score: Infinity,
  });
};

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [status, setStatus] = useState('Your turn');

  const handleClick = (idx) => {
    if (board[idx] || checkWinner(board)) return;
    const newBoard = board.slice();
    newBoard[idx] = 'X';
    setBoard(newBoard);
  };

  useEffect(() => {
    const winner = checkWinner(board);
    if (winner) {
      setStatus(winner === 'draw' ? "It's a draw" : `${winner} wins!`);
      return;
    }
    if (board.filter(Boolean).length % 2 === 1) {
      const { index } = minimax(board, 'O');
      if (index !== undefined) {
        const newBoard = board.slice();
        newBoard[index] = 'O';
        setTimeout(() => setBoard(newBoard), 200);
      }
    } else {
      setStatus('Your turn');
    }
  }, [board]);

  const reset = () => {
    setBoard(Array(9).fill(null));
    setStatus('Your turn');
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="grid grid-cols-3 gap-1 w-60 mb-4">
        {board.map((cell, idx) => (
          <button
            key={idx}
            className="h-20 w-20 bg-gray-700 hover:bg-gray-600 text-4xl flex items-center justify-center"
            onClick={() => handleClick(idx)}
          >
            {cell}
          </button>
        ))}
      </div>
      <div className="mb-4">{status}</div>
      <button
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={reset}
      >
        Reset
      </button>
    </div>
  );
};

export default TicTacToe;

