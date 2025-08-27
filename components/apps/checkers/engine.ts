export type Color = 'red' | 'black';
export interface Piece { color: Color; king: boolean; }
export type Board = (Piece | null)[][];

export const createBoard = (): Board => {
  const board: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: 'black', king: false };
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
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

export const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

export interface Move {
  from: [number, number];
  to: [number, number];
  captured?: [number, number];
}

export const cloneBoard = (board: Board): Board =>
  board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

export const getPieceMoves = (board: Board, r: number, c: number): Move[] => {
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
    if (!inBounds(r1, c1)) continue;
    const target = board[r1][c1];
    if (!target) {
      moves.push({ from: [r, c], to: [r1, c1] });
    } else if (target.color !== piece.color) {
      const r2 = r + dr * 2;
      const c2 = c + dc * 2;
      if (inBounds(r2, c2) && !board[r2][c2]) {
        captures.push({ from: [r, c], to: [r2, c2], captured: [r1, c1] });
      }
    }
  }
  return captures.length ? captures : moves;
};

export const getLegalMoves = (board: Board, r: number, c: number): Move[] => {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = getPieceMoves(board, r, c);
  const all = getAllMoves(board, piece.color);
  const mustCapture = all.some((m) => m.captured);
  return mustCapture ? moves.filter((m) => m.captured) : moves;
};

export const getAllMoves = (board: Board, color: Color): Move[] => {
  let result: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === color) {
        const moves = getPieceMoves(board, r, c);
        if (moves.length) result = result.concat(moves);
      }
    }
  }
  const anyCapture = result.some((m) => m.captured);
  return anyCapture ? result.filter((m) => m.captured) : result;
};

export const hasMoves = (board: Board, color: Color): boolean =>
  getAllMoves(board, color).length > 0;

export const applyMove = (
  board: Board,
  move: Move
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
      (piece.color === 'black' && move.to[0] === 7))
  ) {
    piece.king = true;
    king = true;
  }
  return { board: newBoard, capture, king };
};

export const boardToBitboards = (board: Board) => {
  let red = 0n;
  let black = 0n;
  let kings = 0n;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const bit = 1n << BigInt((7 - r) * 8 + c);
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

export const evaluateBoard = (board: Board): number => {
  const { red, black, kings } = boardToBitboards(board);
  const redKings = red & kings;
  const blackKings = black & kings;
  const redMen = bitCount(red) - bitCount(redKings);
  const blackMen = bitCount(black) - bitCount(blackKings);
  const mobility =
    getAllMoves(board, 'red').length - getAllMoves(board, 'black').length;
  return (
    redMen - blackMen +
    1.5 * (bitCount(redKings) - bitCount(blackKings)) +
    0.1 * mobility
  );
};

export const isDraw = (noCaptureMoves: number) => noCaptureMoves >= 40;
