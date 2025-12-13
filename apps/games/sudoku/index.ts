import { ratePuzzle, solve } from '../../../workers/sudokuSolver';

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
    if ((i !== col && board[row][i] === num) || (i !== row && board[i][col] === num))
      return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const rr = boxRow + r;
      const cc = boxCol + c;
      if (!(rr === row && cc === col) && board[rr][cc] === num) return false;
    }
  }
  return true;
};

export const isLegalMove = (board: number[][], row: number, col: number, num: number): boolean => {
  const current = board[row][col];
  board[row][col] = 0;
  const valid = isValid(board, row, col, num);
  board[row][col] = current;
  return valid;
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

export const countSolutions = (board: number[][], limit = 2): number => {
  if (limit <= 0) return 0;
  let bestRow = -1;
  let bestCol = -1;
  let bestCandidates: number[] | null = null;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== 0) continue;
      const candidates = getCandidates(board, r, c);
      if (candidates.length === 0) return 0;
      if (bestCandidates === null || candidates.length < bestCandidates.length) {
        bestCandidates = candidates;
        bestRow = r;
        bestCol = c;
        if (candidates.length === 1) break;
      }
    }
    if (bestCandidates && bestCandidates.length === 1) break;
  }

  if (bestCandidates === null) return 1;

  let count = 0;
  for (const num of bestCandidates) {
    if (count >= limit) break;
    board[bestRow][bestCol] = num;
    count += countSolutions(board, limit - count);
    board[bestRow][bestCol] = 0;
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

export const hasUniqueSolution = (board: number[][]): boolean => countSolutions(board, 2) === 1;

export const wouldRemainSolvable = (
  board: number[][],
  r: number,
  c: number,
  val: number,
): boolean => {
  const copy = board.map((row) => row.slice());
  copy[r][c] = val;
  return countSolutions(copy, 1) > 0;
};

const HOLE_RANGES: Record<'easy' | 'medium' | 'hard', [number, number]> = {
  easy: [30, 40],
  medium: [40, 50],
  hard: [50, 60],
};

const mixSeed = (seed: number, attempt: number) => (seed + attempt * 9973) >>> 0;

const digHolesUnique = (
  solution: number[][],
  rng: () => number,
  minHoles: number,
  maxHoles: number,
): number[][] => {
  const puzzle = solution.map((row) => row.slice());
  const positions = shuffle(range(SIZE * SIZE), rng);
  let holes = 0;
  for (const pos of positions) {
    if (holes >= maxHoles) break;
    const r = Math.floor(pos / SIZE);
    const c = pos % SIZE;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (hasUniqueSolution(puzzle)) {
      holes++;
    } else {
      puzzle[r][c] = backup;
    }
  }
  if (holes < minHoles) return solution.map((row) => row.slice());
  return puzzle;
};

export const generateSudoku = (
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  seed = Date.now(),
): { puzzle: number[][]; solution: number[][] } => {
  const MAX_ATTEMPTS = 50;
  const targetRange = HOLE_RANGES[difficulty];
  let bestAttempt: { puzzle: number[][]; solution: number[][]; score: number } | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = createRNG(mixSeed(seed >>> 0, attempt));
    const board = Array(SIZE)
      .fill(0)
      .map(() => Array(SIZE).fill(0));
    solveBoard(board, 0, rng);
    const solution = board.map((row) => row.slice());
    const [minHoles, maxHoles] = targetRange;
    const puzzle = digHolesUnique(solution, rng, minHoles, maxHoles);
    if (!hasUniqueSolution(puzzle)) continue;

    const { difficulty: rated } = ratePuzzle(puzzle);
    const ratingScore = rated === difficulty ? 0 : rated === 'medium' ? 1 : 2;
    if (rated === difficulty) return { puzzle, solution };
    if (!bestAttempt || ratingScore < bestAttempt.score) {
      bestAttempt = { puzzle, solution, score: ratingScore };
    }
  }

  if (bestAttempt) return { puzzle: bestAttempt.puzzle, solution: bestAttempt.solution };

  const rng = createRNG(seed >>> 0);
  const boardFallback = Array(SIZE)
    .fill(0)
    .map(() => Array(SIZE).fill(0));
  solveBoard(boardFallback, 0, rng);
  return { puzzle: boardFallback, solution: boardFallback.map((row) => row.slice()) };
};

export const isValidPlacement = (
  board: number[][],
  r: number,
  c: number,
  val: number,
): boolean => {
  if (!isLegalMove(board, r, c, val)) return false;
  return wouldRemainSolvable(board, r, c, val);
};

const sudokuApi = {
  generateSudoku,
  getCandidates,
  isValidPlacement,
  isValid,
  isLegalMove,
  countSolutions,
  hasUniqueSolution,
  wouldRemainSolvable,
};
export default sudokuApi;
