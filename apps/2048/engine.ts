export type Direction = 'up' | 'down' | 'left' | 'right';

export type Board = number[]; // 16 length

export interface GameState {
  board: Board;
  score: number;
  history: { board: Board; score: number }[];
  future: { board: Board; score: number }[];
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
  while (res.length < 4) res.push(0);
  return { line: res, gained };
};

const rotate = (board: Board): Board => {
  const res = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      res[c * 4 + (3 - r)] = board[r * 4 + c];
    }
  }
  return res;
};

export const moveBoard = (
  board: Board,
  dir: Direction,
): { board: Board; gained: number } => {
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
  for (let r = 0; r < 4; r++) {
    const { line, gained: g } = slide(b.slice(r * 4, r * 4 + 4));
    b.splice(r * 4, 4, ...line);
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
    history: [...state.history, { board, score }],
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
    future: [{ board: state.board, score: state.score }, ...state.future],
  };
};

export const redo = (state: GameState): GameState => {
  const future = state.future.slice();
  if (!future.length) return state;
  const next = future.shift()!;
  return {
    board: next.board,
    score: next.score,
    history: [...state.history, { board: state.board, score: state.score }],
    future,
  };
};

export const isGameOver = (board: Board): boolean => {
  if (board.includes(0)) return false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const idx = r * 4 + c;
      const v = board[idx];
      if ((c < 3 && v === board[idx + 1]) || (r < 3 && v === board[idx + 4])) {
        return false;
      }
    }
  }
  return true;
};

export const score = (board: Board): number => board.reduce((a, b) => a + b, 0);

export const initialState = (rng: () => number): GameState => {
  let board = Array(16).fill(0);
  board = spawnTile(board, rng);
  board = spawnTile(board, rng);
  return { board, score: 0, history: [], future: [] };
};
