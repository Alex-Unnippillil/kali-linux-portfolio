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
  serializeLevelData,
  deserializeLevelData,
} from '../apps/games/tower-defense';
import type { LevelData } from '../apps/games/tower-defense';

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

  test('level data round-trips through serialization', () => {
    const level: LevelData = {
      path: [
        {
          x: 1,
          y: 2,
        },
      ],
      spawners: [
        {
          x: 0,
          y: 0,
        },
      ],
      towers: [
        {
          x: 3,
          y: 4,
          range: 2,
          damage: 5,
          level: 1,
          type: 'single',
        },
      ],
      waves: [['fast', 'tank']],
    };
    const json = serializeLevelData(level);
    const parsed = deserializeLevelData(json);
    expect(parsed).toEqual(level);
  });

  test('serializeLevelData strips runtime-only tower fields', () => {
    const level: LevelData = {
      path: [],
      spawners: [],
      towers: [
        {
          x: 1,
          y: 1,
          range: 2,
          damage: 3,
          level: 4,
          type: 'single',
        },
      ],
      waves: [],
    };
    (level.towers[0] as any).cool = 99;
    const json = serializeLevelData(level);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const tower = (parsed.towers as any[])[0];
    expect(tower.cool).toBeUndefined();
    expect(tower).toEqual({
      x: 1,
      y: 1,
      range: 2,
      damage: 3,
      level: 4,
      type: 'single',
    });
  });

  test('deserializeLevelData rejects invalid enemy identifiers', () => {
    const json = JSON.stringify({
      path: [],
      spawners: [],
      towers: [],
      waves: [['fast', 'ghost']],
    });
    expect(() => deserializeLevelData(json)).toThrow(/enemy/i);
  });
});
