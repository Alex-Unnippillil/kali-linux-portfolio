import {
  initialBoard,
  getMoves,
  flipsForMove,
  makeMove,
  countBits,
  negamax,
  bitIndex,
} from '@apps/reversi/engine';

describe('Reversi bitboard engine', () => {
  test('initial position generates correct moves', () => {
    const board = initialBoard();
    const moves = getMoves(board.black, board.white);
    const indices: number[] = [];
    let m = moves;
    while (m) {
      const move = m & -m;
      indices.push(bitIndex(move));
      m ^= move;
    }
    expect(indices.sort((a, b) => a - b)).toEqual([19, 26, 37, 44]);
    expect(countBits(moves)).toBe(4);
  });

  test('flipsForMove and makeMove update board correctly', () => {
    const board = initialBoard();
    const move = 1n << 19n; // (2,3)
    const flips = flipsForMove(board.black, board.white, move);
    expect(flips).toBe(1n << 27n);
    const { player: newBlack, opponent: newWhite } = makeMove(
      board.black,
      board.white,
      move
    );
    expect((newBlack & move) !== 0n).toBe(true);
    expect((newBlack & (1n << 27n)) !== 0n).toBe(true);
    expect((newWhite & (1n << 27n)) === 0n).toBe(true);
  });

  test('negamax returns a legal move', () => {
    const board = initialBoard();
    const { move } = negamax(board.black, board.white, 4);
    const moves = getMoves(board.black, board.white);
    expect(move).not.toBe(0n);
    expect((move & moves) !== 0n).toBe(true);
  });
});
