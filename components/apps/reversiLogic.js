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

export const createBoard = () => {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  board[3][3] = 'W';
  board[3][4] = 'B';
  board[4][3] = 'B';
  board[4][4] = 'W';
  return board;
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

// Positional weights encouraging good squares (corners, edges) and
// discouraging risky ones (adjacent to corners).
const POSITION_WEIGHTS = [
  [120, -20, 20, 5, 5, 20, -20, 120],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [120, -20, 20, 5, 5, 20, -20, 120],
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
  let positional = 0;
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === player) positional += POSITION_WEIGHTS[r][c];
      else if (board[r][c] === opponent) positional -= POSITION_WEIGHTS[r][c];
    }
  }
  return 25 * cornerScore + 5 * mobility + 10 * stability + parity + positional;
};

export const minimax = (
  board,
  player,
  depth,
  maximizer,
  alpha = -Infinity,
  beta = Infinity,
) => {
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
      return diff * 1000;
    }
    return evaluateBoard(board, maximizer);
  }

  if (player === maximizer) {
    let value = -Infinity;
    for (const [key, flips] of entries) {
      const [r, c] = key.split('-').map(Number);
      const newBoard = applyMove(board, r, c, player, flips);
      const val = minimax(newBoard, opponent, depth - 1, maximizer, alpha, beta);
      value = Math.max(value, val);
      alpha = Math.max(alpha, val);
      if (alpha >= beta) break;
    }
    return value;
  }

  let value = Infinity;
  for (const [key, flips] of entries) {
    const [r, c] = key.split('-').map(Number);
    const newBoard = applyMove(board, r, c, player, flips);
    const val = minimax(newBoard, opponent, depth - 1, maximizer, alpha, beta);
    value = Math.min(value, val);
    beta = Math.min(beta, val);
    if (beta <= alpha) break;
  }
  return value;
};

export const bestMove = (board, player, depth) => {
  const movesObj = computeLegalMoves(board, player);
  const entries = Object.entries(movesObj);
  if (entries.length === 0) return null;
  const opponent = player === 'B' ? 'W' : 'B';
  let best = null;
  let bestVal = -Infinity;
  for (const [key, flips] of entries) {
    const [r, c] = key.split('-').map(Number);
    const newBoard = applyMove(board, r, c, player, flips);
    const val = minimax(newBoard, opponent, depth - 1, player, -Infinity, Infinity);
    if (val > bestVal) {
      bestVal = val;
      best = [r, c];
    }
  }
  return best;
};

