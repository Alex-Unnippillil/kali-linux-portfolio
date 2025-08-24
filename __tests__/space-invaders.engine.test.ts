import { createGame, march, handleCollisions, nextWave } from '../apps/space-invaders/engine';
import Projectile from '../apps/space-invaders/projectile';

describe('space invaders engine', () => {
  test('formation marches and drops faster as rows vanish', () => {
    const state = createGame(300, 2, 2);
    const initialY = state.rows[0][0].y;
    const dir = state.dir;
    while (state.dir === dir) march(state);
    const firstDrop = state.rows[1][0].y - (initialY + 30); // row1 initial y
    state.rows[0].forEach((inv) => (inv.alive = false));
    const dir2 = state.dir;
    while (state.dir === dir2) march(state);
    const secondDrop = state.rows[1][0].y - (initialY + 30 + firstDrop);
    expect(secondDrop).toBeGreaterThan(firstDrop);
  });

  test('projectile collision removes invader and bullet', () => {
    const state = createGame(200, 1, 1);
    const inv = state.invaders[0];
    const b = Projectile.get(inv.x + inv.w / 2, inv.y + inv.h, -100);
    state.playerBullets.push(b);
    handleCollisions(state.playerBullets, state);
    expect(inv.alive).toBe(false);
    expect(b.active).toBe(false);
  });

  test('wave progression spawns new formation', () => {
    const state = createGame(200, 1, 1);
    state.invaders.forEach((i) => (i.alive = false));
    nextWave(state);
    expect(state.wave).toBe(2);
    expect(state.invaders.some((i) => i.alive)).toBe(true);
  });
});
