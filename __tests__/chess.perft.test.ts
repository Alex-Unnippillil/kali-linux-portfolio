import { Chess } from 'chess.js';

const perft = (game: any, depth: number): number => {
  if (depth === 0) return 1;
  let nodes = 0;
  const moves = game.moves();
  for (const move of moves) {
    game.move(move);
    nodes += perft(game, depth - 1);
    game.undo();
  }
  return nodes;
};

test('perft depth 4 from start position matches known nodes', () => {
  const game = new Chess();
  const nodes = perft(game, 4);
  // Known perft result for depth 4 from the standard chess opening position
  expect(nodes).toBe(197281);
});
