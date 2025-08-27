import { Board, cloneBoard, moveLeft, moveRight, moveUp, moveDown, boardsEqual } from './logic';

export type Direction = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

const MOVES: { dir: Direction; fn: (b: Board) => Board }[] = [
  { dir: 'ArrowLeft', fn: moveLeft },
  { dir: 'ArrowRight', fn: moveRight },
  { dir: 'ArrowUp', fn: moveUp },
  { dir: 'ArrowDown', fn: moveDown },
];

const emptyCells = (board: Board): Array<[number, number]> => {
  const cells: Array<[number, number]> = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) cells.push([r, c]);
    })
  );
  return cells;
};

const evaluate = (board: Board) => {
  let score = 0;
  let empty = 0;
  let maxTile = 0;
  board.forEach((row) =>
    row.forEach((cell) => {
      score += cell;
      if (cell === 0) empty += 1;
      if (cell > maxTile) maxTile = cell;
    })
  );
  return score + empty * 10 + maxTile * 1;
};

const expectimax = (board: Board, depth: number, isPlayer: boolean): number => {
  if (depth === 0) return evaluate(board);

  if (isPlayer) {
    let best = -Infinity;
    for (const { fn } of MOVES) {
      const next = fn(cloneBoard(board));
      if (boardsEqual(board, next)) continue;
      const val = expectimax(next, depth - 1, false);
      if (val > best) best = val;
    }
    return best === -Infinity ? evaluate(board) : best;
  }

  const cells = emptyCells(board);
  if (cells.length === 0) return evaluate(board);
  let total = 0;
  const prob2 = 0.9 / cells.length;
  const prob4 = 0.1 / cells.length;
  for (const [r, c] of cells) {
    board[r][c] = 2;
    total += prob2 * expectimax(board, depth - 1, true);
    board[r][c] = 4;
    total += prob4 * expectimax(board, depth - 1, true);
    board[r][c] = 0;
  }
  return total;
};

export const findBestMove = (board: Board, depth = 2): Direction | null => {
  let bestDir: Direction | null = null;
  let bestScore = -Infinity;
  for (const { dir, fn } of MOVES) {
    const next = fn(cloneBoard(board));
    if (boardsEqual(board, next)) continue;
    const score = expectimax(next, depth - 1, false);
    if (score > bestScore) {
      bestScore = score;
      bestDir = dir;
    }
  }
  return bestDir;
};

export const findHint = findBestMove;
