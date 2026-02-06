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
    game.shields.forEach((s) => expect(s.hp).toBe(12));
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

  test('invaders reaching player line trigger game over', () => {
    const game = createGame();
    const target = game.invaders[0];
    target.alive = true;
    target.y = game.player.y - target.h + 1;
    stepGame(game, { left: false, right: false, fire: false }, 0.016);
    expect(game.gameOver).toBe(true);
  });

  test('enemy bullets originate from front-line invader per column', () => {
    const game = createGame();
    game.bullets = [];
    game.invaders.forEach((invader) => (invader.alive = false));
    const columnInvaders = game.invaders.filter((invader) => invader.column === 0);
    const top = columnInvaders[0];
    const bottom = columnInvaders[columnInvaders.length - 1];
    top.alive = true;
    bottom.alive = true;
    top.y = 40;
    bottom.y = 140;
    game.enemyCooldown = 0;
    stepGame(game, { left: false, right: false, fire: false }, 0.016);
    const enemyBullet = game.bullets.find((b) => b.active && b.owner === 'enemy');
    expect(enemyBullet).toBeDefined();
    expect(enemyBullet?.y).toBeCloseTo(bottom.y + bottom.h, 5);
  });

  test('player bullet cap limits active shots', () => {
    const game = createGame();
    game.player.cooldown = 0;
    stepGame(game, { left: false, right: false, fire: true }, 0.016);
    const firstCount = game.bullets.filter(
      (bullet) => bullet.active && bullet.owner === 'player',
    ).length;
    expect(firstCount).toBe(1);
    game.player.cooldown = 0;
    stepGame(game, { left: false, right: false, fire: true }, 0.016);
    const secondCount = game.bullets.filter(
      (bullet) => bullet.active && bullet.owner === 'player',
    ).length;
    expect(secondCount).toBe(1);
  });

  test('top row invaders award more points than bottom row', () => {
    const topGame = createGame();
    topGame.invaders.forEach((invader) => (invader.alive = false));
    const topInvader = topGame.invaders.find((invader) => invader.row === 0);
    expect(topInvader).toBeDefined();
    if (!topInvader) return;
    topInvader.alive = true;
    topGame.bullets.push({
      x: topInvader.x + 1,
      y: topInvader.y + 1,
      dx: 0,
      dy: 0,
      active: true,
      owner: 'player',
    });
    stepGame(topGame, { left: false, right: false, fire: false }, 0);
    const topScore = topGame.score;

    const bottomGame = createGame();
    bottomGame.invaders.forEach((invader) => (invader.alive = false));
    const bottomInvader = bottomGame.invaders.find(
      (invader) => invader.row === Math.max(...bottomGame.invaders.map((inv) => inv.row)),
    );
    expect(bottomInvader).toBeDefined();
    if (!bottomInvader) return;
    bottomInvader.alive = true;
    bottomGame.bullets.push({
      x: bottomInvader.x + 1,
      y: bottomInvader.y + 1,
      dx: 0,
      dy: 0,
      active: true,
      owner: 'player',
    });
    stepGame(bottomGame, { left: false, right: false, fire: false }, 0);
    const bottomScore = bottomGame.score;

    expect(topScore).toBeGreaterThan(bottomScore);
  });
});
