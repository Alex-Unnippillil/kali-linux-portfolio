import { Chess } from 'chess.js';

test('illegal moves are rejected', () => {
  const game = new Chess();
  expect(() => game.move({ from: 'e2', to: 'e5' })).toThrow();
});

test('PGN import and export roundtrip', () => {
  const game = new Chess();
  const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6';
  game.loadPgn(pgn);
  expect(game.history().join(' ')).toBe('e4 e5 Nf3 Nc6 Bb5 a6');
  const exported = game.pgn();
  const game2 = new Chess();
  game2.loadPgn(exported);
  expect(game2.history().join(' ')).toBe('e4 e5 Nf3 Nc6 Bb5 a6');
});
