import React, { useState, useEffect } from 'react';
import ReactGA from 'react-ga4';
import confetti from 'canvas-confetti';
import GameLayout from './GameLayout';

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
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return { winner: null, line: [] };
};

const minimax = (board, player) => {
  const { winner } = checkWinner(board);
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
    return moves.reduce((best, move) => (move.score > best.score ? move : best), { score: -Infinity });
  }
  return moves.reduce((best, move) => (move.score < best.score ? move : best), { score: Infinity });
};

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [status, setStatus] = useState('Choose X or O');
  const [player, setPlayer] = useState(null);
  const [ai, setAi] = useState(null);
  const [difficulty, setDifficulty] = useState('hard');
  const [aiMoves, setAiMoves] = useState(0);
  const [winningLine, setWinningLine] = useState([]);

  const startGame = (p) => {
    const a = p === 'X' ? 'O' : 'X';
    setPlayer(p);
    setAi(a);
    setStatus(p === 'X' ? 'Your turn' : "AI's turn");
    ReactGA.event({ category: 'TicTacToe', action: 'start' });
    setBoard(Array(9).fill(null));
    setAiMoves(0);
    setWinningLine([]);
  };

  const handleClick = (idx) => {
    if (player === null) return;
    if (board[idx] || checkWinner(board).winner) return;
    const filled = board.filter(Boolean).length;
    const isXTurn = filled % 2 === 0;
    const currentTurn = isXTurn ? 'X' : 'O';
    if (currentTurn !== player) return;
    const newBoard = board.slice();
    newBoard[idx] = player;
    setBoard(newBoard);
    ReactGA.event({ category: 'TicTacToe', action: 'move', label: 'player' });
  };

  useEffect(() => {
    if (player === null || ai === null) return;
    const { winner, line } = checkWinner(board);
    if (winner) {
      if (winner !== 'draw') {
        setWinningLine(line);
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      }
      setStatus(
        winner === 'draw' ? "It's a draw" : winner === player ? 'You win!' : 'You lose!'
      );
      ReactGA.event({ category: 'TicTacToe', action: 'game_over', label: winner });
      return;
    }

    const filled = board.filter(Boolean).length;
    const isXTurn = filled % 2 === 0;
    const aiTurn = (ai === 'X' && isXTurn) || (ai === 'O' && !isXTurn);
    if (aiTurn) {
      const available = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
      let index;
      if (difficulty === 'easy') {
        index = available[Math.floor(Math.random() * available.length)];
      } else if (aiMoves === 0) {
        index = available[Math.floor(Math.random() * available.length)];
      } else {
        index = minimax(board, ai).index;
      }
      if (index !== undefined) {
        const newBoard = board.slice();
        newBoard[index] = ai;
        setTimeout(() => setBoard(newBoard), 200);
        setAiMoves((m) => m + 1);
        ReactGA.event({ category: 'TicTacToe', action: 'move', label: 'ai' });
      }
    } else {
      setStatus('Your turn');
    }
  }, [board, player, ai, difficulty, aiMoves]);

  const reset = () => {
    setBoard(Array(9).fill(null));
    setStatus('Choose X or O');
    setPlayer(null);
    setAi(null);
    setAiMoves(0);
    setWinningLine([]);
  };

  const difficultySlider = (
    <div className="w-40 mb-4">
      <input
        type="range"
        min="0"
        max="1"
        value={difficulty === 'easy' ? 0 : 1}
        onChange={(e) => setDifficulty(e.target.value === '0' ? 'easy' : 'hard')}
        className="w-full"
      />
      <div className="flex justify-between text-xs">
        <span>Easy</span>
        <span>Hard</span>
      </div>
    </div>
  );

  if (player === null) {
    return (
      <GameLayout
        title="Tic Tac Toe"
        controls={
          <div className="flex space-x-4">
            <button
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={() => startGame('X')}
            >
              X
            </button>
            <button
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={() => startGame('O')}
            >
              O
            </button>
          </div>
        }
      >
        <>
          {difficultySlider}
          <div className="mb-4">Choose X or O</div>
        </>
      </GameLayout>
    );
  }

  return (
    <GameLayout
      title="Tic Tac Toe"
      score={<div>{status}</div>}
      controls={
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={reset}
        >
          Reset
        </button>
      }
    >
      <>
        {difficultySlider}
        <div className="grid grid-cols-3 gap-1 w-60 mb-4">
          {board.map((cell, idx) => (
            <button
              key={idx}
              className={`h-20 w-20 text-4xl flex items-center justify-center bg-gray-700 hover:bg-gray-600 ${
                winningLine.includes(idx) ? 'bg-green-600 animate-pulse' : ''
              }`}
              onClick={() => handleClick(idx)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick(idx);
                }
              }}
            >
              {cell}
            </button>
          ))}
        </div>
      </>
    </GameLayout>
  );
};

export { checkWinner, minimax };

export default function TicTacToeApp() {
  return (
    <GameLayout gameId="tictactoe">
      <TicTacToe />
    </GameLayout>
  );
}
