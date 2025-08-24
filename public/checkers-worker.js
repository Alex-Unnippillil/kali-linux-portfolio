const directions = {
  red: [
    [-1, -1],
    [-1, 1],
  ],
  black: [
    [1, -1],
    [1, 1],
  ],
};

let SIZE = 8;
let GIVEAWAY = false;
const inBounds = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

const cloneBoard = (board) => board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

const applyMove = (board, move) => {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from[0]][move.from[1]];
  newBoard[move.from[0]][move.from[1]] = null;
  const path = move.path ? move.path.slice(1) : [move.to];
  let r = move.from[0];
  let c = move.from[1];
  for (let i = 0; i < path.length; i++) {
    const [nr, nc] = path[i];
    if (move.captures && move.captures[i]) {
      const [cr, cc] = move.captures[i];
      newBoard[cr][cc] = null;
    } else if (move.captured && i === 0) {
      const [cr, cc] = move.captured;
      newBoard[cr][cc] = null;
    }
    r = nr;
    c = nc;
  }
  newBoard[r][c] = piece;
  if (
    !piece.king &&
    ((piece.color === 'red' && r === 0) || (piece.color === 'black' && r === SIZE - 1))
  ) {
    piece.king = true;
  }
  return newBoard;
};

const getPieceMoves = (board, r, c) => {
  const piece = board[r][c];
  if (!piece) return [];

  const captureMoves = [];

  const explore = (b, pr, pc, path, caps) => {
    const p = b[pr][pc];
    const dirs = [...directions[p.color]];
    if (p.king) dirs.push(...directions[p.color === 'red' ? 'black' : 'red']);
    let found = false;
    for (const [dr, dc] of dirs) {
      const r1 = pr + dr;
      const c1 = pc + dc;
      const r2 = pr + dr * 2;
      const c2 = pc + dc * 2;
      if (!inBounds(r2, c2)) continue;
      const enemy = b[r1][c1];
      if (enemy && enemy.color !== p.color && !b[r2][c2]) {
        found = true;
        const step = { from: [pr, pc], to: [r2, c2], captured: [r1, c1] };
        const nb = applyMove(b, step);
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
  if (piece.king) dirs.push(...directions[piece.color === 'red' ? 'black' : 'red']);
  const moves = [];
  for (const [dr, dc] of dirs) {
    const r1 = r + dr;
    const c1 = c + dc;
    if (!inBounds(r1, c1)) continue;
    if (!board[r1][c1]) moves.push({ from: [r, c], to: [r1, c1], path: [[r, c], [r1, c1]] });
  }
  return moves;
};

const getAllMoves = (board, color) => {
  let result = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c]?.color === color) {
        const moves = getPieceMoves(board, r, c);
        if (moves.length) result = result.concat(moves);
      }
    }
  }
  const anyCapture = result.some((m) => m.captures?.length || m.captured);
  return anyCapture
    ? result.filter((m) => m.captures?.length || m.captured)
    : result;
};

const boardToBitboards = (board) => {
  let red = 0n;
  let black = 0n;
  let kings = 0n;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const bit = 1n << BigInt((SIZE - 1 - r) * SIZE + c);
      if (piece.color === 'red') red |= bit;
      else black |= bit;
      if (piece.king) kings |= bit;
    }
  }
  return { red, black, kings };
};

const bitCount = (n) => {
  let count = 0;
  while (n) {
    n &= n - 1n;
    count++;
  }
  return count;
};

const evaluate = (board) => {
  const { red, black, kings } = boardToBitboards(board);
  const redKings = red & kings;
  const blackKings = black & kings;
  const redMen = bitCount(red) - bitCount(redKings);
  const blackMen = bitCount(black) - bitCount(blackKings);
  const mobility =
    getAllMoves(board, 'red').length - getAllMoves(board, 'black').length;
  let kingSafety = 0;
  const center = (SIZE - 1) / 2;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const piece = board[r][c];
      if (piece?.king) {
        const dist = Math.abs(r - center) + Math.abs(c - center);
        const val = (SIZE - dist) / SIZE;
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
  return GIVEAWAY ? -score : score;
};
const transKey = (board, color) => {
  const { red, black, kings } = boardToBitboards(board);
  return `${red}-${black}-${kings}-${color}`;
};

const minimax = (
  board,
  color,
  depth,
  alpha,
  beta,
  maximizing,
  start,
  limit,
  table,
) => {
  if (Date.now() - start >= limit) return { score: evaluate(board) };
  const key = transKey(board, maximizing ? color : color === 'red' ? 'black' : 'red');
  const cached = table.get(key);
  if (cached && cached.depth >= depth) return { score: cached.score };
  if (depth === 0) {
    const score = evaluate(board);
    table.set(key, { depth, score });
    return { score };
  }
  const turn = maximizing ? color : color === 'red' ? 'black' : 'red';
  const moves = getAllMoves(board, turn);
  if (!moves.length) return { score: maximizing ? -Infinity : Infinity };
  let bestMove;
  for (const move of moves) {
    const next = applyMove(board, move);
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

self.onmessage = (e) => {
  const { board, color, maxDepth, timeLimit, config } = e.data;
  SIZE = config?.size || 8;
  GIVEAWAY = config?.giveaway || false;
  const start = Date.now();
  const table = new Map();
  let best = null;
  const limit = timeLimit || 200;
  for (let d = 1; d <= maxDepth; d++) {
    if (Date.now() - start > limit) break;
    const { move } = minimax(board, color, d, -Infinity, Infinity, true, start, limit, table);
    if (move) best = move;
  }
  postMessage(best);
};
