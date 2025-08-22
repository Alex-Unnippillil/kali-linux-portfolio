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

const getPieceMoves = (board, r, c) => {
  const piece = board[r][c];
  if (!piece) return [];
  const dirs = [...directions[piece.color]];
  if (piece.king) dirs.push(...directions[piece.color === 'red' ? 'black' : 'red']);
  const moves = [];
  const captures = [];
  for (const [dr, dc] of dirs) {
    const r1 = r + dr;
    const c1 = c + dc;
    if (!inBounds(r1, c1)) continue;
    if (!board[r1][c1]) {
      moves.push({ from: [r, c], to: [r1, c1] });
    } else if (board[r1][c1]?.color !== piece.color) {
      const r2 = r + dr * 2;
      const c2 = c + dc * 2;
      if (inBounds(r2, c2) && !board[r2][c2]) {
        captures.push({ from: [r, c], to: [r2, c2], captured: [r1, c1] });
      }
    }
  }
  return captures.length ? captures : moves;
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
  const anyCapture = result.some((m) => m.captured);
  return anyCapture ? result.filter((m) => m.captured) : result;
};

const applyMove = (board, move) => {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from[0]][move.from[1]];
  newBoard[move.from[0]][move.from[1]] = null;
  newBoard[move.to[0]][move.to[1]] = piece;
  if (move.captured) {
    const [cr, cc] = move.captured;
    newBoard[cr][cc] = null;
  }
  if (
    !piece.king &&
    ((piece.color === 'red' && move.to[0] === 0) ||
      (piece.color === 'black' && move.to[0] === SIZE - 1))
  ) {
    piece.king = true;
  }
  return newBoard;
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
  const score =
    redMen - blackMen +
    1.5 * (bitCount(redKings) - bitCount(blackKings)) +
    0.1 * mobility;
  return GIVEAWAY ? -score : score;
};

const minimax = (board, depth, maximizing, alpha, beta) => {
  if (depth === 0) return { score: evaluate(board) };
  const color = maximizing ? 'red' : 'black';
  const moves = getAllMoves(board, color);
  if (!moves.length) return { score: maximizing ? -Infinity : Infinity };
  let bestMove = moves[0];
  for (const move of moves) {
    const next = applyMove(board, move);
    const { score } = minimax(next, depth - 1, !maximizing, alpha, beta);
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

self.onmessage = (e) => {
  const { board, color, maxDepth, config } = e.data;
  SIZE = config?.size || 8;
  GIVEAWAY = config?.giveaway || false;
  const start = Date.now();
  let best = null;
  for (let d = 1; d <= maxDepth; d++) {
    const { move } = minimax(board, d, color === 'red', -Infinity, Infinity);
    if (move) best = move;
    if (Date.now() - start > 300) break;
  }
  postMessage(best);
};
