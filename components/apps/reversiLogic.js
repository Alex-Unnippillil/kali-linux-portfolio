export const SIZE = 8;
export const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

// --------- Zobrist hashing setup ---------
const rand64 = () =>
  (BigInt(Math.floor(Math.random() * 2 ** 32)) << 32n) |
  BigInt(Math.floor(Math.random() * 2 ** 32));

const ZOBRIST = Array.from({ length: SIZE }, () =>
  Array.from({ length: SIZE }, () => ({ B: rand64(), W: rand64() })),
);

const computeHash = (board) => {
  let h = 0n;
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const cell = board[r][c];
      if (cell === 'B') h ^= ZOBRIST[r][c].B;
      else if (cell === 'W') h ^= ZOBRIST[r][c].W;
    }
  }
  return h;
};

const TT = new Map();

export const createBoard = () => {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  board[3][3] = 'W';
  board[3][4] = 'B';
  board[4][3] = 'B';
  board[4][4] = 'W';
  return board;
};

// Example minimal opening book using initial position
const OPENING_BOOK = {
  [computeHash(createBoard()).toString()]: [2, 3],
};

const inside = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

export const computeLegalMoves = (board, player) => {
  const opponent = player === 'B' ? 'W' : 'B';
  const moves = {};
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c]) continue;
      const flips = [];
      DIRECTIONS.forEach(([dr, dc]) => {
        let i = r + dr;
        let j = c + dc;
        const cells = [];
        while (inside(i, j) && board[i][j] === opponent) {
          cells.push([i, j]);
          i += dr;
          j += dc;
        }
        if (cells.length && inside(i, j) && board[i][j] === player) {
          flips.push(...cells);
        }
      });
      if (flips.length) moves[`${r}-${c}`] = flips;
    }
  }
  return moves;
};

export const applyMove = (board, r, c, player, flips) => {
  const newBoard = board.map((row) => row.slice());
  newBoard[r][c] = player;
  flips.forEach(([fr, fc]) => {
    newBoard[fr][fc] = player;
  });
  return newBoard;
};

export const countPieces = (board) => {
  let black = 0;
  let white = 0;
  board.forEach((row) =>
    row.forEach((cell) => {
      if (cell === 'B') black += 1;
      if (cell === 'W') white += 1;
    }),
  );
  return { black, white };
};

const corners = [
  [0, 0],
  [0, SIZE - 1],
  [SIZE - 1, 0],
  [SIZE - 1, SIZE - 1],
];

const stableFromCorner = (board, r, c, dr, dc, player) => {
  let i = r;
  let j = c;
  let count = 0;
  while (inside(i, j) && board[i][j] === player) {
    count += 1;
    i += dr;
    j += dc;
  }
  return count;
};

const stabilityCount = (board, player) => {
  let score = 0;
  // Top-left corner
  if (board[0][0] === player) {
    score +=
      stableFromCorner(board, 0, 0, 1, 0, player) +
      stableFromCorner(board, 0, 0, 0, 1, player) -
      1;
  }
  // Top-right corner
  if (board[0][SIZE - 1] === player) {
    score +=
      stableFromCorner(board, 0, SIZE - 1, 1, 0, player) +
      stableFromCorner(board, 0, SIZE - 1, 0, -1, player) -
      1;
  }
  // Bottom-left corner
  if (board[SIZE - 1][0] === player) {
    score +=
      stableFromCorner(board, SIZE - 1, 0, -1, 0, player) +
      stableFromCorner(board, SIZE - 1, 0, 0, 1, player) -
      1;
  }
  // Bottom-right corner
  if (board[SIZE - 1][SIZE - 1] === player) {
    score +=
      stableFromCorner(board, SIZE - 1, SIZE - 1, -1, 0, player) +
      stableFromCorner(board, SIZE - 1, SIZE - 1, 0, -1, player) -
      1;
  }
  return score;
};

export const evaluateBoard = (board, player) => {
  const opponent = player === 'B' ? 'W' : 'B';
  let cornerScore = 0;
  corners.forEach(([r, c]) => {
    if (board[r][c] === player) cornerScore += 1;
    else if (board[r][c] === opponent) cornerScore -= 1;
  });
  const mobility =
    Object.keys(computeLegalMoves(board, player)).length -
    Object.keys(computeLegalMoves(board, opponent)).length;
  const stability =
    stabilityCount(board, player) - stabilityCount(board, opponent);
  const { black, white } = countPieces(board);
  const parity = player === 'B' ? black - white : white - black;
  const total = black + white;
  let weights;
  if (total < 20) weights = { c: 25, m: 5, s: 5, p: 1 };
  else if (total < 58) weights = { c: 25, m: 5, s: 10, p: 1 };
  else weights = { c: 25, m: 1, s: 10, p: 20 };
  return (
    weights.c * cornerScore +
    weights.m * mobility +
    weights.s * stability +
    weights.p * parity
  );
};

export const minimax = (
  board,
  player,
  depth,
  maximizer,
  alpha = -Infinity,
  beta = Infinity,
  hash = computeHash(board),
) => {
  const ttEntry = TT.get(hash.toString());
  if (ttEntry && ttEntry.depth >= depth) return ttEntry.value;
  const movesObj = computeLegalMoves(board, player);
  const entries = Object.entries(movesObj);
  const opponent = player === 'B' ? 'W' : 'B';
  if (depth === 0 || entries.length === 0) {
    if (entries.length === 0) {
      const oppMoves = Object.keys(computeLegalMoves(board, opponent));
      if (oppMoves.length !== 0) {
        return minimax(board, opponent, depth - 1, maximizer, alpha, beta);
      }
      const { black, white } = countPieces(board);
      const diff = maximizer === 'B' ? black - white : white - black;
      const val = diff * 1000;
      TT.set(hash.toString(), { depth, value: val });
      return val;
    }
    const val = evaluateBoard(board, maximizer);
    TT.set(hash.toString(), { depth, value: val });
    return val;
  }

  if (player === maximizer) {
    let value = -Infinity;
    for (const [key, flips] of entries) {
      const [r, c] = key.split('-').map(Number);
      const newBoard = applyMove(board, r, c, player, flips);
      const val = minimax(
        newBoard,
        opponent,
        depth - 1,
        maximizer,
        alpha,
        beta,
        computeHash(newBoard),
      );
      value = Math.max(value, val);
      alpha = Math.max(alpha, val);
      if (alpha >= beta) break;
    }
    TT.set(hash.toString(), { depth, value });
    return value;
  }

  let value = Infinity;
  for (const [key, flips] of entries) {
    const [r, c] = key.split('-').map(Number);
    const newBoard = applyMove(board, r, c, player, flips);
    const val = minimax(
      newBoard,
      opponent,
      depth - 1,
      maximizer,
      alpha,
      beta,
      computeHash(newBoard),
    );
    value = Math.min(value, val);
    beta = Math.min(beta, val);
    if (beta <= alpha) break;
  }
  TT.set(hash.toString(), { depth, value });
  return value;
};

export const bestMove = (board, player, depth) => {
  const book = OPENING_BOOK[computeHash(board).toString()];
  if (book) return book;
  const movesObj = computeLegalMoves(board, player);
  const entries = Object.entries(movesObj);
  if (entries.length === 0) return null;
  const opponent = player === 'B' ? 'W' : 'B';
  let best = null;
  let bestVal = -Infinity;
  for (const [key, flips] of entries) {
    const [r, c] = key.split('-').map(Number);
    const newBoard = applyMove(board, r, c, player, flips);
    const val = minimax(
      newBoard,
      opponent,
      depth - 1,
      player,
      -Infinity,
      Infinity,
      computeHash(newBoard),
    );
    if (val > bestVal) {
      bestVal = val;
      best = [r, c];
    }
  }
  return best;
};

export const hintHeatmap = (board, player, depth) => {
  const movesObj = computeLegalMoves(board, player);
  const opponent = player === 'B' ? 'W' : 'B';
  const scores = {};
  let max = -Infinity;
  let min = Infinity;
  for (const [key, flips] of Object.entries(movesObj)) {
    const [r, c] = key.split('-').map(Number);
    const newBoard = applyMove(board, r, c, player, flips);
    const val = minimax(
      newBoard,
      opponent,
      depth - 1,
      player,
      -Infinity,
      Infinity,
      computeHash(newBoard),
    );
    scores[key] = val;
    if (val > max) max = val;
    if (val < min) min = val;
  }
  const range = max - min || 1;
  Object.keys(scores).forEach((k) => {
    scores[k] = (scores[k] - min) / range;
  });
  return scores;
};

export const exportHistory = (history) => JSON.stringify(history);
export const importHistory = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

