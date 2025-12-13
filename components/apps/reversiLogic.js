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

export const getFlipsForMove = (board, r, c, player) => {
  if (board[r][c]) return [];
  const opponent = player === 'B' ? 'W' : 'B';
  const flips = [];
  const seen = new Set();
  DIRECTIONS.forEach(([dr, dc]) => {
    let i = r + dr;
    let j = c + dc;
    const chain = [];
    while (inside(i, j) && board[i][j] === opponent) {
      chain.push([i, j]);
      i += dr;
      j += dc;
    }
    if (chain.length && inside(i, j) && board[i][j] === player) {
      chain.forEach(([cr, cc]) => {
        const key = `${cr}-${cc}`;
        if (!seen.has(key)) {
          flips.push([cr, cc]);
          seen.add(key);
        }
      });
    }
  });
  return flips;
};

export const computeLegalMoves = (board, player) => {
  const moves = {};
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c]) continue;
      const flips = getFlipsForMove(board, r, c, player);
      if (flips.length) moves[`${r}-${c}`] = flips;
    }
  }
  return moves;
};

export const applyMove = (board, r, c, player, flips = undefined) => {
  const derivedFlips = flips ?? getFlipsForMove(board, r, c, player);
  if (!derivedFlips.length) {
    throw new Error('Illegal move: no flips available');
  }
  const newBoard = board.map((row) => row.slice());
  newBoard[r][c] = player;
  derivedFlips.forEach(([fr, fc]) => {
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

export const boardKey = (board) =>
  board.map((row) => row.map((cell) => cell || '.').join('')).join('/');

export const getTurnResolution = (board, player) => {
  const legalMoves = computeLegalMoves(board, player);
  if (Object.keys(legalMoves).length > 0) {
    return { kind: 'play', legalMoves };
  }
  const opponent = player === 'B' ? 'W' : 'B';
  const opponentMoves = computeLegalMoves(board, opponent);
  if (Object.keys(opponentMoves).length > 0) {
    return { kind: 'pass', nextPlayer: opponent, legalMoves };
  }
  const score = countPieces(board);
  const winner = score.black === score.white ? 'D' : score.black > score.white ? 'B' : 'W';
  return { kind: 'gameover', score, winner };
};

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

const cornerAdjacents = [
  { corner: [0, 0], adj: [[0, 1], [1, 0], [1, 1]] },
  { corner: [0, SIZE - 1], adj: [[0, SIZE - 2], [1, SIZE - 1], [1, SIZE - 2]] },
  { corner: [SIZE - 1, 0], adj: [[SIZE - 2, 0], [SIZE - 1, 1], [SIZE - 2, 1]] },
  {
    corner: [SIZE - 1, SIZE - 1],
    adj: [
      [SIZE - 2, SIZE - 1],
      [SIZE - 1, SIZE - 2],
      [SIZE - 2, SIZE - 2],
    ],
  },
];

const lerp = (a, b, t) => a + (b - a) * t;

export const DEFAULT_WEIGHTS = {
  mobilityStart: 8,
  mobilityEnd: 2,
  parityStart: 0,
  parityEnd: 12,
  corners: 25,
  edges: 6,
  cornerAdjPenalty: -10,
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
    if (board[0][i] === player) edgeScore += 1;
    else if (board[0][i] === opponent) edgeScore -= 1;
    if (board[SIZE - 1][i] === player) edgeScore += 1;
    else if (board[SIZE - 1][i] === opponent) edgeScore -= 1;
    if (board[i][0] === player) edgeScore += 1;
    else if (board[i][0] === opponent) edgeScore -= 1;
    if (board[i][SIZE - 1] === player) edgeScore += 1;
    else if (board[i][SIZE - 1] === opponent) edgeScore -= 1;
  }

  let cornerAdjPenalty = 0;
  cornerAdjacents.forEach(({ corner, adj }) => {
    const [cr, cc] = corner;
    adj.forEach(([r, c]) => {
      if (board[r][c] === player && board[cr][cc] !== player) {
        cornerAdjPenalty += 1;
      } else if (board[r][c] === opponent && board[cr][cc] !== opponent) {
        cornerAdjPenalty -= 1;
      }
    });
  });

  const { black, white } = countPieces(board);
  const filled = black + white;
  const phase = filled / (SIZE * SIZE);
  const parity = player === 'B' ? black - white : white - black;

  const mobilityWeight = lerp(weights.mobilityStart, weights.mobilityEnd, phase);
  const parityWeight = lerp(weights.parityStart, weights.parityEnd, phase);

  return (
    weights.corners * cornerScore +
    mobilityWeight * mobility +
    weights.edges * edgeScore +
    parityWeight * parity +
    weights.cornerAdjPenalty * cornerAdjPenalty
  );
};

const orderMoves = (entries) => {
  const cornerKeys = new Set(corners.map(([r, c]) => `${r}-${c}`));
  const edgeKeys = new Set();
  for (let i = 1; i < SIZE - 1; i += 1) {
    edgeKeys.add(`0-${i}`);
    edgeKeys.add(`${SIZE - 1}-${i}`);
    edgeKeys.add(`${i}-0`);
    edgeKeys.add(`${i}-${SIZE - 1}`);
  }

  const isCornerAdjacent = (r, c) =>
    cornerAdjacents.some(({ adj }) => adj.some(([ar, ac]) => ar === r && ac === c));

  return entries.sort((a, b) => {
    const [aKey] = a;
    const [bKey] = b;
    const [ar, ac] = aKey.split('-').map(Number);
    const [br, bc] = bKey.split('-').map(Number);
    const scoreMove = (r, c) => {
      if (cornerKeys.has(`${r}-${c}`)) return 3;
      if (edgeKeys.has(`${r}-${c}`)) return 2;
      if (isCornerAdjacent(r, c)) return 0;
      return 1;
    };
    return scoreMove(br, bc) - scoreMove(ar, ac);
  });
};

export const minimax = (
  board,
  player,
  depth,
  maximizer,
  weights,
  alpha = -Infinity,
  beta = Infinity,
  table = new Map(),
) => {
  const movesObj = computeLegalMoves(board, player);
  const entries = orderMoves(Object.entries(movesObj));
  const opponent = player === 'B' ? 'W' : 'B';
  if (depth <= 0 || entries.length === 0) {
    if (entries.length === 0) {
      const oppMoves = Object.keys(computeLegalMoves(board, opponent));
      if (oppMoves.length !== 0 && depth > 0) {
        return minimax(board, opponent, depth - 1, maximizer, weights, alpha, beta, table);
      }
      const { black, white } = countPieces(board);
      const diff = maximizer === 'B' ? black - white : white - black;
      return diff * 1000;
    }
    return evaluateBoard(board, maximizer, weights);
  }

  const ttKey = `${boardKey(board)}|${player}|${depth}`;
  if (table.has(ttKey)) return table.get(ttKey);

  let value;
  if (player === maximizer) {
    value = -Infinity;
    for (const [key, flips] of entries) {
      const [r, c] = key.split('-').map(Number);
      const newBoard = applyMove(board, r, c, player, flips);
      const val = minimax(newBoard, opponent, depth - 1, maximizer, weights, alpha, beta, table);
      value = Math.max(value, val);
      alpha = Math.max(alpha, val);
      if (alpha >= beta) break;
    }
  } else {
    value = Infinity;
    for (const [key, flips] of entries) {
      const [r, c] = key.split('-').map(Number);
      const newBoard = applyMove(board, r, c, player, flips);
      const val = minimax(newBoard, opponent, depth - 1, maximizer, weights, alpha, beta, table);
      value = Math.min(value, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
  }
  table.set(ttKey, value);
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
  const entries = orderMoves(Object.entries(movesObj));
  if (entries.length === 0) return null;
  const opponent = player === 'B' ? 'W' : 'B';
  const scores = [];
  let best = null;
  let bestVal = -Infinity;
  let evaluated = 0;
  const { onProgress, randomizeTop = 0 } = options;
  const totalMoves = entries.length;
  const table = new Map();

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
      table,
    );
    scores.push({ move: [r, c], score: val });
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

  if (randomizeTop > 0) {
    const sorted = scores.sort((a, b) => b.score - a.score);
    const top = sorted.slice(0, Math.min(randomizeTop, sorted.length));
    const totalWeight = top.reduce((sum, item, idx) => sum + (top.length - idx), 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < top.length; i += 1) {
      roll -= top.length - i;
      if (roll <= 0) return top[i].move;
    }
  }

  return best;
};

