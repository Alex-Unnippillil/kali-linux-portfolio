import { Chess } from 'chess.js';
import {
  generateMoves,
  WHITE,
  PAWN,
  KNIGHT,
  BISHOP,
  ROOK,
  QUEEN,
  KING,
  sqToAlg,
} from '../components/apps/chess';

const pieceMap: Record<string, number> = {
  p: -PAWN,
  n: -KNIGHT,
  b: -BISHOP,
  r: -ROOK,
  q: -QUEEN,
  k: -KING,
  P: PAWN,
  N: KNIGHT,
  B: BISHOP,
  R: ROOK,
  Q: QUEEN,
  K: KING,
};

const boardFromFen = (fen: string) => {
  const board = new Int8Array(128);
  const [placement] = fen.split(' ');
  let rank = 7;
  let file = 0;
  for (const char of placement) {
    if (char === '/') {
      rank -= 1;
      file = 0;
      continue;
    }
    if (/\d/.test(char)) {
      file += parseInt(char, 10);
      continue;
    }
    const piece = pieceMap[char];
    if (piece !== undefined) {
      const sq = rank * 16 + file;
      board[sq] = piece;
    }
    file += 1;
  }
  return board;
};

describe('generateMoves', () => {
  it('matches chess.js for a pinned piece scenario', () => {
    const fen = '4k3/4r3/8/8/8/8/4Q3/4K3 w - - 0 1';
    const board = boardFromFen(fen);
    const produced = new Set(
      generateMoves(board, WHITE).map((move) => `${sqToAlg(move.from)}${sqToAlg(move.to)}`),
    );
    const game = new Chess(fen);
    const expected = new Set(
      game.moves({ verbose: true }).map((move) => `${move.from}${move.to}`),
    );
    expect(produced).toEqual(expected);
  });

  it('generates symmetric moves for lone kings', () => {
    const fen = '8/8/8/3k4/8/8/3K4/8 w - - 0 1';
    const board = boardFromFen(fen);
    const produced = generateMoves(board, WHITE).map((move) => `${sqToAlg(move.from)}${sqToAlg(move.to)}`);
    const game = new Chess(fen);
    const expected = game
      .moves({ verbose: true })
      .map((move) => `${move.from}${move.to}`)
      .sort();
    expect(produced.sort()).toEqual(expected);
  });
});
