import {
  Player,
  updatePhysics,
  collectCoin,
  movePlayer,
  COYOTE_TIME,
  JUMP_BUFFER_TIME,
  countCoins,
  isLevelComplete,
} from '../public/apps/platformer/engine.js';

const baseInput = (overrides = {}) => ({
  left: false,
  right: false,
  jumpHeld: false,
  jumpPressed: false,
  jumpReleased: false,
  ...overrides,
});

describe('platformer mechanics', () => {
  test('coyote time allows late jump before window closes', () => {
    const p = new Player();
    p.onGround = true;
    updatePhysics(p, baseInput(), 0);
    p.onGround = false;
    updatePhysics(p, baseInput(), COYOTE_TIME / 2);
    updatePhysics(p, baseInput({ jumpHeld: true, jumpPressed: true }), 0);
    expect(p.vy).toBeLessThan(0);
  });

  test('coyote time prevents jump after expiry', () => {
    const p = new Player();
    p.onGround = true;
    updatePhysics(p, baseInput(), 0);
    p.onGround = false;
    updatePhysics(p, baseInput(), COYOTE_TIME * 1.1);
    updatePhysics(p, baseInput({ jumpHeld: true, jumpPressed: true }), 0);
    expect(p.vy).toBeGreaterThanOrEqual(0);
  });

  test('jump buffer triggers on press, not on hold', () => {
    const p = new Player();
    p.onGround = false;
    updatePhysics(p, baseInput({ jumpHeld: true, jumpPressed: true }), 0);
    updatePhysics(p, baseInput({ jumpHeld: true }), JUMP_BUFFER_TIME / 2);
    p.onGround = true;
    updatePhysics(p, baseInput({ jumpHeld: false }), 0);
    expect(p.vy).toBeLessThan(0);
  });

  test('holding jump does not refresh the buffer', () => {
    const p = new Player();
    p.onGround = false;
    updatePhysics(p, baseInput({ jumpHeld: true, jumpPressed: true }), 0);
    updatePhysics(p, baseInput({ jumpHeld: true }), JUMP_BUFFER_TIME * 1.1);
    p.onGround = true;
    updatePhysics(p, baseInput({ jumpHeld: true }), 0);
    expect(p.vy).toBeGreaterThanOrEqual(0);
  });

  test('vertical collision cancels downward speed', () => {
    const p = new Player();
    p.vy = 300;
    const tiles = [
      [0],
      [1],
    ];
    movePlayer(p, tiles, 16, 0.1);
    expect(p.onGround).toBe(true);
    expect(p.vy).toBe(0);
    expect(p.y).toBeCloseTo(2);
  });

  test('horizontal collision cancels horizontal speed', () => {
    const p = new Player();
    p.vx = 200;
    const tiles = [[0, 1]];
    movePlayer(p, tiles, 16, 0.1);
    expect(p.vx).toBe(0);
    expect(p.x).toBeCloseTo(2);
  });

  test('level completion triggers once coins are gone', () => {
    const tiles = [[5]];
    expect(countCoins(tiles)).toBe(1);
    const remaining = collectCoin(tiles, 0, 0) ? 0 : 1;
    expect(isLevelComplete(remaining, 1)).toBe(true);
  });
});
