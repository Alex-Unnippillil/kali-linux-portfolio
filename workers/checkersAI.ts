export type Color = 'red' | 'black';
export interface Piece { color: Color; king: boolean; }
export type Board = (Piece | null)[][];
export interface Move {
  from: [number, number];
  to: [number, number];
  captured?: [number, number];
  next?: Move[];
}

const directions: Record<Color, number[][]> = {
  red: [[-1, -1], [-1, 1]],
  black: [[1, -1], [1, 1]],
};

const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

const cloneBoard = (board: Board): Board =>
  board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

const applyMove = (
  board: Board,
  move: Move,
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

const getPieceMoves = (board: Board, r: number, c: number): Move[] => {
  const piece = board[r][c];
  if (!piece) return [];
  const dirs = [...directions[piece.color]];
  if (piece.king) dirs.push(...directions[piece.color === 'red' ? 'black' : 'red']);
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
        const move: Move = { from: [r, c], to: [r2, c2], captured: [r1, c1] };
        const { board: nextBoard, king } = applyMove(board, move);
        if (!king) {
          const further = getPieceMoves(nextBoard, r2, c2).filter((m) => m.captured);
          if (further.length) move.next = further;
        }
        captures.push(move);
      }
    }
  }
  return captures.length ? captures : moves;
};

const getAllMoves = (
  board: Board,
  color: Color,
  enforceCapture: boolean,
): Move[] => {
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
  return enforceCapture && anyCapture ? result.filter((m) => m.captured) : result;
};

const applyMoveSeq = (board: Board, move: Move): Board => {
  let result = applyMove(board, move).board;
  if (move.next && move.next.length) {
    result = applyMoveSeq(result, move.next[0]);
  }
  return result;
};

const boardToBitboards = (board: Board) => {
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

const bitCount = (n: bigint) => {
  let count = 0;
  while (n) {
    n &= n - 1n;
    count++;
  }
  return count;
};

const evaluate = (board: Board): number => {
  let material = 0;
  let advancement = 0;
  let kingSafety = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const sign = piece.color === 'red' ? 1 : -1;
      material += sign * (piece.king ? 1.5 : 1);
      if (!piece.king) {
        advancement += sign * (piece.color === 'red' ? 7 - r : r);
      } else {
        for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const r1 = r + dr;
          const c1 = c + dc;
          if (!inBounds(r1, c1)) continue;
          const n = board[r1][c1];
          if (n) kingSafety += sign * (n.color === piece.color ? 0.5 : -0.5);
        }
      }
    }
  }
  const mobility =
    getAllMoves(board, 'red', true).length - getAllMoves(board, 'black', true).length;
  return (
    material +
    0.1 * mobility +
    0.05 * advancement +
    0.1 * kingSafety
  );
};

const alphaBeta = (
  board: Board,
  depth: number,
  maximizing: boolean,
  alpha: number,
  beta: number,
  enforceCapture: boolean,
): { score: number; move?: Move } => {
  if (depth === 0) return { score: evaluate(board) };
  const color: Color = maximizing ? 'red' : 'black';
  const moves = getAllMoves(board, color, enforceCapture);
  if (!moves.length) return { score: maximizing ? -Infinity : Infinity };
  let bestMove = moves[0];
  for (const move of moves) {
    const next = applyMoveSeq(board, move);
    const { score } = alphaBeta(next, depth - 1, !maximizing, alpha, beta, enforceCapture);
    if (maximizing) {
      if (score > alpha) {
        alpha = score;
        bestMove = move;
      }
      if (alpha >= beta) break;
    } else {
      if (score < beta) {
        beta = score;
        bestMove = move;
      }
      if (beta <= alpha) break;
    }
  }
  return { score: maximizing ? alpha : beta, move: bestMove };
};

self.onmessage = (e: MessageEvent) => {
  const { board, color, maxDepth, enforceCapture } = e.data as {
    board: Board;
    color: Color;
    maxDepth: number;
    enforceCapture?: boolean;
  };
  const depth = Math.max(1, maxDepth);
  const { move } = alphaBeta(
    board,
    depth,
    color === 'red',
    -Infinity,
    Infinity,
    enforceCapture ?? true,
  );
  // eslint-disable-next-line no-restricted-globals
  (self as any).postMessage(move || null);
 };

export {};
