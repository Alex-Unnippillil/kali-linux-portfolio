export type Cell = number;
export type Board = Cell[][];

export const COLS = 10;
export const ROWS = 20;
export const CELL_SIZE = 24;

export type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface Piece {
  type: PieceType;
  rotation: number; // 0-3
  x: number;
  y: number;
  shape: number[][];
}

const SHAPES: Record<PieceType, number[][][]> = {
  I: [
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
  J: [
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
  L: [
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
  O: [
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
  S: [
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
  T: [
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
  Z: [
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
};

// Super Rotation System (SRS) kick data
// Source: Tetris Guideline
const JLSTZ_KICKS: Record<number, Record<number, [number, number][]>> = {
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
      [1, 1],
      [0, -2],
      [1, -2],
    ],
  },
  2: {
    1: [
      [0, 0],
      [-1, 0],
      [-1, -1],
      [0, 2],
      [-1, 2],
    ],
    3: [
      [0, 0],
      [1, 0],
      [1, -1],
      [0, 2],
      [1, 2],
    ],
  },
  3: {
    2: [
      [0, 0],
      [-1, 0],
      [-1, 1],
      [0, -2],
      [-1, -2],
    ],
    0: [
      [0, 0],
      [-1, 0],
      [-1, 1],
      [0, -2],
      [-1, -2],
    ],
  },
};

const I_KICKS: Record<number, Record<number, [number, number][]>> = {
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
};

// O piece has a simple kick which keeps it in place
const O_KICKS: Record<number, Record<number, [number, number][]>> = {
  0: { 1: [[0, 0]], 3: [[0, 0]] },
  1: { 0: [[0, 0]], 2: [[0, 0]] },
  2: { 1: [[0, 0]], 3: [[0, 0]] },
  3: { 2: [[0, 0]], 0: [[0, 0]] },
};

const LOCK_DELAY = 30; // frames

function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function rotateMatrix(matrix: number[][]): number[][] {
  const size = matrix.length;
  const res = Array.from({ length: size }, () => Array(size).fill(0));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      res[x][size - 1 - y] = matrix[y][x];
    }
  }
  return res;
}

function clonePiece(p: Piece): Piece {
  return { ...p, shape: p.shape.map((row) => [...row]) };
}

function generateBag(): PieceType[] {
  const bag: PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export interface GameState {
  board: Board;
  queue: PieceType[];
  hold: PieceType | null;
  canHold: boolean;
  current: Piece;
  lastMoveRotation: boolean;
  lockCounter: number;
}

export function createGame(): GameState {
  const queue = [...generateBag()];
  return {
    board: createEmptyBoard(),
    queue,
    hold: null,
    canHold: true,
    current: spawnPiece(queue),
    lastMoveRotation: false,
    lockCounter: 0,
  };
}

export function createPiece(type: PieceType): Piece {
  const shape = SHAPES[type][0].map((row) => [...row]);
  return { type, rotation: 0, x: 3, y: 0, shape };
}

function spawnPiece(queue: PieceType[]): Piece {
  if (queue.length < 7) {
    queue.push(...generateBag());
  }
  const type = queue.shift() as PieceType;
  return createPiece(type);
}

export function hold(state: GameState) {
  if (!state.canHold) return;
  const current = state.current;
  if (state.hold) {
    const swap = state.hold;
    state.hold = current.type;
    state.current = createPiece(swap);
  } else {
    state.hold = current.type;
    state.current = spawnPiece(state.queue);
  }
  state.canHold = false;
  state.lockCounter = 0;
}

function collision(state: GameState, piece: Piece): boolean {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (!piece.shape[y][x]) continue;
      const px = piece.x + x;
      const py = piece.y + y;
      if (px < 0 || px >= COLS || py >= ROWS) return true;
      if (py >= 0 && state.board[py][px]) return true;
    }
  }
  return false;
}

export function move(state: GameState, dx: number, dy: number): boolean {
  const piece = clonePiece(state.current);
  piece.x += dx;
  piece.y += dy;
  if (!collision(state, piece)) {
    state.current = piece;
    state.lastMoveRotation = false;
    state.lockCounter = 0;
    return true;
  }
  return false;
}

export function rotate(state: GameState, dir: number): boolean {
  const from = state.current.rotation;
  const to = (from + dir + 4) % 4;
  const piece = clonePiece(state.current);
  let shape = piece.shape;
  if (dir > 0) shape = rotateMatrix(shape);
  else shape = rotateMatrix(rotateMatrix(rotateMatrix(shape)));
  piece.shape = shape;
  piece.rotation = to;

  const kicks: [number, number][] = (() => {
    if (piece.type === 'O') return O_KICKS[from][to];
    if (piece.type === 'I') return I_KICKS[from][to] || [[0, 0]];
    return JLSTZ_KICKS[from][to];
  })();

  for (const [dx, dy] of kicks) {
    piece.x = state.current.x + dx;
    piece.y = state.current.y + dy;
    if (!collision(state, piece)) {
      state.current = piece;
      state.lastMoveRotation = true;
      state.lockCounter = 0;
      return true;
    }
  }
  return false;
}

export function hardDrop(state: GameState) {
  while (move(state, 0, 1));
  lock(state);
}

function merge(state: GameState) {
  const { current, board } = state;
  for (let y = 0; y < current.shape.length; y++) {
    for (let x = 0; x < current.shape[y].length; x++) {
      if (current.shape[y][x]) {
        const px = current.x + x;
        const py = current.y + y;
        if (py >= 0) board[py][px] = colorOf(current.type);
      }
    }
  }
}

function colorOf(type: PieceType): number {
  return (
    {
      I: 1,
      J: 2,
      L: 3,
      O: 4,
      S: 5,
      T: 6,
      Z: 7,
    }[type] || 0
  );
}

function clearLines(state: GameState): number {
  let lines = 0;
  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (!state.board[y][x]) continue outer;
    }
    state.board.splice(y, 1);
    state.board.unshift(Array(COLS).fill(0));
    lines++;
    y++;
  }
  return lines;
}

function tSpinCheck(state: GameState, linesCleared: number): boolean {
  const { lastMoveRotation, current } = state;
  if (!lastMoveRotation || current.type !== 'T') return false;
  const corners = [
    [current.x, current.y],
    [current.x + 2, current.y],
    [current.x, current.y + 2],
    [current.x + 2, current.y + 2],
  ];
  let filled = 0;
  for (const [cx, cy] of corners) {
    if (cy < 0 || cx < 0 || cx >= COLS || cy >= ROWS) {
      filled++;
      continue;
    }
    if (state.board[cy][cx]) filled++;
  }
  return filled >= 3 && linesCleared > 0;
}

export function lock(state: GameState) {
  merge(state);
  const lines = clearLines(state);
  const tSpin = tSpinCheck(state, lines);
  state.current = spawnPiece(state.queue);
  state.canHold = true;
  state.lastMoveRotation = false;
  state.lockCounter = 0;
  return { lines, tSpin };
}

export function addGarbage(state: GameState, lines: number) {
  for (let i = 0; i < lines; i++) {
    state.board.shift();
    const hole = Math.floor(Math.random() * COLS);
    const row = Array(COLS).fill(8);
    row[hole] = 0;
    state.board.push(row);
  }
  state.current.y -= lines;
  if (collision(state, state.current)) {
    // game over
    state.board = createEmptyBoard();
  }
}

export function softDrop(state: GameState): boolean {
  return move(state, 0, 1);
}

export function step(state: GameState): { lines: number; tSpin: boolean } | null {
  if (move(state, 0, 1)) return null;
  state.lockCounter++;
  if (state.lockCounter >= LOCK_DELAY) {
    return lock(state);
  }
  return null;
}

export function cloneState(state: GameState): GameState {
  return {
    board: state.board.map((row) => [...row]),
    queue: [...state.queue],
    hold: state.hold,
    canHold: state.canHold,
    current: clonePiece(state.current),
    lastMoveRotation: state.lastMoveRotation,
    lockCounter: state.lockCounter,
  };
}
