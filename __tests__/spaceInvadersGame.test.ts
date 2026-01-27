import {
  createGame,
  spawnUFO,
  advanceWave,
  stepGame,
} from '../apps/games/space-invaders';

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

  test('paused step prevents player movement', () => {
    const game = createGame();
    const startX = game.player.x;
    stepGame(game, { left: false, right: true, fire: false }, 1, {
      paused: true,
    });
    expect(game.player.x).toBe(startX);
  });

  test('game over updates high score', () => {
    const game = createGame();
    game.highScore = 10;
    game.score = 20;
    game.lives = 1;
    game.bullets.push({
      x: game.player.x + 1,
      y: game.player.y + 1,
      dx: 0,
      dy: 0,
      active: true,
      owner: 'enemy',
    });
    stepGame(game, { left: false, right: false, fire: false }, 0.016);
    expect(game.gameOver).toBe(true);
    expect(game.highScore).toBe(20);
  });
});
