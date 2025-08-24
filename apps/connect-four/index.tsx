import React, { useState, useEffect } from 'react';

const ROWS = 6;
const COLS = 7;
const AI = 2;
const HUMAN = 1;
const MAX_TIME = 250; // ms time limit for search
const columnOrder = [3, 2, 4, 1, 5, 0, 6]; // center first

// simple opening book indexed by move sequence
const book: Record<string, number> = {
  '': 3,
  '3': 2,
  '33': 4,
};

const createBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const cloneBoard = (board: number[][]) => board.map((row) => row.slice());

const validCols = (board: number[][]) =>
  columnOrder.filter((c) => board[0][c] === 0);

const dropPiece = (board: number[][], col: number, player: number) => {
  const newBoard = cloneBoard(board);
  for (let r = ROWS - 1; r >= 0; r--) {
    if (newBoard[r][col] === 0) {
      newBoard[r][col] = player;
      break;
    }
  }
  return newBoard;
};

const checkWin = (board: number[][], player: number) => {
  // horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (
        board[r][c] === player &&
        board[r][c + 1] === player &&
        board[r][c + 2] === player &&
        board[r][c + 3] === player
      )
        return true;
    }
  }
  // vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      if (
        board[r][c] === player &&
        board[r + 1][c] === player &&
        board[r + 2][c] === player &&
        board[r + 3][c] === player
      )
        return true;
    }
  }
  // diag /
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (
        board[r][c] === player &&
        board[r - 1][c + 1] === player &&
        board[r - 2][c + 2] === player &&
        board[r - 3][c + 3] === player
      )
        return true;
    }
  }
  // diag \
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (
        board[r][c] === player &&
        board[r + 1][c + 1] === player &&
        board[r + 2][c + 2] === player &&
        board[r + 3][c + 3] === player
      )
        return true;
    }
  }
  return false;
};

const evaluateWindow = (window: number[], player: number) => {
  const opponent = player === AI ? HUMAN : AI;
  const countPlayer = window.filter((v) => v === player).length;
  const countOpp = window.filter((v) => v === opponent).length;
  const countEmpty = window.filter((v) => v === 0).length;
  let score = 0;
  if (countPlayer === 4) score += WIN_SCORE;
  else if (countPlayer === 3 && countEmpty === 1) score += 100;
  else if (countPlayer === 2 && countEmpty === 2) score += 10;
  if (countOpp === 3 && countEmpty === 1) score -= 80;
  if (countOpp === 4) score -= WIN_SCORE;
  return score;
};

const scorePosition = (board: number[][], player: number) => {
  let score = 0;
  const center = Math.floor(COLS / 2);
  const centerCount = board.map((r) => r[center]).filter((v) => v === player).length;
  score += centerCount * 3; // center weighting
  // horizontal windows
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]];
      score += evaluateWindow(window, player);
    }
  }
  // vertical windows
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      const window = [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]];
      score += evaluateWindow(window, player);
    }
  }
  // diag /
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [
        board[r][c],
        board[r - 1][c + 1],
        board[r - 2][c + 2],
        board[r - 3][c + 3],
      ];
      score += evaluateWindow(window, player);
    }
  }
  // diag \
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [
        board[r][c],
        board[r + 1][c + 1],
        board[r + 2][c + 2],
        board[r + 3][c + 3],
      ];
      score += evaluateWindow(window, player);
    }
  }
  return score;
};

const isTerminal = (board: number[][]) =>
  checkWin(board, HUMAN) || checkWin(board, AI) || validCols(board).length === 0;

const minimax = (
  board: number[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  start: number,
  limit: number,
): number => {
  const valid = validCols(board);
  const terminal = isTerminal(board);
  if (depth === 0 || terminal || performance.now() - start > limit) {
    if (terminal) {
      if (checkWin(board, AI)) return 1_000_000;
      if (checkWin(board, HUMAN)) return -1_000_000;
      return 0;
    }
    return scorePosition(board, AI);
  }
  if (maximizing) {
    let value = -Infinity;
    for (const col of valid) {
      const child = dropPiece(board, col, AI);
      value = Math.max(value, minimax(child, depth - 1, alpha, beta, false, start, limit));
      alpha = Math.max(alpha, value);
      if (alpha >= beta || performance.now() - start > limit) break;
    }
    return value;
  }
  let value = Infinity;
  for (const col of valid) {
    const child = dropPiece(board, col, HUMAN);
    value = Math.min(value, minimax(child, depth - 1, alpha, beta, true, start, limit));
    beta = Math.min(beta, value);
    if (alpha >= beta || performance.now() - start > limit) break;
  }
  return value;
};

const bestMove = (board: number[][], moves: number[]) => {
  const key = moves.join('');
  if (book[key] !== undefined && board[0][book[key]] === 0) return book[key];
  const start = performance.now();
  let depth = 1;
  let best = columnOrder[0];
  while (performance.now() - start < MAX_TIME) {
    let value = -Infinity;
    let move = best;
    for (const col of validCols(board)) {
      const child = dropPiece(board, col, AI);
      const score = minimax(child, depth - 1, -Infinity, Infinity, false, start, MAX_TIME);
      if (score > value) {
        value = score;
        move = col;
      }
    }
    best = move;
    depth++;
  }
  return best;
};

const ConnectFour: React.FC = () => {
  const [board, setBoard] = useState<number[][]>(createBoard);
  const [turn, setTurn] = useState<'human' | 'ai'>('human');
  const [status, setStatus] = useState('Your move');
  const [moves, setMoves] = useState<number[]>([]);
  const [gameOver, setGameOver] = useState(false);

  const handleClick = (col: number) => {
    if (turn !== 'human' || gameOver || board[0][col] !== 0) return;
    const newBoard = dropPiece(board, col, HUMAN);
    const newMoves = [...moves, col];
    setBoard(newBoard);
    setMoves(newMoves);
    if (checkWin(newBoard, HUMAN)) {
      setStatus('You win!');
      setGameOver(true);
      return;
    }
    if (validCols(newBoard).length === 0) {
      setStatus('Draw');
      setGameOver(true);
      return;
    }
    setTurn('ai');
    setStatus('AI thinking...');
  };

  useEffect(() => {
    if (turn === 'ai' && !gameOver) {
      const id = setTimeout(() => {
        const col = bestMove(board, moves);
        const newBoard = dropPiece(board, col, AI);
        const newMoves = [...moves, col];
        setBoard(newBoard);
        setMoves(newMoves);
        if (checkWin(newBoard, AI)) {
          setStatus('AI wins');
          setGameOver(true);
        } else if (validCols(newBoard).length === 0) {
          setStatus('Draw');
          setGameOver(true);
        } else {
          setTurn('human');
          setStatus('Your move');
        }
      }, 50);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [turn, board, moves, gameOver]);

  return (
    <div className="p-4 select-none">
      <h1 className="text-xl font-bold mb-2">Connect Four</h1>
      <div className="grid grid-cols-7 gap-1 bg-blue-800 p-1 rounded" style={{ width: 'max-content' }}>
        {board.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className="w-12 h-12 bg-blue-500 flex items-center justify-center cursor-pointer"
              onClick={() => handleClick(c)}
            >
              <div
                className={`w-10 h-10 rounded-full ${
                  cell === HUMAN ? 'bg-red-500' : cell === AI ? 'bg-yellow-400' : 'bg-white'
                }`}
              />
            </div>
          )),
        )}
      </div>
      <p className="mt-2">{status}</p>
    </div>
  );
};

export default ConnectFour;

