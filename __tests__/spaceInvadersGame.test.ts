import { createGame, spawnUFO, advanceWave } from '../apps/games/space-invaders';

describe('space-invaders logic', () => {
  test('initializes with shields and inactive ufo', () => {
    const game = createGame();
    expect(game.shields).toHaveLength(3);
    game.shields.forEach((s) => expect(s.hp).toBe(6));
    expect(game.ufo.active).toBe(false);
  });

  test('spawnUFO activates bonus target', () => {
    const game = createGame();
    spawnUFO(game);
    expect(game.ufo.active).toBe(true);
  });

  test('advanceWave increments stage and invader count', () => {
    const game = createGame();
    game.invaders.forEach((i) => (i.alive = false));
    const initialCount = game.invaders.length;
    advanceWave(game);
    expect(game.stage).toBe(2);
    expect(game.invaders.length).toBeGreaterThan(initialCount);
  });
});
