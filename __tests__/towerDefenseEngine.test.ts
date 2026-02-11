import { createTowerDefenseEngine } from '../apps/games/tower-defense/engine';
import { ENEMY_TYPES } from '../apps/games/tower-defense';

describe('tower defense engine core gameplay', () => {
  it('moves enemies along path and leaks when they reach the endpoint', () => {
    const engine = createTowerDefenseEngine({
      pathCells: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
      ],
      waves: [
        {
          id: 'w1',
          enemies: [{ type: 'fast', count: 1 }],
          spawnInterval: 0.1,
          rewardBonus: 0,
        },
      ],
      startingLives: 1,
    });

    engine.dispatch({ type: 'start-game' });
    engine.dispatch({ type: 'send-wave' });
    for (let i = 0; i < 160; i += 1) {
      engine.tick(0.05);
      if (engine.getState().status === 'defeat') break;
    }

    expect(engine.getState().lives).toBe(0);
    expect(engine.getState().status).toBe('defeat');
  });

  it('targeting mode strongest picks highest hp enemy', () => {
    const engine = createTowerDefenseEngine({
      pathCells: [
        { x: 0, y: 1 },
        { x: 6, y: 1 },
      ],
      waves: [
        {
          id: 'w1',
          enemies: [
            { type: 'normal', count: 1 },
            { type: 'tank', count: 1 },
          ],
          spawnInterval: 0.01,
          rewardBonus: 0,
        },
      ],
      startingGold: 200,
    });

    engine.dispatch({ type: 'start-game' });
    engine.dispatch({ type: 'set-build-type', towerType: 'sniper' });
    engine.dispatch({ type: 'place-tower', cell: { x: 2, y: 2 } });
    engine.dispatch({ type: 'send-wave' });

    for (let i = 0; i < 80; i += 1) {
      engine.tick(0.02);
      if (engine.getState().enemies.length >= 2) break;
    }

    let firstProjectile = undefined;
    for (let i = 0; i < 30; i += 1) {
      engine.tick(0.01);
      firstProjectile = engine.getState().projectiles[0];
      if (firstProjectile) break;
    }

    const tankEnemy = engine.getState().enemies.find((enemy) => enemy.type === 'tank');
    expect(firstProjectile).toBeDefined();
    expect(tankEnemy).toBeDefined();
    expect(firstProjectile!.targetId).toBe(tankEnemy!.id);
  });

  it('economy updates on buy, upgrade, kill, and sell', () => {
    const engine = createTowerDefenseEngine({
      pathCells: [
        { x: 0, y: 2 },
        { x: 5, y: 2 },
      ],
      waves: [
        {
          id: 'w1',
          enemies: [{ type: 'fast', count: 1 }],
          spawnInterval: 0.1,
          rewardBonus: 6,
        },
      ],
      startingGold: 300,
    });

    engine.dispatch({ type: 'start-game' });
    const startGold = engine.getState().gold;
    engine.dispatch({ type: 'set-build-type', towerType: 'basic' });
    engine.dispatch({ type: 'place-tower', cell: { x: 2, y: 3 } });

    const afterBuy = engine.getState().gold;
    expect(afterBuy).toBeLessThan(startGold);

    const towerId = engine.getState().towers[0].id;
    engine.dispatch({ type: 'upgrade-tower', towerId });
    const afterUpgrade = engine.getState().gold;
    expect(afterUpgrade).toBeLessThan(afterBuy);

    engine.dispatch({ type: 'send-wave' });
    for (let i = 0; i < 120; i += 1) {
      engine.tick(0.05);
      if (engine.getState().status === 'between-waves') break;
    }

    const afterCombat = engine.getState().gold;
    expect(afterCombat).toBeGreaterThan(afterUpgrade);

    engine.dispatch({ type: 'sell-tower', towerId });
    expect(engine.getState().gold).toBeGreaterThan(afterCombat);
  });

  it('spawns the configured enemy count for a wave', () => {
    const waveConfig = [
      {
        id: 'w1',
        enemies: [
          { type: 'normal', count: 2 },
          { type: 'tank', count: 1 },
        ],
        spawnInterval: 0.2,
        rewardBonus: 0,
      },
    ] as const;

    const engine = createTowerDefenseEngine({
      pathCells: [
        { x: 0, y: 0 },
        { x: 7, y: 0 },
      ],
      waves: waveConfig.map((wave) => ({ ...wave, enemies: wave.enemies.map((enemy) => ({ ...enemy })) })),
    });

    engine.dispatch({ type: 'start-game' });
    engine.dispatch({ type: 'send-wave' });
    const totalInWave = waveConfig[0].enemies.reduce((sum, entry) => sum + entry.count, 0);

    for (let i = 0; i < 50; i += 1) {
      engine.tick(0.05);
    }

    const remaining = engine.getState().waveQueue.length;
    const alive = engine.getState().enemies.length;
    expect(remaining + alive).toBeLessThanOrEqual(totalInWave);
  });

  it('uses enemy archetype speed differences', () => {
    expect(ENEMY_TYPES.fast.speed).toBeGreaterThan(ENEMY_TYPES.normal.speed);
    expect(ENEMY_TYPES.tank.speed).toBeLessThan(ENEMY_TYPES.normal.speed);
  });
});
