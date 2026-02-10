import type { Rotation, Tetromino } from './types';

export const BOARD_WIDTH = 10;
export const VISIBLE_HEIGHT = 20;
export const TOTAL_HEIGHT = 40;
export const HIDDEN_ROWS = TOTAL_HEIGHT - VISIBLE_HEIGHT;

export const SPAWN_X = 3;
export const SPAWN_Y = -2;

const rotateMatrixCW = (matrix: number[][]) =>
  matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());

const buildRotations = (matrix: number[][], count = 4) => {
  const rotations: number[][][] = [matrix];
  for (let i = 1; i < count; i += 1) {
    rotations.push(rotateMatrixCW(rotations[i - 1]));
  }
  return rotations;
};

const matrixToCells = (matrix: number[][]) => {
  const cells: Array<[number, number]> = [];
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) cells.push([x, y]);
    });
  });
  return cells;
};

const BASE_SHAPES: Record<Tetromino, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

export const TETROMINO_COLORS: Record<Tetromino, string> = {
  I: '#06b6d4',
  J: '#3b82f6',
  L: '#f97316',
  O: '#eab308',
  S: '#22c55e',
  T: '#a855f7',
  Z: '#ef4444',
};

export const TETROMINO_COLORBLIND: Record<Tetromino, string> = {
  I: '#22d3ee',
  J: '#60a5fa',
  L: '#fb923c',
  O: '#fde047',
  S: '#4ade80',
  T: '#c084fc',
  Z: '#f87171',
};

const ROTATIONS: Record<Tetromino, Array<Array<[number, number]>>> = {
  I: buildRotations(BASE_SHAPES.I, 4).map(matrixToCells),
  J: buildRotations(BASE_SHAPES.J, 4).map(matrixToCells),
  L: buildRotations(BASE_SHAPES.L, 4).map(matrixToCells),
  O: buildRotations(BASE_SHAPES.O, 4).map(matrixToCells),
  S: buildRotations(BASE_SHAPES.S, 4).map(matrixToCells),
  T: buildRotations(BASE_SHAPES.T, 4).map(matrixToCells),
  Z: buildRotations(BASE_SHAPES.Z, 4).map(matrixToCells),
};

export const getPieceCells = (type: Tetromino, rotation: Rotation) => ROTATIONS[type][rotation];

const JLSTZ_KICKS: Record<Rotation, Partial<Record<Rotation, Array<[number, number]>>>> = {
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
};

const I_KICKS: Record<Rotation, Partial<Record<Rotation, Array<[number, number]>>>> = {
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

export const getKickOffsets = (type: Tetromino, from: Rotation, to: Rotation) => {
  if (type === 'O') return [[0, 0]];
  const table = type === 'I' ? I_KICKS : JLSTZ_KICKS;
  return table[from]?.[to] ?? [[0, 0]];
};

export const isInsideBoard = (x: number, y: number) => x >= 0 && x < BOARD_WIDTH && y < TOTAL_HEIGHT;

export const toRotation = (rotation: number): Rotation => {
  const normalized = ((rotation % 4) + 4) % 4;
  return normalized as Rotation;
};
