import {
  getPath,
  resetPathCache,
  pathComputationCount,
  createProjectilePool,
  fireProjectile,
  deactivateProjectile,
  getTowerDPS,
  computeFlowField,
  computeDistanceField,
  generateWaveEnemies,
  START,
  GOAL,
} from '@components/apps/tower-defense-core';

describe('tower defense core', () => {
  test('path computed once and reused', () => {
    resetPathCache();
    const towers: any[] = [];
    getPath(towers);
    getPath(towers);
    expect(pathComputationCount).toBe(1);
    const towers2 = [{ x: 1, y: 1 }];
    getPath(towers2);
    getPath(towers2);
    expect(pathComputationCount).toBe(2);
  });

  test('projectile pool reused', () => {
    const pool = createProjectilePool(1);
    const p1 = fireProjectile(pool, { x: 0, y: 0, targetId: 1, damage: 1, speed: 1 });
    if (!p1) throw new Error('no projectile');
    deactivateProjectile(p1);
    const p2 = fireProjectile(pool, { x: 1, y: 1, targetId: 2, damage: 1, speed: 1 });
    expect(p2).toBe(p1);
  });

  test('DPS increases on upgrade', () => {
    const d1 = getTowerDPS('single', 1);
    const d2 = getTowerDPS('single', 2);
    expect(d2).toBeGreaterThan(d1);
  });

  test('flow field respects obstacles', () => {
    const { field } = computeFlowField([]);
    expect(field[START.y][START.x]).toEqual({ dx: 1, dy: 0 });
    const { field: field2 } = computeFlowField([{ x: START.x + 1, y: START.y }]);
    expect(field2[START.y][START.x]).toEqual({ dx: 0, dy: -1 });
  });

  test('distance field matches Manhattan distance', () => {
    const dist = computeDistanceField([]);
    expect(dist[START.y][START.x]).toBe(GOAL.x - START.x);
  });

  test('wave progression increases difficulty', () => {
    const w1 = generateWaveEnemies(1);
    const w3 = generateWaveEnemies(3);
    expect(w1.length).toBe(6);
    expect(w3.length).toBe(8);
    expect(w3[0].health).toBeGreaterThan(w1[0].health);
  });
});
