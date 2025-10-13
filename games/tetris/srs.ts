import type { Tetromino } from './logic';

export type Orientation = 0 | 1 | 2 | 3;
export type BoardCell = Tetromino | 0;
export type Board = BoardCell[][];

export interface Position {
  x: number;
  y: number;
}

export interface ActivePiece {
  type: Tetromino;
  rotation: Orientation;
  shape: number[][];
  color: string;
}

const cloneMatrix = (matrix: number[][]): number[][] =>
  matrix.map((row) => [...row]);

type TetrominoStates = {
  color: string;
  states: number[][][];
};

const TETROMINO_DATA: Record<Tetromino, TetrominoStates> = {
  I: {
    color: '#06b6d4',
    states: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
      ],
      [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
      ],
    ],
  },
  J: {
    color: '#3b82f6',
    states: [
      [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 1],
        [0, 1, 0],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
    ],
  },
  L: {
    color: '#f97316',
    states: [
      [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [1, 0, 0],
      ],
      [
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
      ],
    ],
  },
  O: {
    color: '#eab308',
    states: [
      [
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1],
        [1, 1],
      ],
    ],
  },
  S: {
    color: '#22c55e',
    states: [
      [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 0, 0],
        [0, 1, 1],
        [1, 1, 0],
      ],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    ],
  },
  T: {
    color: '#a855f7',
    states: [
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    ],
  },
  Z: {
    color: '#ef4444',
    states: [
      [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [1, 0, 0],
      ],
    ],
  },
};

export const TETROMINO_COLORS: Record<Tetromino, string> = Object.fromEntries(
  Object.entries(TETROMINO_DATA).map(([type, data]) => [type, data.color]),
) as Record<Tetromino, string>;

type KickTable = Record<Orientation, Partial<Record<Orientation, Array<[number, number]>>>>;

const SRS_KICKS: Record<'JLSTZ' | 'I' | 'O', KickTable> = {
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
  O: {
    0: { 1: [[0, 0]], 3: [[0, 0]] },
    1: { 0: [[0, 0]], 2: [[0, 0]] },
    2: { 1: [[0, 0]], 3: [[0, 0]] },
    3: { 0: [[0, 0]], 2: [[0, 0]] },
  },
};

export const createEmptyBoard = (height = 20, width = 10): Board =>
  Array.from({ length: height }, () => Array<BoardCell>(width).fill(0));

export const getRotationState = (
  type: Tetromino,
  rotation: Orientation,
): number[][] => cloneMatrix(TETROMINO_DATA[type].states[rotation]);

export const createPiece = (type: Tetromino): ActivePiece => ({
  type,
  rotation: 0,
  shape: getRotationState(type, 0),
  color: TETROMINO_DATA[type].color,
});

export const canMove = (
  board: Board,
  shape: number[][],
  x: number,
  y: number,
): boolean => {
  const height = board.length;
  const width = board[0]?.length ?? 0;
  for (let r = 0; r < shape.length; r += 1) {
    for (let c = 0; c < shape[r].length; c += 1) {
      if (!shape[r][c]) continue;
      const nx = x + c;
      const ny = y + r;
      if (nx < 0 || nx >= width || ny >= height) {
        return false;
      }
      if (ny >= 0 && board[ny][nx]) {
        return false;
      }
    }
  }
  return true;
};

export const attemptRotation = (
  piece: ActivePiece,
  board: Board,
  position: Position,
  direction: 1 | -1 = 1,
): { piece: ActivePiece; position: Position } | null => {
  const nextRotation = ((piece.rotation + direction + 4) % 4) as Orientation;
  const rotated = getRotationState(piece.type, nextRotation);
  const key = piece.type === 'I' ? 'I' : piece.type === 'O' ? 'O' : 'JLSTZ';
  const kicks = SRS_KICKS[key][piece.rotation]?.[nextRotation] ?? [[0, 0]];
  for (const [dx, dy] of kicks) {
    const nx = position.x + dx;
    const ny = position.y + dy;
    if (canMove(board, rotated, nx, ny)) {
      return {
        piece: {
          ...piece,
          rotation: nextRotation,
          shape: rotated,
        },
        position: { x: nx, y: ny },
      };
    }
  }
  return null;
};

export const mergePiece = (
  board: Board,
  shape: number[][],
  x: number,
  y: number,
  type: Tetromino,
): Board => {
  const clone = board.map((row) => [...row]);
  for (let r = 0; r < shape.length; r += 1) {
    for (let c = 0; c < shape[r].length; c += 1) {
      if (shape[r][c]) {
        clone[y + r][x + c] = type;
      }
    }
  }
  return clone;
};

export const getGhostY = (
  board: Board,
  shape: number[][],
  x: number,
  y: number,
): number => {
  let dy = y;
  while (canMove(board, shape, x, dy + 1)) {
    dy += 1;
  }
  return dy;
};

export type {
  Tetromino,
};
