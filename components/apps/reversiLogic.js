export const SIZE = 8;

// Bitboard masks
const FULL = 0xffffffffffffffffn;
const NOT_A_FILE = 0xfefefefefefefefen;
const NOT_H_FILE = 0x7f7f7f7f7f7f7f7fn;
const CORNERS = 0x8100000000000081n;
const X_SQUARES = 0x0042000000004200n;

// Shift helpers respecting board edges
const shiftN = (bb) => bb >> 8n;
const shiftS = (bb) => (bb << 8n) & FULL;
const shiftE = (bb) => (bb & NOT_H_FILE) << 1n;
const shiftW = (bb) => (bb & NOT_A_FILE) >> 1n;
const shiftNE = (bb) => (bb & NOT_H_FILE) >> 7n;
const shiftNW = (bb) => (bb & NOT_A_FILE) >> 9n;
const shiftSE = (bb) => ((bb & NOT_H_FILE) << 9n) & FULL;
const shiftSW = (bb) => ((bb & NOT_A_FILE) << 7n) & FULL;

const SHIFTS = [shiftN, shiftS, shiftE, shiftW, shiftNE, shiftNW, shiftSE, shiftSW];

const bitCount = (bb) => {
  let count = 0;
  while (bb) {
    bb &= bb - 1n;
    count += 1;
  }
  return count;
};

const bitIndex = (bb) => {
  let idx = 0;
  while (bb > 1n) {
    bb >>= 1n;
    idx += 1;
  }
  return idx;
};

const bitboardToArray = (bb) => {
  const arr = [];
  let b = bb;
  while (b) {
    const lsb = b & -b;
    const idx = bitIndex(lsb);
    arr.push([Math.floor(idx / SIZE), idx % SIZE]);
    b ^= lsb;
  }
  return arr;
};

export const createBoard = () => ({
  black: (1n << 28n) | (1n << 35n),
  white: (1n << 27n) | (1n << 36n),
});

const legalMovesBitboard = (own, opp) => {
  const empty = ~(own | opp) & FULL;
  let moves = 0n;
  SHIFTS.forEach((shift) => {
    let t = shift(own) & opp;
    t |= shift(t) & opp;
    t |= shift(t) & opp;
    t |= shift(t) & opp;
    t |= shift(t) & opp;
    t |= shift(t) & opp;
    moves |= shift(t) & empty;
  });
  return moves;
};

const computeFlips = (own, opp, move) => {
  let flips = 0n;
  SHIFTS.forEach((shift) => {
    let m = shift(move);
    let captured = 0n;
    while (m && (m & opp)) {
      captured |= m;
      m = shift(m);
    }
    if (m & own) flips |= captured;
  });
  return flips;
};

export const computeLegalMoves = (board, player) => {
  const own = player === 'B' ? board.black : board.white;
  const opp = player === 'B' ? board.white : board.black;
  const movesBB = legalMovesBitboard(own, opp);
  const moves = {};
  let b = movesBB;
  while (b) {
    const move = b & -b;
    const flipsMask = computeFlips(own, opp, move);
    const idx = bitIndex(move);
    const r = Math.floor(idx / SIZE);
    const c = idx % SIZE;
    moves[`${r}-${c}`] = { mask: flipsMask, flips: bitboardToArray(flipsMask) };
    b ^= move;
  }
  return moves;
};

export const applyMove = (board, r, c, player, flipsMask) => {
  const bit = 1n << BigInt(r * SIZE + c);
  if (player === 'B') {
    return {
      black: board.black | bit | flipsMask,
      white: board.white & ~flipsMask,
    };
  }
  return {
    black: board.black & ~flipsMask,
    white: board.white | bit | flipsMask,
  };
};

export const countPieces = (board) => ({
  black: bitCount(board.black),
  white: bitCount(board.white),
});

export const evaluateBoard = (board, player) => {
  const own = player === 'B' ? board.black : board.white;
  const opp = player === 'B' ? board.white : board.black;
  const total = bitCount(own | opp);
  const mobility =
    bitCount(legalMovesBitboard(own, opp)) -
    bitCount(legalMovesBitboard(opp, own));
  const cornerDiff = bitCount(own & CORNERS) - bitCount(opp & CORNERS);
  const xDiff = bitCount(own & X_SQUARES) - bitCount(opp & X_SQUARES);
  const parity = bitCount(own) - bitCount(opp);
  let mobilityWeight = 0;
  let parityWeight = 1;
  if (total <= 20) {
    mobilityWeight = 4;
    parityWeight = 1;
  } else if (total <= 58) {
    mobilityWeight = 2;
    parityWeight = 2;
  } else {
    mobilityWeight = 0;
    parityWeight = 5;
  }
  return (
    100 * cornerDiff -
    25 * xDiff +
    10 * mobilityWeight * mobility +
    parityWeight * parity
  );
};

export const minimax = (
  board,
  player,
  depth,
  maximizer,
  alpha = -Infinity,
  beta = Infinity,
) => {
  const own = player === 'B' ? board.black : board.white;
  const opp = player === 'B' ? board.white : board.black;
  const movesBB = legalMovesBitboard(own, opp);
  const opponent = player === 'B' ? 'W' : 'B';

  if (depth === 0 || movesBB === 0n) {
    if (movesBB === 0n) {
      const oppMoves = legalMovesBitboard(opp, own);
      if (oppMoves !== 0n) {
        return minimax(board, opponent, depth - 1, maximizer, alpha, beta);
      }
      const diff =
        maximizer === 'B'
          ? bitCount(board.black) - bitCount(board.white)
          : bitCount(board.white) - bitCount(board.black);
      return diff * 1000;
    }
    return evaluateBoard(board, maximizer);
  }

  if (player === maximizer) {
    let value = -Infinity;
    let b = movesBB;
    while (b) {
      const move = b & -b;
      const flips = computeFlips(own, opp, move);
      const idx = bitIndex(move);
      const r = Math.floor(idx / SIZE);
      const c = idx % SIZE;
      const newBoard = applyMove(board, r, c, player, flips);
      const val = minimax(newBoard, opponent, depth - 1, maximizer, alpha, beta);
      value = Math.max(value, val);
      alpha = Math.max(alpha, val);
      if (alpha >= beta) break;
      b ^= move;
    }
    return value;
  }

  let value = Infinity;
  let b = movesBB;
  while (b) {
    const move = b & -b;
    const flips = computeFlips(own, opp, move);
    const idx = bitIndex(move);
    const r = Math.floor(idx / SIZE);
    const c = idx % SIZE;
    const newBoard = applyMove(board, r, c, player, flips);
    const val = minimax(newBoard, opponent, depth - 1, maximizer, alpha, beta);
    value = Math.min(value, val);
    beta = Math.min(beta, val);
    if (beta <= alpha) break;
    b ^= move;
  }
  return value;
};

export const bestMove = (board, player, depth) => {
  const own = player === 'B' ? board.black : board.white;
  const opp = player === 'B' ? board.white : board.black;
  const movesBB = legalMovesBitboard(own, opp);
  if (movesBB === 0n) return null;
  let best = null;
  let bestVal = -Infinity;
  let b = movesBB;
  const opponent = player === 'B' ? 'W' : 'B';
  while (b) {
    const move = b & -b;
    const flips = computeFlips(own, opp, move);
    const idx = bitIndex(move);
    const r = Math.floor(idx / SIZE);
    const c = idx % SIZE;
    const newBoard = applyMove(board, r, c, player, flips);
    const val = minimax(newBoard, opponent, depth - 1, player, -Infinity, Infinity);
    if (val > bestVal) {
      bestVal = val;
      best = [r, c];
    }
    b ^= move;
  }
  return best;
};

export { legalMovesBitboard };
