import {
  createGame,
  handleFlipperHit,
  flippersEnabled,
  nudge,
  update,
  TILT_DURATION,
  FLIPPER_SCORE,
} from '../components/apps/pinballPhysics';

test('flipper collision adds score', () => {
  const game = createGame();
  const initial = game.score;
  handleFlipperHit(game, 'left');
  expect(game.score).toBe(initial + FLIPPER_SCORE);
});

test('tilt disables flippers briefly', () => {
  const game = createGame();
  expect(flippersEnabled(game)).toBe(true);
  nudge(game, 100); // exceed threshold
  expect(flippersEnabled(game)).toBe(false);
  update(game, TILT_DURATION);
  expect(flippersEnabled(game)).toBe(true);
});
