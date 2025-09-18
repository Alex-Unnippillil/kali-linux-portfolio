import {
  Board,
  cloneBoard,
  moveLeft,
  moveRight,
  moveUp,
  moveDown,
  boardsEqual,
  MoveResult,
} from './logic';

export type Direction = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

const MOVES: { dir: Direction; fn: (b: Board) => MoveResult }[] = [
  { dir: 'ArrowLeft', fn: moveLeft },
  { dir: 'ArrowRight', fn: moveRight },
  { dir: 'ArrowUp', fn: moveUp },
  { dir: 'ArrowDown', fn: moveDown },
];

const EMPTY_WEIGHT = 16;
const MONOTONICITY_WEIGHT = 4;

const createLogBoard = (board: Board): number[][] =>
  board.map((row) => row.map((cell) => (cell > 0 ? Math.log2(cell) : 0)));

const monotonicityScore = (logBoard: number[][]): number => {
  const size = logBoard.length;
  let score = 0;

  for (const row of logBoard) {
    let inc = 0;
    let dec = 0;
    for (let c = 0; c < size - 1; c += 1) {
      const diff = row[c + 1] - row[c];
      if (diff > 0) inc += diff;
      else dec -= diff;
    }
    score += Math.max(inc, dec);
  }

  for (let c = 0; c < size; c += 1) {
    let inc = 0;
    let dec = 0;
    for (let r = 0; r < size - 1; r += 1) {
      const diff = logBoard[r + 1][c] - logBoard[r][c];
      if (diff > 0) inc += diff;
      else dec -= diff;
    }
    score += Math.max(inc, dec);
  }

  return score;
};

const evaluateBoard = (board: Board): number => {
  const logBoard = createLogBoard(board);
  let empty = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === 0) empty += 1;
    }
  }
  const monotonicity = monotonicityScore(logBoard);
  return monotonicity * MONOTONICITY_WEIGHT + empty * EMPTY_WEIGHT;
};

const evaluateMove = (result: MoveResult): number => evaluateBoard(result.board);

export const findHint = (board: Board): Direction | null => {
  let bestDir: Direction | null = null;
  let bestScore = -Infinity;
  for (const { dir, fn } of MOVES) {
    const result = fn(cloneBoard(board));
    if (boardsEqual(board, result.board)) continue;
    const score = evaluateMove(result);
    if (score > bestScore) {
      bestScore = score;
      bestDir = dir;
    }
  }
  return bestDir;
};

export const scoreMoves = (board: Board): Partial<Record<Direction, number>> => {
  const scores: Partial<Record<Direction, number>> = {};
  for (const { dir, fn } of MOVES) {
    const result = fn(cloneBoard(board));
    if (boardsEqual(board, result.board)) continue;
    scores[dir] = evaluateMove(result);
  }
  return scores;
};

export const findBestMove = findHint;
