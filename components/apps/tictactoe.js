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

const minimax = (board, player, depth = 0, maxDepth = Infinity) => {
  const { winner } = checkWinner(board);
  if (winner === 'O') return { score: 10 - depth };
  if (winner === 'X') return { score: depth - 10 };
  if (winner === 'draw' || depth === maxDepth) return { score: 0 };

  const moves = [];
  board.forEach((cell, idx) => {
    if (!cell) {
      const newBoard = board.slice();
      newBoard[idx] = player;
      const result = minimax(newBoard, player === 'O' ? 'X' : 'O', depth + 1, maxDepth);
      moves.push({ index: idx, score: result.score });
    }
  });
  if (player === 'O') {
    return moves.reduce((best, move) => (move.score > best.score ? move : best), { score: -Infinity });
  }
  return moves.reduce((best, move) => (move.score < best.score ? move : best), { score: Infinity });
};

const getMediumMove = (board, ai) => {
  const opponent = ai === 'X' ? 'O' : 'X';
  const available = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
  // Win if possible
  for (const idx of available) {
    const test = board.slice();
    test[idx] = ai;
    if (checkWinner(test).winner === ai) return idx;
  }
  // Block opponent win
  for (const idx of available) {
    const test = board.slice();
    test[idx] = opponent;
    if (checkWinner(test).winner === opponent) return idx;
  }
  // Otherwise random
  return available[Math.floor(Math.random() * available.length)];
};

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [status, setStatus] = useState('Choose X or O');
  const [player, setPlayer] = useState(null);
  const [ai, setAi] = useState(null);
  const [difficulty, setDifficulty] = useState('hard');
  const [aiMoves, setAiMoves] = useState(0);
  const [winningLine, setWinningLine] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [score, setScore] = useState({ player: 0, ai: 0, draw: 0 });

  const startGame = (p) => {
    const a = p === 'X' ? 'O' : 'X';
    setPlayer(p);
    setAi(a);
    setStatus(p === 'X' ? 'Your turn' : "AI's turn");
    ReactGA.event({ category: 'TicTacToe', action: 'start' });
    setBoard(Array(9).fill(null));
    setAiMoves(0);
    setWinningLine([]);
    setLastMove(null);
    setScore({ player: 0, ai: 0, draw: 0 });
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
    setLastMove(idx);
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
      setScore((s) => ({
        player: s.player + (winner === player ? 1 : 0),
        ai: s.ai + (winner === ai ? 1 : 0),
        draw: s.draw + (winner === 'draw' ? 1 : 0),
      }));
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
      } else if (difficulty === 'medium') {
        index = getMediumMove(board, ai);
      } else if (aiMoves === 0) {
        index = available[Math.floor(Math.random() * available.length)];
      } else {
        index = minimax(board, ai).index;
      }
      if (index !== undefined) {
        const newBoard = board.slice();
        newBoard[index] = ai;
        setTimeout(() => {
          setBoard(newBoard);
          setLastMove(index);
        }, 200);
        setAiMoves((m) => m + 1);
        ReactGA.event({ category: 'TicTacToe', action: 'move', label: 'ai' });
      }
    } else {
      setStatus('Your turn');
    }
  }, [board, player, ai, difficulty, aiMoves]);

  const restart = () => {
    setBoard(Array(9).fill(null));
    setAiMoves(0);
    setWinningLine([]);
    setLastMove(null);
    setStatus(player === 'X' ? 'Your turn' : "AI's turn");
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setStatus('Choose X or O');
    setPlayer(null);
    setAi(null);
    setAiMoves(0);
    setWinningLine([]);
    setLastMove(null);
    setScore({ player: 0, ai: 0, draw: 0 });
  };

  const difficultySlider = (
    <div className="w-56 mb-4">
      <input
        type="range"
        min="0"
        max="2"
        value={[ 'easy', 'medium', 'hard' ].indexOf(difficulty)}
        onChange={(e) => setDifficulty(['easy','medium','hard'][parseInt(e.target.value,10)] )}
        className="w-full"
      />
      <div className="flex justify-between text-xs">
        <span>Easy</span>
        <span>Medium</span>
        <span>Hard</span>
      </div>
    </div>
  );

  if (player === null) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
        {difficultySlider}
        <div className="mb-4">Choose X or O</div>
        <div className="flex space-x-4">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => startGame('X')}
            onTouchStart={() => startGame('X')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startGame('X');
              }
            }}
          >
            X
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => startGame('O')}
            onTouchStart={() => startGame('O')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startGame('O');
              }
            }}
          >
            O
          </button>
        </div>
      </div>

    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      {difficultySlider}
      <div className="grid grid-cols-3 gap-1 w-60 mb-4">
        {board.map((cell, idx) => (
          <button
            key={idx}
            className={`h-20 w-20 text-4xl flex items-center justify-center bg-gray-700 hover:bg-gray-600 ${
              winningLine.includes(idx)
                ? 'bg-green-600 animate-pulse'
                : lastMove === idx
                ? 'bg-blue-600'
                : ''
            }`}
            onClick={() => handleClick(idx)}
            onTouchStart={() => handleClick(idx)}
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
      <div className="mb-2 text-sm">
        Player: {score.player} | AI: {score.ai} | Draws: {score.draw}
      </div>
      <div className="mb-4">{status}</div>
      <div className="flex space-x-4">
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={restart}
          onTouchStart={restart}
        >
          Restart
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={reset}
          onTouchStart={reset}
        >
          Reset
        </button>
      </div>
    </div>

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

export const displayTictactoe = (addFolder, openApp) => <TicTacToeApp addFolder={addFolder} openApp={openApp} />;
