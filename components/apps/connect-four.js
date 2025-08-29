import React, { useEffect, useState } from 'react';
import GameLayout from './GameLayout';

const ROWS = 6;
const COLS = 7;

const createEmptyBoard = () =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const getValidRow = (board, col) => {
  for (let r = ROWS - 1; r >= 0; r -= 1) {
    if (!board[r][col]) return r;
  }
  return -1;
};

const checkWinner = (board, player) => {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (board[r][c] !== player) continue;
      for (const [dr, dc] of dirs) {
        let count = 0;
        for (let i = 0; i < 4; i += 1) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
          if (board[rr][cc] !== player) break;
          count += 1;
        }
        if (count === 4) return true;
      }
    }
  }
  return false;
};

const isBoardFull = (board) => board[0].every(Boolean);

const evaluateWindow = (window, player) => {
  const opp = player === 'red' ? 'yellow' : 'red';
  let score = 0;
  const playerCount = window.filter((v) => v === player).length;
  const oppCount = window.filter((v) => v === opp).length;
  const empty = window.filter((v) => v === null).length;
  if (playerCount === 4) score += 100;
  else if (playerCount === 3 && empty === 1) score += 5;
  else if (playerCount === 2 && empty === 2) score += 2;
  if (oppCount === 3 && empty === 1) score -= 4;
  return score;
};

const scorePosition = (board, player) => {
  let score = 0;
  const center = Math.floor(COLS / 2);
  const centerArray = board.map((row) => row[center]);
  score += centerArray.filter((v) => v === player).length * 3;
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      score += evaluateWindow(board[r].slice(c, c + 4), player);
    }
  }
  for (let c = 0; c < COLS; c += 1) {
    for (let r = 0; r < ROWS - 3; r += 1) {
      score += evaluateWindow(
        [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]],
        player,
      );
    }
  }
  for (let r = 0; r < ROWS - 3; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      score += evaluateWindow(
        [
          board[r][c],
          board[r + 1][c + 1],
          board[r + 2][c + 2],
          board[r + 3][c + 3],
        ],
        player,
      );
    }
  }
  for (let r = 3; r < ROWS; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      score += evaluateWindow(
        [
          board[r][c],
          board[r - 1][c + 1],
          board[r - 2][c + 2],
          board[r - 3][c + 3],
        ],
        player,
      );
    }
  }
  return score;
};

const getValidLocations = (board) => {
  const locations = [];
  for (let c = 0; c < COLS; c += 1) {
    if (!board[0][c]) locations.push(c);
  }
  return locations;
};

const minimax = (board, depth, alpha, beta, maximizing) => {
  const validLocations = getValidLocations(board);
  const isTerminal =
    checkWinner(board, 'red') ||
    checkWinner(board, 'yellow') ||
    validLocations.length === 0;
  if (depth === 0 || isTerminal) {
    if (checkWinner(board, 'red')) return { score: 1000000 };
    if (checkWinner(board, 'yellow')) return { score: -1000000 };
    return { score: scorePosition(board, 'red') };
  }
  if (maximizing) {
    let value = -Infinity;
    let column = validLocations[0];
    for (const col of validLocations) {
      const row = getValidRow(board, col);
      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = 'red';
      const score = minimax(newBoard, depth - 1, alpha, beta, false).score;
      if (score > value) {
        value = score;
        column = col;
      }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return { column, score: value };
  }
  let value = Infinity;
  let column = validLocations[0];
  for (const col of validLocations) {
    const row = getValidRow(board, col);
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = 'yellow';
    const score = minimax(newBoard, depth - 1, alpha, beta, true).score;
    if (score < value) {
      value = score;
      column = col;
    }
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return { column, score: value };
};

const simulateRandomGame = (board, current) => {
  const tempBoard = board.map((r) => [...r]);
  let player = current;
  while (true) {
    const valid = getValidLocations(tempBoard);
    if (valid.length === 0) return 'draw';
    const col = valid[Math.floor(Math.random() * valid.length)];
    const row = getValidRow(tempBoard, col);
    tempBoard[row][col] = player;
    if (checkWinner(tempBoard, player)) return player;
    player = player === 'red' ? 'yellow' : 'red';
  }
};

const calculateWinProbabilities = (board, player, simulations = 50) => {
  const valid = getValidLocations(board);
  const probs = Array(COLS).fill(null);
  for (const col of valid) {
    let wins = 0;
    for (let i = 0; i < simulations; i += 1) {
      const newBoard = board.map((r) => [...r]);
      const row = getValidRow(newBoard, col);
      newBoard[row][col] = player;
      const winner = simulateRandomGame(
        newBoard,
        player === 'red' ? 'yellow' : 'red',
      );
      if (winner === player) wins += 1;
    }
    probs[col] = Math.round((wins / simulations) * 100);
  }
  return probs;
};

export default function ConnectFour() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [player, setPlayer] = useState('yellow');
  const [winner, setWinner] = useState(null);
  const [winProbs, setWinProbs] = useState(Array(COLS).fill(null));
  const [game, setGame] = useState({ history: [] });

  const dropDisc = (col, color) => {
    const row = getValidRow(board, col);
    if (row === -1) return;
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = color;
    setBoard(newBoard);
    if (checkWinner(newBoard, color)) {
      setWinner(color);
    } else if (isBoardFull(newBoard)) {
      setWinner('draw');
    } else {
      setPlayer(color === 'red' ? 'yellow' : 'red');
    }
  };

  const handleClick = (col) => {
    if (winner || player !== 'yellow') return;
    setGame((g) => ({ history: [...g.history, board.map((r) => [...r])] }));
    dropDisc(col, 'yellow');
  };

  const undo = () => {
    setGame((g) => {
      if (!g.history.length) return g;
      const prev = g.history[g.history.length - 1];
      setBoard(prev);
      setPlayer('yellow');
      setWinner(null);
      return { history: g.history.slice(0, -1) };
    });
  };

  useEffect(() => {
    if (player === 'red' && !winner) {
      const { column } = minimax(board, 4, -Infinity, Infinity, true);
      if (column !== undefined) dropDisc(column, 'red');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, winner, board]);

  useEffect(() => {
    if (!winner) {
      setWinProbs(calculateWinProbabilities(board, player));
    } else {
      setWinProbs(Array(COLS).fill(null));
    }
  }, [board, player, winner]);

  return (
    <GameLayout gameId="connect-four">
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
        {winner && (
          <div className="mb-2 capitalize">
            {winner === 'draw' ? 'Draw!' : `${winner} wins!`}
          </div>
        )}
        <div className="grid grid-cols-7 gap-1 mb-1 text-xs text-center">
          {winProbs.map((p, idx) => (
            <div key={idx}>{p !== null ? `${p}%` : ''}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => (
              <button
                key={`${rIdx}-${cIdx}`}
                aria-label={`cell-${rIdx}-${cIdx}`}
                className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center focus:outline-none"
                onClick={() => handleClick(cIdx)}
              >
                {cell && (
                  <div
                    className={`w-8 h-8 rounded-full ${
                      cell === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                    }`}
                  />
                )}
              </button>
            )),
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => {
              setBoard(createEmptyBoard());
              setPlayer('yellow');
              setWinner(null);
              setGame({ history: [] });
            }}
          >
            Reset
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={undo}
            disabled={game.history.length === 0}
          >
            Undo
          </button>
        </div>
      </div>
    </GameLayout>
  );
}

