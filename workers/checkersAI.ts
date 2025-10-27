export type Color = 'red' | 'black';
export interface Piece { color: Color; king: boolean; }
export type Board = (Piece | null)[][];
export interface Move {
  from: [number, number];
  to: [number, number];
  path: [number, number][];
  captures: [number, number][];
}

const directions: Record<Color, number[][]> = {
  red: [[-1, -1], [-1, 1]],
  black: [[1, -1], [1, 1]],
};

const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

const cloneBoard = (board: Board): Board =>
  board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

const buildCaptureSequences = (
  board: Board,
  start: [number, number],
  r: number,
  c: number,
  color: Color,
  king: boolean,
  path: [number, number][],
  captures: [number, number][],
): Move[] => {
  const dirs = king ? [...directions.red, ...directions.black] : directions[color];
  let sequences: Move[] = [];
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

const getPieceMoves = (
  board: Board,
  r: number,
  c: number,
  enforceCapture = true,
): Move[] => {
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
  const quietMoves: Move[] = [];
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

const getAllMoves = (
  board: Board,
  color: Color,
  enforceCapture: boolean,
): Move[] => {
  let result: Move[] = [];
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

const applyMove = (board: Board, move: Move): { board: Board } => {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from[0]][move.from[1]];
  if (!piece) return { board: newBoard };
  newBoard[move.from[0]][move.from[1]] = null;
  for (const [cr, cc] of move.captures) {
    newBoard[cr][cc] = null;
  }
  const path = move.path.length ? move.path : [move.from, move.to];
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
  return { board: newBoard };
};

const boardToBitboards = (board: Board) => {
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

const bitCount = (n: bigint) => {
  let count = 0;
  while (n) {
    n &= n - 1n;
    count++;
  }
  return count;
};

const evaluate = (board: Board): number => {
  const { red, black, kings } = boardToBitboards(board);
  const redKings = red & kings;
  const blackKings = black & kings;
  const redMen = bitCount(red) - bitCount(redKings);
  const blackMen = bitCount(black) - bitCount(blackKings);
  const mobility =
    getAllMoves(board, 'red', true).length - getAllMoves(board, 'black', true).length;
  return (
    redMen - blackMen +
    1.5 * (bitCount(redKings) - bitCount(blackKings)) +
    0.1 * mobility
  );
};

const alphaBeta = (
  board: Board,
  depth: number,
  maximizing: boolean,
  alpha: number,
  beta: number,
  enforceCapture: boolean,
): { score: number; move?: Move } => {
  if (depth === 0) return { score: evaluate(board) };
  const color: Color = maximizing ? 'red' : 'black';
  const moves = getAllMoves(board, color, enforceCapture);
  if (!moves.length) return { score: maximizing ? -Infinity : Infinity };
  let bestMove = moves[0];
  for (const move of moves) {
    const next = applyMove(board, move).board;
    const { score } = alphaBeta(next, depth - 1, !maximizing, alpha, beta, enforceCapture);
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

const randomPlayout = (
  board: Board,
  color: Color,
  enforceCapture: boolean,
): Color => {
  let current = color;
  let b = cloneBoard(board);
  while (true) {
    const moves = getAllMoves(b, current, enforceCapture);
    if (moves.length === 0) return current === 'red' ? 'black' : 'red';
    const move = moves[Math.floor(Math.random() * moves.length)];
    b = applyMove(b, move).board;
    current = current === 'red' ? 'black' : 'red';
  }
};

const mcts = (
  board: Board,
  color: Color,
  iterations: number,
  enforceCapture: boolean,
): Move | null => {
  const moves = getAllMoves(board, color, enforceCapture);
  if (!moves.length) return null;
  const scores = new Array(moves.length).fill(0);
  for (let i = 0; i < iterations; i++) {
    const idx = i % moves.length;
    const move = moves[idx];
    const nextBoard = applyMove(board, move).board;
    const winner = randomPlayout(nextBoard, color === 'red' ? 'black' : 'red', enforceCapture);
    if (winner === color) scores[idx]++;
  }
  let best = 0;
  for (let i = 1; i < moves.length; i++) {
    if (scores[i] > scores[best]) best = i;
  }
  return moves[best];
};

self.onmessage = (e: MessageEvent) => {
  const { board, color, difficulty, algorithm, enforceCapture } = e.data as {
    board: Board;
    color: Color;
    difficulty: number;
    algorithm: 'alphabeta' | 'mcts';
    enforceCapture: boolean;
  };
  let move: Move | null = null;
  if (algorithm === 'mcts') {
    move = mcts(board, color, Math.max(10, difficulty * 200), enforceCapture);
  } else {
    move = alphaBeta(
      board,
      Math.max(1, difficulty),
      color === 'red',
      -Infinity,
      Infinity,
      enforceCapture,
    ).move || null;
  }
  (self as any).postMessage(move);
};

export {};
