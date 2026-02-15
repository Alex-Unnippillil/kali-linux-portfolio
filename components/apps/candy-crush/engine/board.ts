import type { Board, Candy, Color, Coord, LevelDefinition } from './types';
import { createRng } from './rng';
import { detectMatches, hasAnyLegalMove } from './match';

let candyId = 0;

const makeCandy = (color: Color): Candy => ({
  id: `cc-${++candyId}`,
  color,
  kind: 'normal',
});

const weightPick = (colors: Color[], weights: Partial<Record<Color, number>>, rand: () => number): Color => {
  const total = colors.reduce((sum, color) => sum + (weights[color] ?? 1), 0);
  const target = rand() * total;
  let acc = 0;
  for (const color of colors) {
    acc += weights[color] ?? 1;
    if (target <= acc) return color;
  }
  return colors[colors.length - 1];
};

export const emptyBoard = (rows: number, cols: number): Board => ({
  rows,
  cols,
  cells: Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ coord: { r, c }, candy: null, jelly: 0, ice: 0, hole: false })),
  ),
});

const inMask = (coord: Coord, mask?: Coord[]) => !mask || mask.some((m) => m.r === coord.r && m.c === coord.c);

export const applyLevelBlockers = (board: Board, level: LevelDefinition): Board => {
  const copy = cloneBoard(board);
  for (let r = 0; r < copy.rows; r += 1) {
    for (let c = 0; c < copy.cols; c += 1) {
      if (!inMask({ r, c }, level.mask)) {
        copy.cells[r][c].hole = true;
        copy.cells[r][c].candy = null;
      }
    }
  }
  level.blockers?.jelly?.forEach(({ r, c }) => {
    if (copy.cells[r]?.[c] && !copy.cells[r][c].hole) copy.cells[r][c].jelly = 1;
  });
  level.blockers?.doubleJelly?.forEach(({ r, c }) => {
    if (copy.cells[r]?.[c] && !copy.cells[r][c].hole) copy.cells[r][c].jelly = 2;
  });
  level.blockers?.ice?.forEach(({ r, c }) => {
    if (copy.cells[r]?.[c] && !copy.cells[r][c].hole) copy.cells[r][c].ice = 1;
  });
  level.blockers?.doubleIce?.forEach(({ r, c }) => {
    if (copy.cells[r]?.[c] && !copy.cells[r][c].hole) copy.cells[r][c].ice = 2;
  });
  return copy;
};

export const cloneBoard = (board: Board): Board => ({
  ...board,
  cells: board.cells.map((row) => row.map((cell) => ({ ...cell, coord: { ...cell.coord }, candy: cell.candy ? { ...cell.candy } : null }))),
});

export const createInitialBoard = (level: LevelDefinition, seed = Date.now()): { board: Board; rngState: number } => {
  const rng = createRng(seed);
  let board = applyLevelBlockers(emptyBoard(level.rows, level.cols), level);
  const attempts = 100;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    board = applyLevelBlockers(emptyBoard(level.rows, level.cols), level);
    for (let r = 0; r < board.rows; r += 1) {
      for (let c = 0; c < board.cols; c += 1) {
        const cell = board.cells[r][c];
        if (cell.hole || cell.ice > 0) {
          cell.candy = null;
          continue;
        }
        cell.candy = makeCandy(weightPick(level.colors, level.spawnWeights ?? {}, rng.next));
      }
    }
    if (detectMatches(board).length === 0 && hasAnyLegalMove(board)) break;
  }
  return { board, rngState: rng.state() };
};

export const isAdjacent = (a: Coord, b: Coord) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

export const canOccupy = (board: Board, coord: Coord) => {
  const cell = board.cells[coord.r]?.[coord.c];
  return Boolean(cell && !cell.hole && cell.ice === 0);
};
