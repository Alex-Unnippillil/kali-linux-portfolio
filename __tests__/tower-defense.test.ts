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
  createWaveRuntime,
  armWaveCountdown,
  stepWaveRuntime,
  updateHighScore,
  getHighScore,
} from '../apps/games/tower-defense';

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

  test('wave runtime progresses and completes', () => {
    const state = createWaveRuntime(
      [['fast', 'tank']],
      { spawnInterval: 0.5, countdownDuration: 0.5, interWaveDelay: 1 },
    );
    armWaveCountdown(state, 0.5);

    let step = stepWaveRuntime(state, 0.25, { activeEnemies: 0 });
    expect(step.spawnedTypes).toHaveLength(0);
    expect(state.countdown).toBeGreaterThan(0);

    step = stepWaveRuntime(state, 0.3, { activeEnemies: 0 });
    expect(step.waveStarted).toBe(1);
    expect(state.running).toBe(true);

    step = stepWaveRuntime(state, 0.5, { activeEnemies: 0 });
    expect(step.spawnedTypes).toEqual(['fast']);

    step = stepWaveRuntime(state, 0.5, { activeEnemies: 1 });
    expect(step.spawnedTypes).toEqual(['tank']);

    step = stepWaveRuntime(state, 0.1, { activeEnemies: 1 });
    expect(step.waveFinished).toBeUndefined();

    step = stepWaveRuntime(state, 0.1, { activeEnemies: 0 });
    expect(step.waveFinished).toBe(1);
    expect(state.completedWaves).toBe(1);
    expect(step.allWavesCleared).toBe(true);
    expect(state.countdown).toBeNull();
  });

  test('high score persistence keeps highest value', () => {
    const data: Record<string, string> = {};
    const storage: Storage = {
      get length() {
        return Object.keys(data).length;
      },
      clear() {
        Object.keys(data).forEach((key) => delete data[key]);
      },
      getItem(key: string) {
        return data[key] ?? null;
      },
      key(index: number) {
        return Object.keys(data)[index] ?? null;
      },
      removeItem(key: string) {
        delete data[key];
      },
      setItem(key: string, value: string) {
        data[key] = value;
      },
    } as Storage;

    expect(getHighScore(storage)).toBe(0);
    expect(updateHighScore(3, storage)).toBe(3);
    expect(getHighScore(storage)).toBe(3);
    expect(updateHighScore(2, storage)).toBe(3);
    expect(updateHighScore(10, storage)).toBe(10);
    expect(getHighScore(storage)).toBe(10);
  });
});
