export interface Board {
  black: bigint;
  white: bigint;
}

export const enum Player {
  Black = 1,
  White = -1,
}

const FULL = 0xffffffffffffffffn;

const MASK_E = 0xfefefefefefefefen;
const MASK_W = 0x7f7f7f7f7f7f7f7fn;
const MASK_N = 0xffffffffffffff00n;
const MASK_S = 0x00ffffffffffffffn;
const MASK_NE = MASK_N & MASK_E;
const MASK_NW = MASK_N & MASK_W;
const MASK_SE = MASK_S & MASK_E;
const MASK_SW = MASK_S & MASK_W;

const shift = (bb: bigint, dir: number): bigint =>
  dir > 0 ? ((bb << BigInt(dir)) & FULL) : ((bb >> BigInt(-dir)) & FULL);

export const initialBoard = (): Board => ({
  black: (1n << 28n) | (1n << 35n),
  white: (1n << 27n) | (1n << 36n),
});

export const countBits = (bb: bigint): number => {
  let c = 0;
  let b = bb & FULL;
  while (b) {
    b &= b - 1n;
    c += 1;
  }
  return c;
};

const movesDir = (
  p: bigint,
  o: bigint,
  empty: bigint,
  mask: bigint,
  dir: number
): bigint => {
  const oMask = o & mask;
  let m = oMask & shift(p, dir);
  m |= oMask & shift(m, dir);
  m |= oMask & shift(m, dir);
  m |= oMask & shift(m, dir);
  m |= oMask & shift(m, dir);
  m |= oMask & shift(m, dir);
  return empty & mask & shift(m, dir);
};

export const getMoves = (player: bigint, opponent: bigint): bigint => {
  const empty = ~(player | opponent) & FULL;
  let moves = 0n;
  moves |= movesDir(player, opponent, empty, MASK_E, 1);
  moves |= movesDir(player, opponent, empty, MASK_W, -1);
  moves |= movesDir(player, opponent, empty, MASK_N, 8);
  moves |= movesDir(player, opponent, empty, MASK_S, -8);
  moves |= movesDir(player, opponent, empty, MASK_NE, 9);
  moves |= movesDir(player, opponent, empty, MASK_NW, 7);
  moves |= movesDir(player, opponent, empty, MASK_SE, -7);
  moves |= movesDir(player, opponent, empty, MASK_SW, -9);
  return moves;
};

const flipDir = (
  move: bigint,
  p: bigint,
  o: bigint,
  mask: bigint,
  dir: number
): bigint => {
  let flips = 0n;
  let m = shift(move, dir) & mask;
  while (m && (m & o)) {
    flips |= m;
    m = shift(m, dir) & mask;
  }
  return m & p ? flips : 0n;
};

export const flipsForMove = (
  player: bigint,
  opponent: bigint,
  move: bigint
): bigint => {
  let flips = 0n;
  flips |= flipDir(move, player, opponent, MASK_E, 1);
  flips |= flipDir(move, player, opponent, MASK_W, -1);
  flips |= flipDir(move, player, opponent, MASK_N, 8);
  flips |= flipDir(move, player, opponent, MASK_S, -8);
  flips |= flipDir(move, player, opponent, MASK_NE, 9);
  flips |= flipDir(move, player, opponent, MASK_NW, 7);
  flips |= flipDir(move, player, opponent, MASK_SE, -7);
  flips |= flipDir(move, player, opponent, MASK_SW, -9);
  return flips;
};

export const makeMove = (
  player: bigint,
  opponent: bigint,
  move: bigint
): { player: bigint; opponent: bigint } => {
  const flips = flipsForMove(player, opponent, move);
  return { player: player | move | flips, opponent: opponent & ~flips };
};

const mobility = (p: bigint, o: bigint) =>
  countBits(getMoves(p, o)) - countBits(getMoves(o, p));

const CORNER_MASK = 0x8100000000000081n;
const EDGE_MASK = 0x7e8181818181817en;

const corners = (p: bigint, o: bigint) =>
  countBits(p & CORNER_MASK) - countBits(o & CORNER_MASK);

const stability = (p: bigint, o: bigint) =>
  countBits(p & EDGE_MASK) - countBits(o & EDGE_MASK);

const parity = (p: bigint, o: bigint) => {
  const empty = 64 - countBits(p | o);
  return empty % 2 === 0 ? 1 : -1;
};

const evaluate = (p: bigint, o: bigint) =>
  10 * mobility(p, o) + 25 * corners(p, o) + 5 * stability(p, o) + parity(p, o);

const orderMoves = (
  p: bigint,
  o: bigint,
  moves: bigint,
  preferred?: bigint
): bigint[] => {
  const arr: { move: bigint; score: number }[] = [];
  let m = moves;
  while (m) {
    const move = m & -m;
    const { player: np, opponent: no } = makeMove(p, o, move);
    const score = evaluate(np, no);
    arr.push({ move, score });
    m ^= move;
  }
  arr.sort((a, b) => {
    if (preferred) {
      if (a.move === preferred) return -1;
      if (b.move === preferred) return 1;
    }
    return b.score - a.score;
  });
  return arr.map((x) => x.move);
};

const enum TTFlag {
  Exact,
  Lower,
  Upper,
}

interface TTEntry {
  depth: number;
  score: number;
  flag: TTFlag;
  move: bigint;
}

const tt = new Map<bigint, TTEntry>();

const keyFor = (p: bigint, o: bigint) => ((p & FULL) << 64n) | (o & FULL);

const negamaxSearch = (
  p: bigint,
  o: bigint,
  depth: number,
  alpha: number,
  beta: number,
  preferred?: bigint
): { score: number; move: bigint } => {
  const key = keyFor(p, o);
  const entry = tt.get(key);
  if (entry && entry.depth >= depth) {
    if (entry.flag === TTFlag.Exact) {
      return { score: entry.score, move: entry.move };
    }
    if (entry.flag === TTFlag.Lower) {
      alpha = Math.max(alpha, entry.score);
    } else if (entry.flag === TTFlag.Upper) {
      beta = Math.min(beta, entry.score);
    }
    if (alpha >= beta) {
      return { score: entry.score, move: entry.move };
    }
  }

  const moves = getMoves(p, o);
  if (depth === 0 || moves === 0n) {
    const score = evaluate(p, o);
    return { score, move: 0n };
  }

  let bestMove = 0n;
  let bestScore = -Infinity;
  const alphaOrig = alpha;
  const ordered = orderMoves(p, o, moves, entry?.move ?? preferred);
  for (const move of ordered) {
    const { player: np, opponent: no } = makeMove(p, o, move);
    const { score } = negamaxSearch(no, np, depth - 1, -beta, -alpha);
    const val = -score;
    if (val > bestScore) {
      bestScore = val;
      bestMove = move;
    }
    alpha = Math.max(alpha, val);
    if (alpha >= beta) break;
  }

  let flag: TTFlag;
  if (bestScore <= alphaOrig) flag = TTFlag.Upper;
  else if (bestScore >= beta) flag = TTFlag.Lower;
  else flag = TTFlag.Exact;
  tt.set(key, { depth, score: bestScore, flag, move: bestMove });
  return { score: bestScore, move: bestMove };
};

export const negamax = (
  player: bigint,
  opponent: bigint,
  depth: number
): { score: number; move: bigint } => {
  let bestMove: bigint | undefined;
  let result = { score: 0, move: 0n };
  for (let d = 1; d <= depth; d += 1) {
    result = negamaxSearch(player, opponent, d, -Infinity, Infinity, bestMove);
    bestMove = result.move;
  }
  return result;
};

export const bitIndex = (bb: bigint): number => {
  let idx = 0;
  let b = bb;
  while (b > 1n) {
    b >>= 1n;
    idx += 1;
  }
  return idx;
};
