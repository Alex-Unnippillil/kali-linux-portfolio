export type Direction = 'up' | 'down' | 'left' | 'right';

export type Board = number[];

export interface HistoryEntry {
  board: Board;
  score: number;
  move: Direction | null;
}

export interface GameState {
  board: Board;
  score: number;
  history: HistoryEntry[];
  future: HistoryEntry[];
}

export const createRng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};

export const spawnTile = (board: Board, rng: () => number): Board => {
  const empty: number[] = [];
  board.forEach((v, i) => v === 0 && empty.push(i));
  if (empty.length === 0) return board.slice();
  const idx = empty[Math.floor(rng() * empty.length)];
  const value = rng() < 0.9 ? 2 : 4;
  const newBoard = board.slice();
  newBoard[idx] = value;
  return newBoard;
};

const slide = (line: number[]): { line: number[]; gained: number } => {
  const arr = line.filter((n) => n !== 0);
  const res: number[] = [];
  let gained = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === arr[i + 1]) {
      const merged = arr[i] * 2;
      gained += merged;
      res.push(merged);
      i++;
    } else {
      res.push(arr[i]);
    }
  }
  while (res.length < line.length) res.push(0);
  return { line: res, gained };
};

const rotate = (board: Board): Board => {
  const size = Math.sqrt(board.length);
  const res = new Array(board.length).fill(0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      res[c * size + (size - 1 - r)] = board[r * size + c];
    }
  }
  return res;
};

export const moveBoard = (
  board: Board,
  dir: Direction,
): { board: Board; gained: number } => {
  const size = Math.sqrt(board.length);
  let b = board.slice();
  let gained = 0;
  // rotate board so movement is to left
  const rotations: Record<Direction, number> = {
    left: 0,
    up: 1,
    right: 2,
    down: 3,
  };
  const times = rotations[dir];
  for (let i = 0; i < times; i++) b = rotate(b);
  for (let r = 0; r < size; r++) {
    const sliceStart = r * size;
    const { line, gained: g } = slide(b.slice(sliceStart, sliceStart + size));
    b.splice(sliceStart, size, ...line);
    gained += g;
  }
  for (let i = 0; i < (4 - times) % 4; i++) b = rotate(b);
  return { board: b, gained };
};

export const move = (
  state: GameState,
  dir: Direction,
  rng: () => number,
): GameState => {
  const { board, score } = state;
  const { board: moved, gained } = moveBoard(board, dir);
  if (moved.every((v, i) => v === board[i])) return state; // no change
  const spawned = spawnTile(moved, rng);
  return {
    board: spawned,
    score: score + gained,
    history: [...state.history, { board, score, move: dir }],
    future: [],
  };
};

export const undo = (state: GameState): GameState => {
  const history = state.history.slice();
  if (!history.length) return state;
  const prev = history.pop()!;
  return {
    board: prev.board,
    score: prev.score,
    history,
    future: [{ board: state.board, score: state.score, move: prev.move }, ...state.future],
  };
};

export const redo = (state: GameState): GameState => {
  const future = state.future.slice();
  if (!future.length) return state;
  const next = future.shift()!;
  return {
    board: next.board,
    score: next.score,
    history: [...state.history, { board: state.board, score: state.score, move: next.move }],
    future,
  };
};

export const isGameOver = (board: Board): boolean => {
  const size = Math.sqrt(board.length);
  if (board.includes(0)) return false;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      const v = board[idx];
      if ((c < size - 1 && v === board[idx + 1]) || (r < size - 1 && v === board[idx + size])) {
        return false;
      }
    }
  }
  return true;
};

export const score = (board: Board): number => board.reduce((a, b) => a + b, 0);

export const initialState = (rng: () => number, size = 4): GameState => {
  let board = Array(size * size).fill(0);
  board = spawnTile(board, rng);
  board = spawnTile(board, rng);
  return { board, score: 0, history: [], future: [] };
};
