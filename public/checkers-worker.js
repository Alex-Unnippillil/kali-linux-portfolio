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

const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

const cloneBoard = (board) => board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

const buildCaptureSequences = (
  board,
  start,
  r,
  c,
  color,
  king,
  path,
  captures,
) => {
  const dirs = king ? [...directions.red, ...directions.black] : directions[color];
  let sequences = [];
  for (const [dr, dc] of dirs) {
    const midR = r + dr;
    const midC = c + dc;
    const landingR = r + dr * 2;
    const landingC = c + dc * 2;
    if (!inBounds(midR, midC) || !inBounds(landingR, landingC)) continue;
    const enemy = board[midR][midC];
    if (!enemy || enemy.color === color) continue;
    if (board[landingR][landingC]) continue;

    const nextBoard = cloneBoard(board);
    nextBoard[r][c] = null;
    nextBoard[midR][midC] = null;
    const becameKing =
      !king &&
      ((color === 'red' && landingR === 0) || (color === 'black' && landingR === 7));
    nextBoard[landingR][landingC] = { color, king: king || becameKing };
    const newPath = [...path, [landingR, landingC]];
    const newCaptures = [...captures, [midR, midC]];
    const continuations = becameKing
      ? []
      : buildCaptureSequences(
          nextBoard,
          start,
          landingR,
          landingC,
          color,
          king || becameKing,
          newPath,
          newCaptures,
        );
    if (continuations.length) {
      sequences = sequences.concat(continuations);
    } else {
      sequences.push({
        from: [start[0], start[1]],
        to: [landingR, landingC],
        path: newPath,
        captures: newCaptures,
      });
    }
  }
  return sequences;
};

const getPieceMoves = (board, r, c, enforceCapture = true) => {
  const piece = board[r][c];
  if (!piece) return [];
  const captureMoves = buildCaptureSequences(
    board,
    [r, c],
    r,
    c,
    piece.color,
    piece.king,
    [[r, c]],
    [],
  );
  if (captureMoves.length && enforceCapture) {
    return captureMoves;
  }

  const dirs = piece.king ? [...directions.red, ...directions.black] : directions[piece.color];
  const quietMoves = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc) || board[nr][nc]) continue;
    quietMoves.push({
      from: [r, c],
      to: [nr, nc],
      path: [
        [r, c],
        [nr, nc],
      ],
      captures: [],
    });
  }
  return captureMoves.length ? captureMoves.concat(quietMoves) : quietMoves;
};

const getAllMoves = (board, color, enforceCapture = true) => {
  let result = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === color) {
        const moves = getPieceMoves(board, r, c, enforceCapture);
        if (moves.length) result = result.concat(moves);
      }
    }
  }
  const anyCapture = result.some((m) => m.captures.length);
  return enforceCapture && anyCapture ? result.filter((m) => m.captures.length) : result;
};

const applyMove = (board, move) => {
  const newBoard = cloneBoard(board);
  const [fromR, fromC] = move.from;
  const piece = newBoard[fromR][fromC];
  if (!piece) return newBoard;
  newBoard[fromR][fromC] = null;
  for (const [cr, cc] of move.captures) {
    newBoard[cr][cc] = null;
  }
  const path = move.path && move.path.length ? move.path : [move.from, move.to];
  const [destR, destC] = path[path.length - 1];
  const pieceAfterMove = { ...piece };
  if (
    !pieceAfterMove.king &&
    ((pieceAfterMove.color === 'red' && destR === 0) ||
      (pieceAfterMove.color === 'black' && destR === 7))
  ) {
    pieceAfterMove.king = true;
  }
  newBoard[destR][destC] = pieceAfterMove;
  return newBoard;
};

const boardToBitboards = (board) => {
  let red = 0n;
  let black = 0n;
  let kings = 0n;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const bit = 1n << BigInt((7 - r) * 8 + c);
      if (piece.color === 'red') red |= bit;
      else black |= bit;
      if (piece.king) kings |= bit;
    }
  }
  return { red, black, kings };
};

const bitCount = (n) => {
  let count = 0;
  let x = n;
  while (x) {
    x &= x - 1n;
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
  const mobility = getAllMoves(board, 'red').length - getAllMoves(board, 'black').length;
  return redMen - blackMen + 1.5 * (bitCount(redKings) - bitCount(blackKings)) + 0.1 * mobility;
};

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

const TIME_LIMIT_MS = 45;

let tablebasePromise;

const loadTablebase = () => {
  if (!tablebasePromise) {
    tablebasePromise = fetch('/games/checkers/tablebase.json')
      .then((r) => r.json())
      .catch(() => ({}));
  }
  return tablebasePromise;
};

const serialize = (board, turn) => {
  const { red, black, kings } = boardToBitboards(board);
  return `${red.toString(16)}-${black.toString(16)}-${kings.toString(16)}-${turn}`;
};

const adaptMove = (move) => {
  if (!move) return null;
  const captures = Array.isArray(move.captures)
    ? move.captures.map(([r, c]) => [r, c])
    : move.captured
    ? [[move.captured[0], move.captured[1]]]
    : [];
  const basePath = Array.isArray(move.path) && move.path.length
    ? move.path
    : [move.from, move.to];
  const path = basePath.map(([r, c]) => [r, c]);
  const from = [path[0][0], path[0][1]];
  const toSquare = path[path.length - 1];
  const to = [toSquare[0], toSquare[1]];
  return {
    from,
    to,
    path,
    captures,
  };
};

const negamax = (
  board,
  depth,
  alpha,
  beta,
  colorSign,
  enforceCapture,
  start,
  limit,
  table,
) => {
  if (now() - start >= limit) {
    return { score: colorSign * evaluate(board) };
  }
  if (depth === 0) {
    return { score: colorSign * evaluate(board) };
  }

  const key = `${serialize(board, colorSign === 1 ? 'red' : 'black')}-${depth}-${colorSign}`;
  const cached = table.get(key);
  if (cached && cached.depth >= depth) {
    return cached.outcome;
  }

  const moves = getAllMoves(board, colorSign === 1 ? 'red' : 'black', enforceCapture);
  if (!moves.length) {
    return { score: -10000 };
  }

  let bestScore = -Infinity;
  let bestMove = moves[0];
  const ordered = moves.slice().sort((a, b) => b.captures.length - a.captures.length);

  for (const move of ordered) {
    const nextBoard = applyMove(board, move);
    const result = negamax(nextBoard, depth - 1, -beta, -alpha, -colorSign, enforceCapture, start, limit, table);
    const score = -result.score;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
    if (now() - start >= limit) break;
  }

  const outcome = { score: bestScore, move: bestMove };
  table.set(key, { depth, outcome });
  return outcome;
};

self.onmessage = async (e) => {
  const { board, color, difficulty = 4, maxDepth, enforceCapture = true } = e.data;
  const depthLimit = Math.max(1, Math.min(typeof maxDepth === 'number' ? maxDepth : difficulty || 4, 12));
  const tablebase = await loadTablebase();
  const key = serialize(board, color);
  const cached = tablebase[key];
  if (cached) {
    postMessage(adaptMove(cached));
    return;
  }

  const start = now();
  const colorSign = color === 'red' ? 1 : -1;
  let best = null;
  const table = new Map();

  for (let depth = 1; depth <= depthLimit; depth++) {
    if (now() - start > TIME_LIMIT_MS) break;
    const { move } = negamax(board, depth, -Infinity, Infinity, colorSign, enforceCapture, start, TIME_LIMIT_MS, table);
    if (move) best = move;
    if (now() - start > TIME_LIMIT_MS) break;
  }

  postMessage(best ? adaptMove(best) : null);
};
