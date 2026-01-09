export type Tetromino = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type RandomMode = 'seven-bag' | 'true-random';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

const SRS_PIECES: Record<
  Tetromino,
  { size: 3 | 4; rotations: Record<0 | 1 | 2 | 3, Array<[number, number]>> }
> = {
  T: {
    size: 3,
    rotations: {
      0: [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      1: [
        [1, 0],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      2: [
        [0, 1],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      3: [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, 2],
      ],
    },
  },
  J: {
    size: 3,
    rotations: {
      0: [
        [0, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      1: [
        [1, 0],
        [2, 0],
        [1, 1],
        [1, 2],
      ],
      2: [
        [0, 1],
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      3: [
        [1, 0],
        [1, 1],
        [0, 2],
        [1, 2],
      ],
    },
  },
  L: {
    size: 3,
    rotations: {
      0: [
        [2, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      1: [
        [1, 0],
        [1, 1],
        [1, 2],
        [2, 2],
      ],
      2: [
        [0, 1],
        [1, 1],
        [2, 1],
        [0, 2],
      ],
      3: [
        [0, 0],
        [1, 0],
        [1, 1],
        [1, 2],
      ],
    },
  },
  S: {
    size: 3,
    rotations: {
      0: [
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1],
      ],
      1: [
        [1, 0],
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      2: [
        [1, 1],
        [2, 1],
        [0, 2],
        [1, 2],
      ],
      3: [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 2],
      ],
    },
  },
  Z: {
    size: 3,
    rotations: {
      0: [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 1],
      ],
      1: [
        [2, 0],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      2: [
        [0, 1],
        [1, 1],
        [1, 2],
        [2, 2],
      ],
      3: [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
      ],
    },
  },
  I: {
    size: 4,
    rotations: {
      0: [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      1: [
        [2, 0],
        [2, 1],
        [2, 2],
        [2, 3],
      ],
      2: [
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 2],
      ],
      3: [
        [1, 0],
        [1, 1],
        [1, 2],
        [1, 3],
      ],
    },
  },
  O: {
    size: 4,
    rotations: {
      0: [
        [1, 1],
        [2, 1],
        [1, 2],
        [2, 2],
      ],
      1: [
        [1, 1],
        [2, 1],
        [1, 2],
        [2, 2],
      ],
      2: [
        [1, 1],
        [2, 1],
        [1, 2],
        [2, 2],
      ],
      3: [
        [1, 1],
        [2, 1],
        [1, 2],
        [2, 2],
      ],
    },
  },
};

export const SRS_KICKS = {
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
        [2, 0],
        [-1, 0],
        [2, 1],
        [-1, -2],
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
  O: {},
} as const;

export type Board = (Tetromino | 0)[][];
export type Rotation = 0 | 1 | 2 | 3;
export interface PieceState {
  type: Tetromino;
  rotation: Rotation;
  x: number;
  y: number;
}

export const getCells = (type: Tetromino, rotation: Rotation): Array<[number, number]> =>
  SRS_PIECES[type].rotations[rotation].map(([x, y]) => [x, y]);

export const getGridSize = (type: Tetromino): number => SRS_PIECES[type].size;

export const createEmptyBoard = (width = BOARD_WIDTH, height = BOARD_HEIGHT): Board =>
  Array.from({ length: height }, () => Array(width).fill(0));

export const collides = (
  board: Board,
  piece: PieceState,
  x: number,
  y: number,
  rotation: Rotation = piece.rotation,
  width = BOARD_WIDTH,
  height = BOARD_HEIGHT,
): boolean => {
  const cells = getCells(piece.type, rotation);
  for (const [cx, cy] of cells) {
    const nx = x + cx;
    const ny = y + cy;
    if (nx < 0 || nx >= width || ny >= height) return true;
    if (ny >= 0 && board[ny][nx]) return true;
  }
  return false;
};

export const lockPiece = (
  board: Board,
  piece: PieceState,
  width = BOARD_WIDTH,
  height = BOARD_HEIGHT,
): { board: Board; gameOver: boolean } => {
  const next = board.map((row) => row.slice()) as Board;
  let gameOver = false;
  let touchedNegative = false;
  const cells = getCells(piece.type, piece.rotation);
  for (const [cx, cy] of cells) {
    const nx = piece.x + cx;
    const ny = piece.y + cy;
    if (ny < 0) {
      touchedNegative = true;
      continue;
    }
    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
      next[ny][nx] = piece.type;
    }
  }
  return { board: next, gameOver: gameOver || touchedNegative };
};

export const clearLines = (
  board: Board,
  width = BOARD_WIDTH,
  height = BOARD_HEIGHT,
): { board: Board; cleared: number[] } => {
  const cleared: number[] = [];
  const remaining: Board = [];
  for (let y = 0; y < board.length; y += 1) {
    if (board[y].every((c) => c)) {
      cleared.push(y);
    } else {
      remaining.push(board[y]);
    }
  }
  while (remaining.length < height) {
    remaining.unshift(Array(width).fill(0));
  }
  return { board: remaining, cleared };
};

export const attemptRotation = (
  board: Board,
  piece: PieceState,
  delta: 1 | -1,
): { piece: PieceState; success: boolean; kickIndex: number } => {
  const from = piece.rotation;
  let to: Rotation = ((from + delta + 4) % 4) as Rotation;
  const system = piece.type === 'O' ? null : SRS_KICKS[piece.type === 'I' ? 'I' : 'JLSTZ'];
  const kicks = system?.[from]?.[to] || [[0, 0]];
  const targetCells = getCells(piece.type, to);
  for (let i = 0; i < kicks.length; i += 1) {
    const [dx, dy] = kicks[i];
    const nx = piece.x + dx;
    const ny = piece.y + dy;
    let hit = false;
    for (const [cx, cy] of targetCells) {
      const px = nx + cx;
      const py = ny + cy;
      if (px < 0 || px >= BOARD_WIDTH || py >= BOARD_HEIGHT) {
        hit = true;
        break;
      }
      if (py >= 0 && board[py][px]) {
        hit = true;
        break;
      }
    }
    if (!hit) {
      return {
        piece: { ...piece, rotation: to, x: nx, y: ny },
        success: true,
        kickIndex: i,
      };
    }
  }
  return { piece, success: false, kickIndex: -1 };
};

export const isGrounded = (board: Board, piece: PieceState): boolean =>
  collides(board, piece, piece.x, piece.y + 1, piece.rotation);

export const detectTSpin = (
  board: Board,
  piece: PieceState,
  lastMove: 'rotate' | 'move' | null,
): boolean => {
  if (piece.type !== 'T' || lastMove !== 'rotate') return false;
  const size = getGridSize(piece.type);
  const corners: Array<[number, number]> = [
    [piece.x, piece.y],
    [piece.x + size - 1, piece.y],
    [piece.x, piece.y + size - 1],
    [piece.x + size - 1, piece.y + size - 1],
  ];
  let filled = 0;
  corners.forEach(([cx, cy]) => {
    if (cy < 0 || cy >= BOARD_HEIGHT || cx < 0 || cx >= BOARD_WIDTH || board[cy][cx]) {
      filled += 1;
    }
  });
  return filled >= 3;
};

const PIECES: Tetromino[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

const mulberry32 = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export class PieceGenerator {
  private bag: Tetromino[] = [];
  private mode: RandomMode;
  private rand: () => number;
  private seed: number;

  constructor(mode: RandomMode = 'seven-bag', seed: number = Date.now() >>> 0) {
    this.mode = mode;
    this.seed = seed >>> 0;
    this.rand = mulberry32(this.seed);
  }

  setMode(mode: RandomMode) {
    this.mode = mode;
    if (mode === 'seven-bag') {
      this.bag = [];
    }
  }

  setSeed(seed: number) {
    this.seed = seed >>> 0;
    this.rand = mulberry32(this.seed);
    this.bag = [];
  }

  getSeed() {
    return this.seed;
  }

  private shuffle(arr: Tetromino[]): Tetromino[] {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  next(): Tetromino {
    if (this.mode === 'seven-bag') {
      if (this.bag.length === 0) {
        this.bag = this.shuffle([...PIECES]);
      }
      return this.bag.pop()!;
    }
    return PIECES[Math.floor(this.rand() * PIECES.length)];
  }
}
