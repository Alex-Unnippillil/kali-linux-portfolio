import { createRng } from '../rng';

export type Board = number[][];
export type Direction = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export type GameState = {
  size: number;
  board: Board;
  score: number;
  won: boolean;
  over: boolean;
  keepPlaying: boolean;
  rng: string;
};

export type MoveOutcome = {
  next: GameState;
  moved: boolean;
  gained: number;
  merges: Array<[number, number]>;
};

export type ProcessLineResult = { out: number[]; gained: number; mergeIdx: number[] };

export const createEmptyBoard = (size: number): Board =>
  Array.from({ length: size }, () => Array(size).fill(0));

export const cloneBoard = (b: Board): Board => b.map((row) => [...row]);

export const boardsEqual = (a: Board, b: Board) =>
  a.length === b.length && a.every((row, r) => row.every((cell, c) => cell === b[r][c]));

export const processLine = (line: number[]): ProcessLineResult => {
  const size = line.length;
  const filtered = line.filter((n) => n !== 0);
  const out: number[] = [];
  const mergeIdx: number[] = [];
  let gained = 0;

  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2;
      out.push(val);
      gained += val;
      mergeIdx.push(out.length - 1);
      i++;
    } else {
      out.push(filtered[i]);
    }
  }

  while (out.length < size) out.push(0);

  return { out, gained, mergeIdx };
};

const moveRowLeft = (
  row: number[],
): { row: number[]; gained: number; mergeIdx: number[] } => {
  const { out, gained, mergeIdx } = processLine(row);
  return { row: out, gained, mergeIdx };
};

export type MoveResult = {
  board: Board;
  gained: number;
  merges: Array<[number, number]>;
  moved: boolean;
};

export const moveBoard = (board: Board, direction: Direction): MoveResult => {
  const size = board.length;
  let gained = 0;
  const merges: Array<[number, number]> = [];
  const next = createEmptyBoard(size);

  if (direction === 'ArrowLeft' || direction === 'ArrowRight') {
    board.forEach((row, r) => {
      const working = direction === 'ArrowLeft' ? row : [...row].reverse();
      const { row: out, gained: g, mergeIdx } = moveRowLeft(working);
      gained += g;
      merges.push(
        ...mergeIdx.map((c) => (direction === 'ArrowLeft' ? [r, c] : [r, size - 1 - c])),
      );
      next[r] = direction === 'ArrowLeft' ? out : [...out].reverse();
    });
  } else {
    for (let c = 0; c < size; c++) {
      const column = board.map((row) => row[c]);
      if (direction === 'ArrowUp') {
        const { row: out, gained: g, mergeIdx } = moveRowLeft(column);
        gained += g;
        merges.push(...mergeIdx.map((idx) => [idx, c] as [number, number]));
        out.forEach((val, r) => {
          next[r][c] = val;
        });
      } else {
        const { row: out, gained: g, mergeIdx } = moveRowLeft([...column].reverse());
        gained += g;
        merges.push(...mergeIdx.map((idx) => [size - 1 - idx, c] as [number, number]));
        out.forEach((val, r) => {
          next[size - 1 - r][c] = val;
        });
      }
    }
  }

  const moved = !boardsEqual(board, next);
  return { board: next, gained, merges, moved };
};

export const hasLegalMove = (board: Board): boolean => {
  const size = board.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 0) return true;
      if (c < size - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < size - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
};

export const spawnTile = (board: Board, rngRandom: () => number): Board => {
  const empty: Array<[number, number]> = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    }),
  );
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(rngRandom() * empty.length)];
  const value = rngRandom() < 0.9 ? 2 : 4;
  const next = cloneBoard(board);
  next[r][c] = value;
  return next;
};

export const createInitialState = (size = 4, seed?: string): GameState => {
  const rng = createRng(undefined, seed);
  let board = createEmptyBoard(size);
  board = spawnTile(board, rng.random);
  board = spawnTile(board, rng.random);
  return {
    size,
    board,
    score: 0,
    won: false,
    over: false,
    keepPlaying: false,
    rng: rng.serialize(),
  };
};

export const applyMove = (state: GameState, direction: Direction): MoveOutcome => {
  if (state.over || (state.won && !state.keepPlaying)) {
    return { moved: false, next: state, gained: 0, merges: [] };
  }

  if (!hasLegalMove(state.board)) {
    const next: GameState = { ...state, over: true };
    return { moved: false, next, gained: 0, merges: [] };
  }

  const moveResult = moveBoard(state.board, direction);
  if (!moveResult.moved) return { moved: false, next: state, gained: 0, merges: [] };

  const rng = createRng(state.rng);
  const spawnedBoard = spawnTile(moveResult.board, rng.random);
  const score = state.score + moveResult.gained;
  const won = state.won || spawnedBoard.some((row) => row.some((cell) => cell >= 2048));
  const over = !hasLegalMove(spawnedBoard);
  const next: GameState = {
    ...state,
    board: spawnedBoard,
    score,
    won,
    over,
    rng: rng.serialize(),
  };

  return { moved: true, next, gained: moveResult.gained, merges: moveResult.merges };
};

export const highestTile = (board: Board) => Math.max(...board.flat());
