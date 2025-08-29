import { solve } from '../../../workers/sudokuSolver';

export const SIZE = 9;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// Pseudo random generator so daily puzzles are deterministic
const createRNG = (seed: number): (() => number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T>(arr: T[], rng: () => number): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const isValid = (
  board: number[][],
  row: number,
  col: number,
  num: number,
): boolean => {
  for (let i = 0; i < SIZE; i++) {
    if (board[row][i] === num || board[i][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[boxRow + r][boxCol + c] === num) return false;
    }
  }
  return true;
};

// Backtracking solver used for generation and uniqueness checks
const solveBoard = (
  board: number[][],
  idx = 0,
  rng: () => number = Math.random,
): boolean => {
  if (idx === SIZE * SIZE) return true;
  const row = Math.floor(idx / SIZE);
  const col = idx % SIZE;
  if (board[row][col] !== 0) return solveBoard(board, idx + 1, rng);
  const nums = shuffle(
    range(SIZE).map((n) => n + 1),
    typeof rng === 'function' ? rng : Math.random,
  );
  for (const num of nums) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      if (solveBoard(board, idx + 1, rng)) return true;
      board[row][col] = 0;
    }
  }
  return false;
};

const countSolutions = (
  board: number[][],
  idx = 0,
  limit = 2,
): number => {
  if (idx === SIZE * SIZE) return 1;
  const row = Math.floor(idx / SIZE);
  const col = idx % SIZE;
  if (board[row][col] !== 0) return countSolutions(board, idx + 1, limit);
  let count = 0;
  for (let num = 1; num <= SIZE && count < limit; num++) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      count += countSolutions(board, idx + 1, limit - count);
      board[row][col] = 0;
    }
  }
  return count;
};

export const getCandidates = (
  board: number[][],
  r: number,
  c: number,
): number[] => {
  const cand: number[] = [];
  for (let n = 1; n <= SIZE; n++) if (isValid(board, r, c, n)) cand.push(n);
  return cand;
};

const HOLES_BY_DIFFICULTY: Record<string, number> = {
  easy: 35,
  medium: 45,
  hard: 55,
};

export const generateSudoku = (
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  seed = Date.now(),
): { puzzle: number[][]; solution: number[][] } => {
  const rng = createRNG(seed);
  const board = Array(SIZE)
    .fill(0)
    .map(() => Array(SIZE).fill(0));
  solveBoard(board, 0, rng);
  const solution = board.map((row) => row.slice());
  const puzzle = board.map((row) => row.slice());
  let holes = HOLES_BY_DIFFICULTY[difficulty] || HOLES_BY_DIFFICULTY.easy;
  const positions = shuffle(range(SIZE * SIZE), rng);
  for (const pos of positions) {
    if (holes === 0) break;
    const r = Math.floor(pos / SIZE);
    const c = pos % SIZE;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    const copy = puzzle.map((row) => row.slice());
    if (countSolutions(copy) !== 1) {
      puzzle[r][c] = backup;
    } else {
      holes--;
    }
  }
  return { puzzle, solution };
};

export const isValidPlacement = (
  board: number[][],
  r: number,
  c: number,
  val: number,
): boolean => {
  if (!isValid(board, r, c, val)) return false;
  const copy = board.map((row) => row.slice());
  copy[r][c] = val;
  try {
    solve(copy);
    return true;
  } catch {
    return false;
  }
};

export default { generateSudoku, getCandidates, isValidPlacement, isValid };
