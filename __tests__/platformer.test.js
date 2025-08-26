import { Player, updatePhysics, collectCoin, movePlayer, COYOTE_TIME, JUMP_BUFFER_TIME } from '../public/apps/platformer/engine.js';

describe('platformer mechanics', () => {
  test('coyote time allows late jump', () => {
    const p = new Player();
    p.onGround = true;
    updatePhysics(p, { left: false, right: false, jump: false }, 0); // set coyote
    p.onGround = false;
    updatePhysics(p, { left: false, right: false, jump: false }, COYOTE_TIME / 2);
    updatePhysics(p, { left: false, right: false, jump: true }, 0);
    expect(p.vy).toBeLessThan(0);
  });

  test('jump buffering queues jump', () => {
    const p = new Player();
    p.onGround = false;
    updatePhysics(p, { left: false, right: false, jump: true }, 0); // press jump in air
    updatePhysics(p, { left: false, right: false, jump: false }, JUMP_BUFFER_TIME / 2);
    p.onGround = true; // land
    updatePhysics(p, { left: false, right: false, jump: false }, 0);
    expect(p.vy).toBeLessThan(0);
  });

  test('coin collection increments once', () => {
    const tiles = [[5]];
    let score = 0;
    if (collectCoin(tiles, 0, 0)) score++;
    if (collectCoin(tiles, 0, 0)) score++;
    expect(score).toBe(1);
  });

  test('tile collision prevents falling through ground', () => {
    const p = new Player();
    p.vy = 100;
    const tiles = [
      [0],
      [1],
    ];
    movePlayer(p, tiles, 16, 1);
    expect(p.y).toBe(2);
    expect(p.onGround).toBe(true);
  });
});
