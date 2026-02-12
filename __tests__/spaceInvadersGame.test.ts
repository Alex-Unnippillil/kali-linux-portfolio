import {
  HIGH_SCORE_KEY,
  createGame,
  getInvaderStepInterval,
  loadHighScore,
  persistHighScore,
  spawnUFO,
  stepGame,
} from '../apps/games/space-invaders';

const noRandom = () => 0.99;

describe('space-invaders engine', () => {
  test('player bullet collides with invader and awards points', () => {
    const game = createGame({ randomFn: noRandom });
    const target = game.invaders[0];

    game.bullets.push({
      x: target.x + 1,
      y: target.y + 1,
      dx: 0,
      dy: 0,
      active: true,
      owner: 'player',
    });

    const { events } = stepGame(game, { left: false, right: false, fire: false }, 0);

    expect(target.alive).toBe(false);
    expect(game.score).toBe(target.points);
    expect(events.some((event) => event.type === 'invader-destroyed')).toBe(true);
  });

  test('bullet collision against shields chips health and deactivates bullet', () => {
    const game = createGame({ randomFn: noRandom });
    const shield = game.shields[0];

    game.bullets.push({
      x: shield.x + 4,
      y: shield.y + 4,
      dx: 0,
      dy: 0,
      active: true,
      owner: 'enemy',
    });

    const hpBefore = shield.hp;
    const { events } = stepGame(game, { left: false, right: false, fire: false }, 0.016);

    expect(shield.hp).toBe(hpBefore - 1);
    expect(game.bullets[0].active).toBe(false);
    expect(events.some((event) => event.type === 'shield-hit')).toBe(true);
  });

  test('enemy bullet collision with player reduces life', () => {
    const game = createGame({ randomFn: noRandom });
    const bullet = {
      x: game.player.x + 2,
      y: game.player.y + 2,
      dx: 0,
      dy: 0,
      active: true,
      owner: 'enemy' as const,
    };
    game.bullets.push(bullet);

    const livesBefore = game.lives;
    const { events } = stepGame(game, { left: false, right: false, fire: false }, 0.016);

    expect(game.lives).toBe(livesBefore - 1);
    expect(events.some((event) => event.type === 'life-lost')).toBe(true);
  });

  test('invaders reverse direction and step down at edge', () => {
    const game = createGame({ randomFn: noRandom });
    game.invaders.forEach((invader) => {
      invader.x = game.width - invader.w - 10;
    });
    const yBefore = game.invaders[0].y;
    game.invaderStepTimer = 1;

    stepGame(game, { left: false, right: false, fire: false }, 0.016);

    expect(game.invaderDir).toBe(-1);
    expect(game.invaders[0].y).toBe(yBefore + 12);
  });

  test('march interval gets faster as fewer invaders remain', () => {
    const dense = getInvaderStepInterval(1, 1, 1, 0);
    const sparse = getInvaderStepInterval(0.2, 1, 1, 0);

    expect(sparse).toBeLessThan(dense);
  });

  test('top invader row scores higher than bottom row', () => {
    const topGame = createGame({ randomFn: noRandom });
    const topInvader = topGame.invaders.find((invader) => invader.row === 0);
    expect(topInvader).toBeDefined();
    if (!topInvader) return;

    topGame.bullets.push({
      x: topInvader.x + 1,
      y: topInvader.y + 1,
      dx: 0,
      dy: 0,
      active: true,
      owner: 'player',
    });
    stepGame(topGame, { left: false, right: false, fire: false }, 0);

    const bottomGame = createGame({ randomFn: noRandom });
    const maxRow = Math.max(...bottomGame.invaders.map((invader) => invader.row));
    const bottomInvader = bottomGame.invaders.find((invader) => invader.row === maxRow);
    expect(bottomInvader).toBeDefined();
    if (!bottomInvader) return;

    bottomGame.bullets.push({
      x: bottomInvader.x + 1,
      y: bottomInvader.y + 1,
      dx: 0,
      dy: 0,
      active: true,
      owner: 'player',
    });
    stepGame(bottomGame, { left: false, right: false, fire: false }, 0);

    expect(topGame.score).toBeGreaterThan(bottomGame.score);
  });

  test('ufo bonus scores rotate deterministically', () => {
    const game = createGame({ randomFn: () => 0 });
    const seen: number[] = [];

    for (let i = 0; i < 4; i += 1) {
      spawnUFO(game);
      game.bullets.push({
        x: game.ufo.x + game.ufo.w / 2,
        y: game.ufo.y + 2,
        dx: 0,
        dy: 0,
        active: true,
        owner: 'player',
      });
      const { events } = stepGame(game, { left: false, right: false, fire: false }, 0.016);
      const hit = events.find((event) => event.type === 'ufo-destroyed');
      if (hit?.value) seen.push(hit.value);
    }

    expect(seen).toEqual([50, 100, 150, 300]);
  });

  test('high score persistence reads and writes storage', () => {
    const fakeStorage = {
      store: new Map<string, string>(),
      getItem(key: string) {
        return this.store.has(key) ? this.store.get(key)! : null;
      },
      setItem(key: string, value: string) {
        this.store.set(key, value);
      },
    };

    expect(loadHighScore(fakeStorage)).toBe(0);
    persistHighScore(700, fakeStorage);
    expect(fakeStorage.getItem(HIGH_SCORE_KEY)).toBe('700');
    persistHighScore(120, fakeStorage);
    expect(loadHighScore(fakeStorage)).toBe(700);
    persistHighScore(1440, fakeStorage);
    expect(loadHighScore(fakeStorage)).toBe(1440);
  });
});
