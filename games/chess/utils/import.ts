import { Chess, Move } from 'chess.js';

// Piece constants matching board representation in the chess app
export const EMPTY = 0;
export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;

export const WHITE = 1;
export const BLACK = -1;

const PIECE_MAP: Record<string, number> = {
  p: PAWN,
  n: KNIGHT,
  b: BISHOP,
  r: ROOK,
  q: QUEEN,
  k: KING,
};

export type ImportResult =
  | { type: 'fen'; fen: string; board: Int8Array; turn: number }
  | { type: 'pgn'; pgn: string; moves: Move[] };

function boardFromChess(chess: Chess): Int8Array {
  const board = new Int8Array(128);
  const pieces = chess.board(); // rank 8 first
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = pieces[r][c];
      if (piece) {
        const sq = (7 - r) * 16 + c;
        const code = PIECE_MAP[piece.type];
        board[sq] = piece.color === 'w' ? code : -code;
      }
    }
  }
  return board;
}

/**
 * Parse a user supplied string as either FEN or PGN.
 * Returns null if parsing fails.
 */
export function parseImport(input: string): ImportResult | null {
  const str = input.trim();
  const chess = new Chess();

  // Try FEN first
  const fields = str.split(/\s+/);
  if (fields.length === 6) {
    try {
      if (chess.load(str)) {
        return {
          type: 'fen',
          fen: str,
          board: boardFromChess(chess),
          turn: chess.turn() === 'w' ? WHITE : BLACK,
        };
      }
    } catch {
      // not FEN
    }
  }

  // Try PGN
  try {
    if (chess.load_pgn(str)) {
      return {
        type: 'pgn',
        pgn: str,
        moves: chess.history({ verbose: true }),
      };
    }
  } catch {
    /* ignore */
  }

  return null;
}

