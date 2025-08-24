import {
  Player,
  updatePhysics,
  collectCoin,
  COYOTE_TIME,
  JUMP_BUFFER_TIME,
  hitHazard,
} from '@public/apps/platformer/engine.js';
import { Player as TerrainPlayer } from '@apps/platformer/Player.js';
import { Terrain } from '@apps/platformer/Terrain.js';
import { updatePhysics as updatePhysicsTerrain } from '@apps/platformer/physics.js';

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

  test('releasing jump early reduces upward velocity', () => {
    const p = new Player();
    p.onGround = true;
    updatePhysics(p, { left: false, right: false, jump: true }, 0);
    updatePhysics(p, { left: false, right: false, jump: true }, 0.016);
    const vyHeld = p.vy;
    updatePhysics(p, { left: false, right: false, jump: false }, 0.016);
    expect(p.vy).toBeGreaterThan(vyHeld);
  });

  test('hazard tiles are detected', () => {
    const tiles = [[4]];
    expect(hitHazard(tiles, 0, 0)).toBe(true);
    expect(hitHazard(tiles, 1, 0)).toBe(false);
  });

  test('player lands on slope tiles', () => {
    const terrain = new Terrain(16, [
      [0, 0],
      [2, 0],
    ]);
    const p = new TerrainPlayer(2, 0);
    for (let i = 0; i < 60; i++) {
      updatePhysicsTerrain(p, { left: false, right: false, jump: false }, 1 / 60, terrain);
    }
    expect(p.onGround).toBe(true);
    expect(p.y).toBeCloseTo(9, 1);
  });
});
