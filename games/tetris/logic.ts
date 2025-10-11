export type Tetromino = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type RandomMode = 'seven-bag' | 'true-random';

export const WIDTH = 10;
export const HEIGHT = 20;

export const TETROMINOS: Record<
  Tetromino,
  { shape: number[][]; color: string }
> = {
  I: { shape: [[1, 1, 1, 1]], color: '#06b6d4' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' },
  O: { shape: [[1, 1], [1, 1]], color: '#eab308' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' },
};

const PIECES: Tetromino[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

const shuffle = (arr: Tetromino[]): Tetromino[] => {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export type Cell = 0 | Tetromino;
export type Board = Cell[][];

export interface ActivePiece {
  shape: number[][];
  color: string;
  type: Tetromino;
  rotation: number;
}

export const createBoard = (): Board =>
  Array.from({ length: HEIGHT }, () => Array<Cell>(WIDTH).fill(0));

export const rotateMatrix = (matrix: number[][]): number[][] =>
  matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());

export const createPiece = (type: Tetromino): ActivePiece => ({
  shape: TETROMINOS[type].shape.map((r) => [...r]),
  color: TETROMINOS[type].color,
  type,
  rotation: 0,
});

export const KICKS: Record<
  'JLSTZ' | 'I',
  Record<number, Record<number, [number, number][]>>
> = {
  JLSTZ: {
    0: {
      1: [
        [0, 0],
        [-1, 0],
        [-1, 1],
        [0, -2],
        [-1, -2],
      ],
      3: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, -2],
        [1, -2],
      ],
    },
    1: {
      0: [
        [0, 0],
        [1, 0],
        [1, -1],
        [0, 2],
        [1, 2],
      ],
      2: [
        [0, 0],
        [1, 0],
        [1, -1],
        [0, 2],
        [1, 2],
      ],
    },
    2: {
      1: [
        [0, 0],
        [-1, 0],
        [-1, 1],
        [0, -2],
        [-1, -2],
      ],
      3: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, -2],
        [1, -2],
      ],
    },
    3: {
      2: [
        [0, 0],
        [-1, 0],
        [-1, -1],
        [0, 2],
        [-1, 2],
      ],
      0: [
        [0, 0],
        [-1, 0],
        [-1, -1],
        [0, 2],
        [-1, 2],
      ],
    },
  },
  I: {
    0: {
      1: [
        [0, 0],
        [-2, 0],
        [1, 0],
        [-2, -1],
        [1, 2],
      ],
      3: [
        [0, 0],
        [-1, 0],
        [2, 0],
        [-1, 2],
        [2, -1],
      ],
    },
    1: {
      0: [
        [0, 0],
        [2, 0],
        [-1, 0],
        [2, 1],
        [-1, -2],
      ],
      2: [
        [0, 0],
        [-1, 0],
        [2, 0],
        [-1, 2],
        [2, -1],
      ],
    },
    2: {
      1: [
        [0, 0],
        [1, 0],
        [-2, 0],
        [1, -2],
        [-2, 1],
      ],
      3: [
        [0, 0],
        [2, 0],
        [-1, 0],
        [2, 1],
        [-1, -2],
      ],
    },
    3: {
      2: [
        [0, 0],
        [-2, 0],
        [1, 0],
        [-2, -1],
        [1, 2],
      ],
      0: [
        [0, 0],
        [1, 0],
        [-2, 0],
        [1, -2],
        [-2, 1],
      ],
    },
  },
};

export const canMove = (
  board: Board,
  shape: number[][],
  x: number,
  y: number,
): boolean => {
  for (let r = 0; r < shape.length; r += 1) {
    for (let c = 0; c < shape[r].length; c += 1) {
      if (!shape[r][c]) continue;
      const nx = x + c;
      const ny = y + r;
      if (nx < 0 || nx >= WIDTH || ny >= HEIGHT) return false;
      if (ny >= 0 && board[ny][nx]) return false;
    }
  }
  return true;
};

export const merge = (
  board: Board,
  shape: number[][],
  x: number,
  y: number,
  type: Tetromino,
): Board => {
  const newBoard = board.map((row) => [...row]);
  for (let r = 0; r < shape.length; r += 1) {
    for (let c = 0; c < shape[r].length; c += 1) {
      if (shape[r][c]) newBoard[y + r][x + c] = type;
    }
  }
  return newBoard;
};

export interface TetrisProgress {
  highScore: number;
  maxLevel: number;
  bestSprint: number | null;
}

export const DEFAULT_PROGRESS: TetrisProgress = {
  highScore: 0,
  maxLevel: 1,
  bestSprint: null,
};

export const isValidProgress = (value: unknown): value is TetrisProgress => {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.highScore === 'number' &&
    Number.isFinite(data.highScore) &&
    typeof data.maxLevel === 'number' &&
    Number.isFinite(data.maxLevel) &&
    (data.bestSprint === null ||
      (typeof data.bestSprint === 'number' && Number.isFinite(data.bestSprint)))
  );
};

export const loadLegacyProgress = (
  getItem: (key: string) => string | null,
): Partial<TetrisProgress> => {
  const parseNumber = (raw: string | null): number | undefined => {
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'number' && Number.isFinite(parsed)
        ? parsed
        : undefined;
    } catch {
      return undefined;
    }
  };

  const parseNullableNumber = (
    raw: string | null,
  ): number | null | undefined => {
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null) return null;
      return typeof parsed === 'number' && Number.isFinite(parsed)
        ? parsed
        : undefined;
    } catch {
      return undefined;
    }
  };

  const highScore = parseNumber(getItem('tetris-high-score'));
  const maxLevel = parseNumber(getItem('tetris-max-level'));
  const bestSprint = parseNullableNumber(getItem('tetris-best-time'));

  const legacy: Partial<TetrisProgress> = {};
  if (highScore !== undefined) legacy.highScore = highScore;
  if (maxLevel !== undefined) legacy.maxLevel = maxLevel;
  if (bestSprint !== undefined) legacy.bestSprint = bestSprint;
  return legacy;
};

export class PieceGenerator {
  private bag: Tetromino[] = [];

  private mode: RandomMode;

  constructor(mode: RandomMode = 'seven-bag') {
    this.mode = mode;
  }

  setMode(mode: RandomMode) {
    this.mode = mode;
    if (mode === 'seven-bag') {
      this.bag = [];
    }
  }

  next(): Tetromino {
    if (this.mode === 'seven-bag') {
      if (this.bag.length === 0) {
        this.bag = shuffle([...PIECES]);
      }
      return this.bag.pop()!;
    }
    return PIECES[Math.floor(Math.random() * PIECES.length)];
  }
}
