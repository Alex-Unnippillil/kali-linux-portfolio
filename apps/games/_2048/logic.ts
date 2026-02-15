import { random } from '../rng';

export let SIZE = 4;
export const setSize = (s: number) => {
  SIZE = s;
};

export type Board = number[][];
export type Direction = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

type Coord = { r: number; c: number };

export type TileMove = {
  from: Coord;
  to: Coord;
  value: number;
};

export type MergeTransition = {
  to: Coord;
  from: [Coord, Coord];
  valueBefore: number;
  valueAfter: number;
};

export type SpawnTransition = { at: Coord; value: number };

export type StepResult = {
  board: Board;
  changed: boolean;
  score: number;
  merges: MergeTransition[];
  movedTiles: TileMove[];
  spawns: SpawnTransition[];
};

export type MoveResult = { board: Board; score: number; merges: Array<[number, number]> };

export const cloneBoard = (b: Board): Board => b.map((row) => [...row]);

const emptyCells = (board: Board): Array<[number, number]> => {
  const empty: Array<[number, number]> = [];
  board.forEach((row, r) => row.forEach((cell, c) => {
    if (cell === 0) empty.push([r, c]);
  }));
  return empty;
};

export const addRandomTile = (board: Board, hard = false, count = 1) => {
  const spawns: SpawnTransition[] = [];
  for (let i = 0; i < count; i += 1) {
    const empty = emptyCells(board);
    if (empty.length === 0) break;
    const [r, c] = empty[Math.floor(random() * empty.length)];
    const value = hard ? 4 : random() < 0.9 ? 2 : 4;
    board[r][c] = value;
    spawns.push({ at: { r, c }, value });
  }
  return spawns;
};

type PackedTile = { value: number; source: Coord };

const reduceLineLeft = (line: number[], index: number, asRow: boolean) => {
  const packed: PackedTile[] = [];
  line.forEach((value, i) => {
    if (!value) return;
    packed.push({ value, source: asRow ? { r: index, c: i } : { r: i, c: index } });
  });

  const result = Array(SIZE).fill(0);
  const movedTiles: TileMove[] = [];
  const merges: MergeTransition[] = [];
  let score = 0;
  let target = 0;

  for (let i = 0; i < packed.length; i += 1) {
    const current = packed[i];
    const next = packed[i + 1];
    const to = asRow ? { r: index, c: target } : { r: target, c: index };

    if (next && current.value === next.value) {
      const nextTo = to;
      const doubled = current.value * 2;
      result[target] = doubled;
      score += doubled;
      merges.push({
        to: nextTo,
        from: [current.source, next.source],
        valueBefore: current.value,
        valueAfter: doubled,
      });
      movedTiles.push({ from: current.source, to: nextTo, value: current.value });
      movedTiles.push({ from: next.source, to: nextTo, value: next.value });
      i += 1;
    } else {
      result[target] = current.value;
      movedTiles.push({ from: current.source, to, value: current.value });
    }

    target += 1;
  }

  return { row: result, score, merges, movedTiles };
};

const stepWithoutSpawn = (board: Board, direction: Direction): Omit<StepResult, 'spawns'> => {
  let working = cloneBoard(board);
  let transformedBack: ((b: Board) => Board) | null = null;
  let asRow = true;

  if (direction === 'ArrowRight') {
    working = working.map((row) => [...row].reverse());
    transformedBack = (b) => b.map((row) => [...row].reverse());
  } else if (direction === 'ArrowUp') {
    working = transpose(working);
    transformedBack = (b) => transpose(b);
    asRow = false;
  } else if (direction === 'ArrowDown') {
    working = transpose(working).map((row) => [...row].reverse());
    transformedBack = (b) => transpose(b.map((row) => [...row].reverse()));
    asRow = false;
  }

  let score = 0;
  const merges: MergeTransition[] = [];
  const movedTiles: TileMove[] = [];

  const next = working.map((row, idx) => {
    const reduced = reduceLineLeft(row, idx, asRow);
    score += reduced.score;
    merges.push(...reduced.merges);
    movedTiles.push(...reduced.movedTiles);
    return reduced.row;
  });

  const normalizedBoard = transformedBack ? transformedBack(next) : next;
  const normalizedMerges = normalizeMerges(merges, direction);
  const normalizedMoves = normalizeMoves(movedTiles, direction);
  const changed = !boardsEqual(board, normalizedBoard);

  return { board: normalizedBoard, changed, score, merges: normalizedMerges, movedTiles: normalizedMoves };
};

const normalizeCoord = (coord: Coord, direction: Direction): Coord => {
  if (direction === 'ArrowRight') return { r: coord.r, c: SIZE - 1 - coord.c };
  if (direction === 'ArrowUp') return { r: coord.c, c: coord.r };
  if (direction === 'ArrowDown') return { r: SIZE - 1 - coord.c, c: coord.r };
  return coord;
};

const normalizeMerges = (merges: MergeTransition[], direction: Direction) => merges.map((merge) => ({
  ...merge,
  to: normalizeCoord(merge.to, direction),
  from: [normalizeCoord(merge.from[0], direction), normalizeCoord(merge.from[1], direction)] as [Coord, Coord],
}));

const normalizeMoves = (moves: TileMove[], direction: Direction) => moves.map((move) => ({
  ...move,
  from: normalizeCoord(move.from, direction),
  to: normalizeCoord(move.to, direction),
}));

export const step = (
  board: Board,
  direction: Direction,
  options: { hardMode?: boolean; spawnCount?: number } = {},
): StepResult => {
  const result = stepWithoutSpawn(board, direction);
  if (!result.changed) {
    return { ...result, spawns: [] };
  }

  const nextBoard = cloneBoard(result.board);
  const spawns = addRandomTile(nextBoard, Boolean(options.hardMode), options.spawnCount ?? (options.hardMode ? 2 : 1));
  return {
    ...result,
    board: nextBoard,
    spawns,
  };
};

export const transpose = (board: Board) => board[0].map((_, c) => board.map((row) => row[c]));

export const slide = (row: number[]) => {
  const reduced = reduceLineLeft(row, 0, true);
  return { row: reduced.row, score: reduced.score, merges: reduced.merges.map((m) => m.to.c) };
};

export const moveLeft = (board: Board): MoveResult => {
  const result = stepWithoutSpawn(board, 'ArrowLeft');
  return { board: result.board, score: result.score, merges: result.merges.map((m) => [m.to.r, m.to.c]) };
};

export const moveRight = (board: Board): MoveResult => {
  const result = stepWithoutSpawn(board, 'ArrowRight');
  return { board: result.board, score: result.score, merges: result.merges.map((m) => [m.to.r, m.to.c]) };
};

export const moveUp = (board: Board): MoveResult => {
  const result = stepWithoutSpawn(board, 'ArrowUp');
  return { board: result.board, score: result.score, merges: result.merges.map((m) => [m.to.r, m.to.c]) };
};

export const moveDown = (board: Board): MoveResult => {
  const result = stepWithoutSpawn(board, 'ArrowDown');
  return { board: result.board, score: result.score, merges: result.merges.map((m) => [m.to.r, m.to.c]) };
};

export const boardsEqual = (a: Board, b: Board) => a.every((row, r) => row.every((cell, c) => cell === b[r][c]));

export const canMove = (board: Board) => {
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === 0) return true;
      if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
};

export const getHighestTile = (board: Board) => Math.max(...board.flat());
