import openings from '../../games/reversi/openings.json';

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

const boardKey = (board) =>
  board.map((row) => row.map((cell) => cell || '.').join('')).join('/');

// Opening book lookup for early moves
export const getBookMove = (board, player) => {
  if (player !== 'W') return null;
  const { black, white } = countPieces(board);
  // Only apply book in the very early opening
  if (black + white > 5) return null;
  const key = boardKey(board);
  return openings[key] || null;
};

const corners = [
  [0, 0],
  [0, SIZE - 1],
  [SIZE - 1, 0],
  [SIZE - 1, SIZE - 1],
];
export const DEFAULT_WEIGHTS = {
  mobility: 5,
  corners: 25,
  edges: 10,
};

export const evaluateBoard = (board, player, weights = DEFAULT_WEIGHTS) => {
  const opponent = player === 'B' ? 'W' : 'B';
  let cornerScore = 0;
  corners.forEach(([r, c]) => {
    if (board[r][c] === player) cornerScore += 1;
    else if (board[r][c] === opponent) cornerScore -= 1;
  });
  const mobility =
    Object.keys(computeLegalMoves(board, player)).length -
    Object.keys(computeLegalMoves(board, opponent)).length;
  let edgeScore = 0;
  for (let i = 1; i < SIZE - 1; i += 1) {
    // top row
    if (board[0][i] === player) edgeScore += 1;
    else if (board[0][i] === opponent) edgeScore -= 1;
    // bottom row
    if (board[SIZE - 1][i] === player) edgeScore += 1;
    else if (board[SIZE - 1][i] === opponent) edgeScore -= 1;
    // left column
    if (board[i][0] === player) edgeScore += 1;
    else if (board[i][0] === opponent) edgeScore -= 1;
    // right column
    if (board[i][SIZE - 1] === player) edgeScore += 1;
    else if (board[i][SIZE - 1] === opponent) edgeScore -= 1;
  }
  const { black, white } = countPieces(board);
  const parity = player === 'B' ? black - white : white - black;
  return (
    weights.corners * cornerScore +
    weights.mobility * mobility +
    weights.edges * edgeScore +
    parity
  );
};

export const minimax = (
  board,
  player,
  depth,
  maximizer,
  weights,
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
        return minimax(board, opponent, depth - 1, maximizer, weights, alpha, beta);
      }
      const { black, white } = countPieces(board);
      const diff = maximizer === 'B' ? black - white : white - black;
      return diff * 1000;
    }
    return evaluateBoard(board, maximizer, weights);
  }

  if (player === maximizer) {
    let value = -Infinity;
    for (const [key, flips] of entries) {
      const [r, c] = key.split('-').map(Number);
      const newBoard = applyMove(board, r, c, player, flips);
      const val = minimax(newBoard, opponent, depth - 1, maximizer, weights, alpha, beta);
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
    const val = minimax(newBoard, opponent, depth - 1, maximizer, weights, alpha, beta);
    value = Math.min(value, val);
    beta = Math.min(beta, val);
    if (beta <= alpha) break;
  }
  return value;
};

export const bestMove = (
  board,
  player,
  depth,
  weights = DEFAULT_WEIGHTS,
  options = {},
) => {
  const movesObj = computeLegalMoves(board, player);
  const entries = Object.entries(movesObj);
  if (entries.length === 0) return null;
  const opponent = player === 'B' ? 'W' : 'B';
  let best = null;
  let bestVal = -Infinity;
  let evaluated = 0;
  const { onProgress } = options;
  const totalMoves = entries.length;
  for (const [key, flips] of entries) {
    const [r, c] = key.split('-').map(Number);
    const newBoard = applyMove(board, r, c, player, flips);
    const val = minimax(
      newBoard,
      opponent,
      depth - 1,
      player,
      weights,
      -Infinity,
      Infinity,
    );
    if (val > bestVal) {
      bestVal = val;
      best = [r, c];
    }
    evaluated += 1;
    if (typeof onProgress === 'function') {
      onProgress({
        evaluated,
        total: totalMoves,
        candidate: [r, c],
        score: val,
        bestMove: best,
        bestScore: bestVal,
        completed: evaluated === totalMoves,
      });
    }
  }
  return best;
};

