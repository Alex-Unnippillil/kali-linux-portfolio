import {
  getPath,
  resetPathCache,
  pathComputationCount,
  createProjectilePool,
  fireProjectile,
  deactivateProjectile,
  getTowerDPS,
  createEnemyPool,
  spawnEnemy,
  deactivateEnemy,
  loadSprite,
  clearSpriteCache,
  advanceEnemy,
  START,
  getTowerCost,
  getSellRefund,
} from '../components/apps/tower-defense-core';

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

  test('enemy pool reused', () => {
    const pool = createEnemyPool(1);
    const e1 = spawnEnemy(pool, { id: 1, x: 0, y: 0, pathIndex: 0, progress: 0, health: 1, resistance: 0, baseSpeed: 1, slow: null, dot: null });
    if (!e1) throw new Error('no enemy');
    deactivateEnemy(e1);
    const e2 = spawnEnemy(pool, { id: 2, x: 0, y: 0, pathIndex: 0, progress: 0, health: 1, resistance: 0, baseSpeed: 1, slow: null, dot: null });
    expect(e2).toBe(e1);
  });

  test('sprites are cached', () => {
    clearSpriteCache();
    const s1 = loadSprite('foo.png');
    const s2 = loadSprite('foo.png');
    expect(s1).toBe(s2);
  });

  test('DPS increases on upgrade', () => {
    const d1 = getTowerDPS('single', 1);
    const d2 = getTowerDPS('single', 2);
    expect(d2).toBeGreaterThan(d1);
  });

  test('enemy reaching base reduces life', () => {
    const path = getPath([]);
    const pool = createEnemyPool(1);
    const enemy = spawnEnemy(pool, {
      id: 1,
      x: START.x,
      y: START.y,
      pathIndex: 0,
      progress: 0,
      health: 1,
      resistance: 0,
      baseSpeed: 1,
      slow: null,
      dot: null,
    });
    if (!enemy) throw new Error('no enemy');
    let lives = 2;
    while (true) {
      if (advanceEnemy(enemy, path, 1)) {
        lives -= 1;
        break;
      }
    }
    expect(lives).toBe(1);
  });

  test('sell refunds partial', () => {
    const cost = getTowerCost('single', 1);
    const refund = getSellRefund('single', 1);
    expect(refund).toBe(Math.floor(cost * 0.5));
    expect(refund).toBeLessThan(cost);
  });
});
