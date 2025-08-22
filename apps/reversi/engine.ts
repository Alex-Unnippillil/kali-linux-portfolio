export interface Board {
  black: bigint;
  white: bigint;
}

export const enum Player {
  Black = 1,
  White = -1,
}

const FULL = 0xffffffffffffffffn;

const DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export const initialBoard = (): Board => ({
  black: (1n << 28n) | (1n << 35n),
  white: (1n << 27n) | (1n << 36n),
});

const bit = (index: number) => 1n << BigInt(index);

const inBounds = (x: number, y: number) => x >= 0 && x < 8 && y >= 0 && y < 8;

export const countBits = (bb: bigint): number => {
  let c = 0;
  let b = bb & FULL;
  while (b) {
    b &= b - 1n;
    c++;
  }
  return c;
};

export const getMoves = (player: bigint, opponent: bigint): bigint => {
  const empty = ~(player | opponent) & FULL;
  let moves = 0n;
  for (let i = 0; i < 64; i += 1) {
    const m = bit(i);
    if ((empty & m) === 0n) continue;
    const x = i % 8;
    const y = Math.floor(i / 8);
    for (const [dx, dy] of DIRS) {
      let cx = x + dx;
      let cy = y + dy;
      let seen = false;
      while (inBounds(cx, cy)) {
        const b = bit(cy * 8 + cx);
        if ((opponent & b) !== 0n) {
          seen = true;
          cx += dx;
          cy += dy;
          continue;
        }
        if (seen && (player & b) !== 0n) {
          moves |= m;
        }
        break;
      }
      if ((moves & m) !== 0n) break;
    }
  }
  return moves;
};

export const makeMove = (
  player: bigint,
  opponent: bigint,
  move: bigint
): { player: bigint; opponent: bigint } => {
  const idx = (() => {
    for (let i = 0; i < 64; i += 1) {
      if (move === bit(i)) return i;
    }
    return 0;
  })();
  const x = idx % 8;
  const y = Math.floor(idx / 8);
  let flips = 0n;
  for (const [dx, dy] of DIRS) {
    let cx = x + dx;
    let cy = y + dy;
    let path = 0n;
    while (inBounds(cx, cy)) {
      const b = bit(cy * 8 + cx);
      if ((opponent & b) !== 0n) {
        path |= b;
        cx += dx;
        cy += dy;
        continue;
      }
      if ((player & b) !== 0n) {
        flips |= path;
      }
      break;
    }
  }
  const newPlayer = player | move | flips;
  const newOpponent = opponent & ~flips;
  return { player: newPlayer, opponent: newOpponent };
};

const mobility = (player: bigint, opponent: bigint) =>
  countBits(getMoves(player, opponent)) - countBits(getMoves(opponent, player));

const stability = (player: bigint, opponent: bigint) => {
  const corners = [0, 7, 56, 63].map(bit);
  let score = 0;
  corners.forEach((c) => {
    if (player & c) score += 1;
    else if (opponent & c) score -= 1;
  });
  return score;
};

const parity = (player: bigint, opponent: bigint) => {
  const empty = 64 - countBits(player | opponent);
  return empty % 2 === 0 ? 1 : -1;
};

const evaluate = (player: bigint, opponent: bigint) =>
  10 * mobility(player, opponent) + 5 * stability(player, opponent) + parity(player, opponent);

export const negamax = (
  player: bigint,
  opponent: bigint,
  depth: number,
  alpha = -Infinity,
  beta = Infinity
): { score: number; move: bigint } => {
  const moves = getMoves(player, opponent);
  if (depth === 0 || moves === 0n) {
    const score = evaluate(player, opponent);
    return { score, move: 0n };
  }
  let bestMove = 0n;
  let bestScore = -Infinity;
  let m = moves;
  while (m) {
    const move = m & -m;
    const { player: newPlayer, opponent: newOpponent } = makeMove(
      player,
      opponent,
      move
    );
    const { score } = negamax(newOpponent, newPlayer, depth - 1, -beta, -alpha);
    const val = -score;
    if (val > bestScore) {
      bestScore = val;
      bestMove = move;
    }
    alpha = Math.max(alpha, val);
    if (alpha >= beta) break;
    m ^= move;
  }
  return { score: bestScore, move: bestMove };
};
