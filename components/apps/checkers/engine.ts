export type Color = 'red' | 'black';
export interface Piece { color: Color; king: boolean; }
export type Board = (Piece | null)[][];

export const createBoard = (): Board => {
  const board: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: 'black', king: false };
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: 'red', king: false };
    }
  }
  return board;
};

const directions: Record<Color, number[][]> = {
  red: [
    [-1, -1],
    [-1, 1],
  ],
  black: [
    [1, -1],
    [1, 1],
  ],
};

export const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

export interface Move {
  from: [number, number];
  to: [number, number];
  /**
   * Ordered list of squares visited including the starting square.
   * For simple moves this will contain two entries: the origin and the destination.
   */
  path: [number, number][];
  /** Coordinates of every captured piece in the order they were removed. */
  captures: [number, number][];
}

export const cloneBoard = (board: Board): Board =>
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
  const dirs = king
    ? [...directions.red, ...directions.black]
    : [...directions[color]];
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

    const continuations =
      becameKing
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
        from: start,
        to: [landingR, landingC],
        path: newPath,
        captures: newCaptures,
      });
    }
  }
  return sequences;
};

export const getPieceMoves = (
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
  if (captureMoves.length) {
    if (enforceCapture) return captureMoves;
    // Allow non-capturing moves when capture enforcement is relaxed.
  }

  const dirs = piece.king
    ? [...directions.red, ...directions.black]
    : [...directions[piece.color]];
  const quietMoves: Move[] = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc) || board[nr][nc]) continue;
    quietMoves.push({ from: [r, c], to: [nr, nc], path: [[r, c], [nr, nc]], captures: [] });
  }
  return captureMoves.length ? [...captureMoves, ...quietMoves] : quietMoves;
};

export const getAllMoves = (
  board: Board,
  color: Color,
  enforceCapture = true,
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

export const hasMoves = (
  board: Board,
  color: Color,
  enforceCapture = true,
): boolean => getAllMoves(board, color, enforceCapture).length > 0;

export const applyMove = (
  board: Board,
  move: Move,
): { board: Board; capture: boolean; king: boolean } => {
  const newBoard = cloneBoard(board);
  const [fromR, fromC] = move.from;
  const piece = newBoard[fromR][fromC];
  if (!piece) {
    return { board: newBoard, capture: false, king: false };
  }
  newBoard[fromR][fromC] = null;
  for (const [cr, cc] of move.captures) {
    newBoard[cr][cc] = null;
  }

  const path = move.path.length ? move.path : [move.from, move.to];
  const [destR, destC] = path[path.length - 1];
  const pieceAfterMove = { ...piece };
  let king = false;
  if (
    !pieceAfterMove.king &&
    ((pieceAfterMove.color === 'red' && destR === 0) ||
      (pieceAfterMove.color === 'black' && destR === 7))
  ) {
    pieceAfterMove.king = true;
    king = true;
  }

  newBoard[destR][destC] = pieceAfterMove;
  return { board: newBoard, capture: move.captures.length > 0, king };
};

export const boardToBitboards = (board: Board) => {
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

export const bitCount = (n: bigint) => {
  let count = 0;
  while (n) {
    n &= n - 1n;
    count++;
  }
  return count;
};

export const evaluateBoard = (board: Board): number => {
  const { red, black, kings } = boardToBitboards(board);
  const redKings = red & kings;
  const blackKings = black & kings;
  const redMen = bitCount(red) - bitCount(redKings);
  const blackMen = bitCount(black) - bitCount(blackKings);
  const mobility =
    getAllMoves(board, 'red').length - getAllMoves(board, 'black').length;
  return (
    redMen - blackMen +
    1.5 * (bitCount(redKings) - bitCount(blackKings)) +
    0.1 * mobility
  );
};

export const isDraw = (
  noCaptureMoves: number,
  positions?: Map<string, number>,
) => {
  if (noCaptureMoves >= 40) return true;
  if (positions) {
    for (const count of positions.values()) {
      if (count >= 3) return true;
    }
  }
  return false;
};
