export type Board = number[][];
export type Direction = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

const cloneBoard = (board: Board): Board => board.map((row) => [...row]);

const slideRow = (row: number[], size: number): number[] => {
  const arr = row.filter((n) => n !== 0);
  for (let i = 0; i < arr.length - 1; i += 1) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      arr[i + 1] = 0;
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < size) newRow.push(0);
  return newRow;
};

const transpose = (board: Board): Board =>
  board[0].map((_, c) => board.map((row) => row[c]));

const moveLeft = (board: Board): Board => {
  const size = board[0]?.length ?? 0;
  return board.map((row) => slideRow(row, size));
};

const moveRight = (board: Board): Board => {
  const reversed = board.map((row) => [...row].reverse());
  const moved = moveLeft(reversed);
  return moved.map((row) => row.reverse());
};

const moveUp = (board: Board): Board => transpose(moveLeft(transpose(board)));
const moveDown = (board: Board): Board => transpose(moveRight(transpose(board)));

const boardsEqual = (a: Board, b: Board) =>
  a.every((row, r) => row.every((cell, c) => cell === b[r][c]));

const log2 = (value: number): number => (value > 0 ? Math.log2(value) : 0);

const SMOOTHNESS_WEIGHT = 1.1;
const MONOTONICITY_WEIGHT = 1.0;
const EMPTY_WEIGHT = 2.7;

const evaluateMonotonicity = (board: Board): number => {
  const size = board[0]?.length ?? 0;
  let score = 0;
  for (let r = 0; r < size; r += 1) {
    let inc = 0;
    let dec = 0;
    for (let c = 0; c < size - 1; c += 1) {
      const current = board[r][c];
      const next = board[r][c + 1];
      if (!current || !next) continue;
      const diff = log2(current) - log2(next);
      if (diff > 0) {
        dec += diff;
      } else if (diff < 0) {
        inc -= diff;
      }
    }
    score += Math.max(inc, dec);
  }
  for (let c = 0; c < size; c += 1) {
    let inc = 0;
    let dec = 0;
    for (let r = 0; r < size - 1; r += 1) {
      const current = board[r][c];
      const next = board[r + 1][c];
      if (!current || !next) continue;
      const diff = log2(current) - log2(next);
      if (diff > 0) {
        dec += diff;
      } else if (diff < 0) {
        inc -= diff;
      }
    }
    score += Math.max(inc, dec);
  }
  return score;
};

const evaluateSmoothness = (board: Board): number => {
  const size = board[0]?.length ?? 0;
  let score = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const current = board[r][c];
      if (!current) continue;
      if (c < size - 1) {
        const neighbor = board[r][c + 1];
        if (neighbor) {
          score -= Math.abs(log2(current) - log2(neighbor));
        }
      }
      if (r < size - 1) {
        const neighbor = board[r + 1][c];
        if (neighbor) {
          score -= Math.abs(log2(current) - log2(neighbor));
        }
      }
    }
  }
  return score;
};

const countEmpty = (board: Board): number => {
  let count = 0;
  board.forEach((row) =>
    row.forEach((cell) => {
      if (cell === 0) count += 1;
    })
  );
  return count;
};

export const evaluateBoard = (board: Board): number => {
  const monotonicity = evaluateMonotonicity(board);
  const smoothness = evaluateSmoothness(board);
  const empty = countEmpty(board);
  return (
    MONOTONICITY_WEIGHT * monotonicity +
    SMOOTHNESS_WEIGHT * smoothness +
    EMPTY_WEIGHT * empty
  );
};

const MOVES: { dir: Direction; fn: (board: Board) => Board }[] = [
  { dir: 'ArrowLeft', fn: moveLeft },
  { dir: 'ArrowRight', fn: moveRight },
  { dir: 'ArrowUp', fn: moveUp },
  { dir: 'ArrowDown', fn: moveDown },
];

const DIRECTION_PRIORITY: Record<Direction, number> = {
  ArrowLeft: 3,
  ArrowDown: 2,
  ArrowUp: 1,
  ArrowRight: 0,
};

export const findBestMove = (board: Board): Direction | null => {
  let best: { dir: Direction | null; score: number } = { dir: null, score: -Infinity };
  for (const { dir, fn } of MOVES) {
    const next = fn(cloneBoard(board));
    if (boardsEqual(board, next)) continue;
    const score = evaluateBoard(next);
    const currentPriority = best.dir !== null ? DIRECTION_PRIORITY[best.dir] : -Infinity;
    if (score > best.score || (score === best.score && DIRECTION_PRIORITY[dir] > currentPriority)) {
      best = { dir, score };
    }
  }
  return best.dir;
};

export const scoreMoves = (board: Board): Partial<Record<Direction, number>> => {
  const scores: Partial<Record<Direction, number>> = {};
  for (const { dir, fn } of MOVES) {
    const next = fn(cloneBoard(board));
    if (boardsEqual(board, next)) continue;
    scores[dir] = evaluateBoard(next);
  }
  return scores;
};
