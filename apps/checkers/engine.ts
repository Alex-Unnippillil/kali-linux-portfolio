export type Color = 'red' | 'black';
export type Variant = 'standard' | 'international' | 'giveaway';

export interface Config {
  variant: Variant;
  size: number;
  rows: number;
  giveaway: boolean;
}

export interface Piece {
  color: Color;
  king: boolean;
}
export type Board = (Piece | null)[][];

export interface Move {
  from: [number, number];
  to: [number, number];
  /** first captured piece (backwards compat) */
  captured?: [number, number];
  /** list of all captured squares in order */
  captures?: [number, number][];
  /** path travelled including starting square */
  path?: [number, number][];
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
  config: Config
): Move[] => {
  const piece = board[r][c];
  if (!piece) return [];

  const captureMoves: Move[] = [];

  const explore = (
    b: Board,
    pr: number,
    pc: number,
    path: [number, number][],
    caps: [number, number][]
  ) => {
    const p = b[pr][pc]!;
    const dirs = [...directions[p.color]];
    if (p.king) dirs.push(...directions[p.color === 'red' ? 'black' : 'red']);
    let found = false;
    for (const [dr, dc] of dirs) {
      const r1 = pr + dr;
      const c1 = pc + dc;
      const r2 = pr + dr * 2;
      const c2 = pc + dc * 2;
      if (!inBounds(r2, c2, config)) continue;
      const enemy = b[r1][c1];
      if (enemy && enemy.color !== p.color && !b[r2][c2]) {
        found = true;
        const step: Move = { from: [pr, pc], to: [r2, c2], captured: [r1, c1] };
        const { board: nb } = applyMove(b, step, config);
        explore(nb, r2, c2, [...path, [r2, c2]], [...caps, [r1, c1]]);
      }
    }
    if (!found && caps.length) {
      captureMoves.push({
        from: path[0],
        to: [pr, pc],
        captured: caps[0],
        captures: caps,
        path,
      });
    }
  };

  explore(board, r, c, [[r, c]], []);
  if (captureMoves.length) return captureMoves;

  const dirs = [...directions[piece.color]];
  if (piece.king)
    dirs.push(...directions[piece.color === 'red' ? 'black' : 'red']);
  const moves: Move[] = [];
  for (const [dr, dc] of dirs) {
    const r1 = r + dr;
    const c1 = c + dc;
    if (!inBounds(r1, c1, config)) continue;
    if (!board[r1][c1]) {
      moves.push({
        from: [r, c],
        to: [r1, c1],
        path: [
          [r, c],
          [r1, c1],
        ],
      });
    }
  }
  return moves;
};

export const getAllMoves = (
  board: Board,
  color: Color,
  config: Config
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
  const anyCapture = result.some((m) => m.captures?.length || m.captured);
  return anyCapture
    ? result.filter((m) => m.captures?.length || m.captured)
    : result;
};

export const hasMoves = (board: Board, color: Color, config: Config): boolean =>
  getAllMoves(board, color, config).length > 0;

export const applyMove = (
  board: Board,
  move: Move,
  config: Config
): { board: Board; capture: boolean; king: boolean } => {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from[0]][move.from[1]]!;
  newBoard[move.from[0]][move.from[1]] = null;
  const path = move.path ? move.path.slice(1) : [move.to];
  let r = move.from[0];
  let c = move.from[1];
  let capture = false;
  for (let i = 0; i < path.length; i++) {
    const [nr, nc] = path[i];
    if (move.captures && move.captures[i]) {
      const [cr, cc] = move.captures[i];
      newBoard[cr][cc] = null;
      capture = true;
    } else if (move.captured && i === 0) {
      const [cr, cc] = move.captured;
      newBoard[cr][cc] = null;
      capture = true;
    }
    r = nr;
    c = nc;
  }
  newBoard[r][c] = piece;
  let king = false;
  if (
    !piece.king &&
    ((piece.color === 'red' && r === 0) ||
      (piece.color === 'black' && r === config.size - 1))
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
  config: Config
): Color | null => {
  const opponent = turn === 'red' ? 'black' : 'red';
  if (config.giveaway) {
    if (countPieces(board, turn) === 0 || !hasMoves(board, turn, config))
      return turn;
    if (
      countPieces(board, opponent) === 0 ||
      !hasMoves(board, opponent, config)
    )
      return opponent;
  } else {
    if (
      countPieces(board, opponent) === 0 ||
      !hasMoves(board, opponent, config)
    )
      return turn;
    if (countPieces(board, turn) === 0 || !hasMoves(board, turn, config))
      return opponent;
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
  let kingSafety = 0;
  const center = (config.size - 1) / 2;
  for (let r = 0; r < config.size; r++) {
    for (let c = 0; c < config.size; c++) {
      const piece = board[r][c];
      if (piece?.king) {
        const dist = Math.abs(r - center) + Math.abs(c - center);
        const val = (config.size - dist) / config.size;
        kingSafety += piece.color === 'red' ? val : -val;
      }
    }
  }
  const score =
    redMen -
    blackMen +
    2 * (bitCount(redKings) - bitCount(blackKings)) +
    0.1 * mobility +
    0.2 * kingSafety;
  return config.giveaway ? -score : score;
};

export const isDraw = (noCaptureMoves: number) => noCaptureMoves >= 40;

export interface SearchOptions {
  maxDepth: number;
  timeLimit?: number;
}

const opponent = (c: Color): Color => (c === 'red' ? 'black' : 'red');

const transKey = (board: Board, color: Color, config: Config) => {
  const { red, black, kings } = boardToBitboards(board, config);
  return `${red}-${black}-${kings}-${color}`;
};

const orderMoves = (
  board: Board,
  moves: Move[],
  color: Color,
  config: Config
) => {
  const center = (config.size - 1) / 2;
  moves.sort((a, b) => {
    const aCaps = a.captures?.length || (a.captured ? 1 : 0);
    const bCaps = b.captures?.length || (b.captured ? 1 : 0);
    if (aCaps !== bCaps) return bCaps - aCaps;
    const aPiece = board[a.from[0]][a.from[1]]!;
    const bPiece = board[b.from[0]][b.from[1]]!;
    if (aPiece.king !== bPiece.king) return bPiece.king ? 1 : -1;
    const aForward = color === 'red' ? -a.to[0] : a.to[0];
    const bForward = color === 'red' ? -b.to[0] : b.to[0];
    if (aForward !== bForward) return aForward - bForward;
    const aDist = Math.abs(a.to[0] - center) + Math.abs(a.to[1] - center);
    const bDist = Math.abs(b.to[0] - center) + Math.abs(b.to[1] - center);
    return aDist - bDist;
  });
};

const minimax = (
  board: Board,
  color: Color,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  start: number,
  limit: number,
  table: Map<string, { depth: number; score: number }>,
  config: Config
): { score: number; move?: Move } => {
  if (Date.now() - start >= limit)
    return { score: evaluateBoard(board, config) };
  const key = transKey(board, maximizing ? color : opponent(color), config);
  const cached = table.get(key);
  if (cached && cached.depth >= depth) return { score: cached.score };
  if (depth === 0) {
    const score = evaluateBoard(board, config);
    table.set(key, { depth, score });
    return { score };
  }
  const turn = maximizing ? color : opponent(color);
  const moves = getAllMoves(board, turn, config);
  if (!moves.length) return { score: maximizing ? -Infinity : Infinity };
  orderMoves(board, moves, turn, config);
  let bestMove: Move | undefined;
  for (const move of moves) {
    const { board: next } = applyMove(board, move, config);
    const { score } = minimax(
      next,
      color,
      depth - 1,
      alpha,
      beta,
      !maximizing,
      start,
      limit,
      table,
      config
    );
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
  const bestScore = maximizing ? alpha : beta;
  table.set(key, { depth, score: bestScore });
  return { score: bestScore, move: bestMove };
};

export const findBestMove = (
  board: Board,
  color: Color,
  config: Config,
  options: SearchOptions
): Move | null => {
  const start = Date.now();
  const timeLimit = options.timeLimit ?? 200;
  const table = new Map<string, { depth: number; score: number }>();
  let best: Move | null = null;
  for (let d = 1; d <= options.maxDepth; d++) {
    if (Date.now() - start > timeLimit) break;
    const { move } = minimax(
      board,
      color,
      d,
      -Infinity,
      Infinity,
      true,
      start,
      timeLimit,
      table,
      config
    );
    if (move) best = move;
  }
  return best;
};
