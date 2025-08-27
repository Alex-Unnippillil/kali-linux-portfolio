export type Color = 'red' | 'black';
export interface Piece { color: Color; king: boolean; }
export type Board = (Piece | null)[][];
export interface Move { from:[number,number]; to:[number,number]; captured?:[number,number]; }

const directions: Record<Color, number[][]> = {
  red: [[-1, -1], [-1, 1]],
  black: [[1, -1], [1, 1]],
};

const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

const cloneBoard = (board: Board): Board =>
  board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

const getPieceMoves = (board: Board, r: number, c: number): Move[] => {
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

const applyMove = (board: Board, move: Move): { board: Board } => {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from[0]][move.from[1]]!;
  newBoard[move.from[0]][move.from[1]] = null;
  newBoard[move.to[0]][move.to[1]] = piece;
  if (move.captured) {
    const [cr, cc] = move.captured;
    newBoard[cr][cc] = null;
  }
  if (
    !piece.king &&
    ((piece.color === 'red' && move.to[0] === 0) ||
      (piece.color === 'black' && move.to[0] === 7))
  ) {
    piece.king = true;
  }
  return { board: newBoard };
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
  const { red, black, kings } = boardToBitboards(board);
  const redKings = red & kings;
  const blackKings = black & kings;
  const redMen = bitCount(red) - bitCount(redKings);
  const blackMen = bitCount(black) - bitCount(blackKings);
  const mobility =
    getAllMoves(board, 'red', true).length - getAllMoves(board, 'black', true).length;
  return (
    redMen - blackMen +
    1.5 * (bitCount(redKings) - bitCount(blackKings)) +
    0.1 * mobility
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
    const next = applyMove(board, move).board;
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

const randomPlayout = (
  board: Board,
  color: Color,
  enforceCapture: boolean,
): Color => {
  let current = color;
  let b = cloneBoard(board);
  while (true) {
    const moves = getAllMoves(b, current, enforceCapture);
    if (moves.length === 0) return current === 'red' ? 'black' : 'red';
    const move = moves[Math.floor(Math.random() * moves.length)];
    b = applyMove(b, move).board;
    current = current === 'red' ? 'black' : 'red';
  }
};

const mcts = (
  board: Board,
  color: Color,
  iterations: number,
  enforceCapture: boolean,
): Move | null => {
  const moves = getAllMoves(board, color, enforceCapture);
  if (!moves.length) return null;
  const scores = new Array(moves.length).fill(0);
  for (let i = 0; i < iterations; i++) {
    const idx = i % moves.length;
    const move = moves[idx];
    const nextBoard = applyMove(board, move).board;
    const winner = randomPlayout(nextBoard, color === 'red' ? 'black' : 'red', enforceCapture);
    if (winner === color) scores[idx]++;
  }
  let best = 0;
  for (let i = 1; i < moves.length; i++) {
    if (scores[i] > scores[best]) best = i;
  }
  return moves[best];
};

self.onmessage = (e: MessageEvent) => {
  const { board, color, difficulty, algorithm, enforceCapture } = e.data as {
    board: Board;
    color: Color;
    difficulty: number;
    algorithm: 'alphabeta' | 'mcts';
    enforceCapture: boolean;
  };
  let move: Move | null = null;
  if (algorithm === 'mcts') {
    move = mcts(board, color, Math.max(10, difficulty * 200), enforceCapture);
  } else {
    move = alphaBeta(
      board,
      Math.max(1, difficulty),
      color === 'red',
      -Infinity,
      Infinity,
      enforceCapture,
    ).move || null;
  }
  // eslint-disable-next-line no-restricted-globals
  (self as any).postMessage(move);
};

export {};
