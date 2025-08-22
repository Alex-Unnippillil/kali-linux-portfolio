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

test('perft depth 5 from start position matches known nodes', () => {
  const game = new Chess();
  const nodes = perft(game, 5);
  expect(nodes).toBe(4865609);
});
