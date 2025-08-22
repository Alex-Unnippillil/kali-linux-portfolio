export type Color = 'red' | 'black';
export type Variant = 'standard' | 'international' | 'giveaway';

export interface Config {
  variant: Variant;
  size: number;
  rows: number;
  giveaway: boolean;
}

export interface Piece { color: Color; king: boolean; }
export type Board = (Piece | null)[][];

export interface Move {
  from: [number, number];
  to: [number, number];
  captured?: [number, number];
}

export const createConfig = (variant: Variant): Config => {
  switch (variant) {
    case 'international':
      return { variant, size: 10, rows: 4, giveaway: false };
    case 'giveaway':
      return { variant, size: 8, rows: 3, giveaway: true };
    default:
      return { variant: 'standard', size: 8, rows: 3, giveaway: false };
  }
};

export const createBoard = (config: Config): Board => {
  const { size, rows } = config;
  const board: Board = Array(size)
    .fill(null)
    .map(() => Array(size).fill(null));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < size; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: 'black', king: false };
    }
  }
  for (let r = size - rows; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: 'red', king: false };
    }
  }
  return board;
};

const directions: Record<Color, number[][]> = {
  red: [
    [-1, -1],
    [-1, 1],
  ],
  black: [
    [1, -1],
    [1, 1],
  ],
};

export const inBounds = (r: number, c: number, config: Config) =>
  r >= 0 && r < config.size && c >= 0 && c < config.size;

export const cloneBoard = (board: Board): Board =>
  board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

export const getPieceMoves = (
  board: Board,
  r: number,
  c: number,
  config: Config,
): Move[] => {
  const piece = board[r][c];
  if (!piece) return [];
  const dirs = [...directions[piece.color]];
  if (piece.king) {
    dirs.push(...directions[piece.color === 'red' ? 'black' : 'red']);
  }
  const moves: Move[] = [];
  const captures: Move[] = [];
  for (const [dr, dc] of dirs) {
    const r1 = r + dr;
    const c1 = c + dc;
    if (!inBounds(r1, c1, config)) continue;
    const target = board[r1][c1];
    if (!target) {
      moves.push({ from: [r, c], to: [r1, c1] });
    } else if (target.color !== piece.color) {
      const r2 = r + dr * 2;
      const c2 = c + dc * 2;
      if (inBounds(r2, c2, config) && !board[r2][c2]) {
        captures.push({ from: [r, c], to: [r2, c2], captured: [r1, c1] });
      }
    }
  }
  return captures.length ? captures : moves;
};

export const getAllMoves = (
  board: Board,
  color: Color,
  config: Config,
): Move[] => {
  let result: Move[] = [];
  for (let r = 0; r < config.size; r++) {
    for (let c = 0; c < config.size; c++) {
      if (board[r][c]?.color === color) {
        const moves = getPieceMoves(board, r, c, config);
        if (moves.length) result = result.concat(moves);
      }
    }
  }
  const anyCapture = result.some((m) => m.captured);
  return anyCapture ? result.filter((m) => m.captured) : result;
};

export const hasMoves = (board: Board, color: Color, config: Config): boolean =>
  getAllMoves(board, color, config).length > 0;

export const applyMove = (
  board: Board,
  move: Move,
  config: Config,
): { board: Board; capture: boolean; king: boolean } => {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from[0]][move.from[1]]!;
  newBoard[move.from[0]][move.from[1]] = null;
  newBoard[move.to[0]][move.to[1]] = piece;
  let capture = false;
  if (move.captured) {
    const [cr, cc] = move.captured;
    newBoard[cr][cc] = null;
    capture = true;
  }
  let king = false;
  if (
    !piece.king &&
    ((piece.color === 'red' && move.to[0] === 0) ||
      (piece.color === 'black' && move.to[0] === config.size - 1))
  ) {
    piece.king = true;
    king = true;
  }
  return { board: newBoard, capture, king };
};

export const countPieces = (board: Board, color: Color): number => {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell?.color === color) count++;
    }
  }
  return count;
};

export const getWinner = (
  board: Board,
  turn: Color,
  config: Config,
): Color | null => {
  const opponent = turn === 'red' ? 'black' : 'red';
  if (config.giveaway) {
    if (countPieces(board, turn) === 0 || !hasMoves(board, turn, config)) return turn;
    if (countPieces(board, opponent) === 0 || !hasMoves(board, opponent, config)) return opponent;
  } else {
    if (countPieces(board, opponent) === 0 || !hasMoves(board, opponent, config)) return turn;
    if (countPieces(board, turn) === 0 || !hasMoves(board, turn, config)) return opponent;
  }
  return null;
};

export const boardToBitboards = (board: Board, config: Config) => {
  let red = 0n;
  let black = 0n;
  let kings = 0n;
  for (let r = 0; r < config.size; r++) {
    for (let c = 0; c < config.size; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const bit = 1n << BigInt((config.size - 1 - r) * config.size + c);
      if (piece.color === 'red') red |= bit;
      else black |= bit;
      if (piece.king) kings |= bit;
    }
  }
  return { red, black, kings };
};

export const bitCount = (n: bigint) => {
  let count = 0;
  while (n) {
    n &= n - 1n;
    count++;
  }
  return count;
};

export const evaluateBoard = (board: Board, config: Config): number => {
  const { red, black, kings } = boardToBitboards(board, config);
  const redKings = red & kings;
  const blackKings = black & kings;
  const redMen = bitCount(red) - bitCount(redKings);
  const blackMen = bitCount(black) - bitCount(blackKings);
  const mobility =
    getAllMoves(board, 'red', config).length -
    getAllMoves(board, 'black', config).length;
  const score =
    redMen -
    blackMen +
    1.5 * (bitCount(redKings) - bitCount(blackKings)) +
    0.1 * mobility;
  return config.giveaway ? -score : score;
};

export const isDraw = (noCaptureMoves: number) => noCaptureMoves >= 40;
