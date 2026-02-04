import { createGame, tick, SAFE_SPAWN_RADIUS } from '../components/apps/asteroids-engine';

const snapshotState = (state: any) => ({
  ship: {
    x: state.ship.x,
    y: state.ship.y,
    angle: state.ship.angle,
    velX: state.ship.velX,
    velY: state.ship.velY,
    lives: state.lives,
  },
  level: state.level,
  score: state.score,
  asteroids: state.asteroids.map((a: any) => ({
    x: a.x,
    y: a.y,
    r: a.r,
    dx: a.dx,
    dy: a.dy,
  })),
});

describe('asteroids engine', () => {
  it('is deterministic for identical seeds and inputs', () => {
    const gameA = createGame({ worldW: 800, worldH: 600, seed: 'test', startLevel: 1 });
    const gameB = createGame({ worldW: 800, worldH: 600, seed: 'test', startLevel: 1 });
    const input = { turn: 0.2, thrust: 0.6, fire: false, hyperspace: false, useInventory: null };
    for (let i = 0; i < 10; i += 1) {
      tick(gameA, input, 16);
      tick(gameB, input, 16);
    }
    expect(snapshotState(gameA)).toEqual(snapshotState(gameB));
  });

  it('ends the run when lives reach zero', () => {
    const game = createGame({ worldW: 600, worldH: 400, seed: 'test', startLevel: 1 });
    game.lives = 1;
    game.asteroids = [
      {
        x: game.ship.x,
        y: game.ship.y,
        px: game.ship.x,
        py: game.ship.y,
        dx: 0,
        dy: 0,
        r: 25,
      },
    ];
    tick(game, { turn: 0, thrust: 0, fire: false, hyperspace: false, useInventory: null }, 16);
    const gameOver = game.events.find((evt: any) => evt.type === 'gameOver');
    expect(gameOver).toBeDefined();
  });

  it('spawns asteroids outside the safe radius of the ship', () => {
    const game = createGame({ worldW: 1000, worldH: 800, seed: 'spawn-test', startLevel: 1 });
    const { ship } = game;
    const tooClose = game.asteroids.some(
      (a: any) => Math.hypot(a.x - ship.x, a.y - ship.y) < SAFE_SPAWN_RADIUS + a.r,
    );
    expect(tooClose).toBe(false);
  });
});
