import type { Board } from './types';
import { countSolutions, solve } from './solver';

function shuffle<T>(arr: T[]): T[] {
  return arr
    .map((x) => ({ x, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map((o) => o.x);
}

function generateFullBoard(): Board {
  const board: Board = Array.from({ length: 9 }, () => Array(9).fill(0));
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  function fill(r: number, c: number): boolean {
    if (r === 9) return true;
    const nextR = c === 8 ? r + 1 : r;
    const nextC = (c + 1) % 9;
    const nums = shuffle(digits);
    for (const n of nums) {
      if (isValid(board, r, c, n)) {
        board[r][c] = n;
        if (fill(nextR, nextC)) return true;
        board[r][c] = 0;
      }
    }
    return false;
  }
  fill(0, 0);
  return board;
}

function isValid(board: Board, row: number, col: number, val: number): boolean {
  for (let i = 0; i < 9; i += 1) {
    if (board[row][i] === val || board[i][col] === val) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      if (board[boxRow + r][boxCol + c] === val) return false;
    }
  }
  return true;
}

const DIFFICULTY_REMOVALS: Record<'easy' | 'medium' | 'hard', number> = {
  easy: 40,
  medium: 50,
  hard: 60,
};

export function generatePuzzle(difficulty: 'easy' | 'medium' | 'hard' = 'easy'): Board {
  const solved = generateFullBoard();
  const puzzle = solved.map((row) => [...row]);
  const removeTarget = DIFFICULTY_REMOVALS[difficulty];
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i));
  let removed = 0;
  for (const idx of cells) {
    if (removed >= removeTarget) break;
    const r = Math.floor(idx / 9);
    const c = idx % 9;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    const solutions = countSolutions(puzzle, 2);
    if (solutions !== 1) {
      puzzle[r][c] = backup;
    } else {
      removed += 1;
    }
  }
  return puzzle;
}

export function getSolution(puzzle: Board): Board | null {
  const copy = puzzle.map((row) => [...row]);
  return solve(copy);
}
