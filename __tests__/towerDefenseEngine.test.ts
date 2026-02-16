import { createTowerDefenseEngine } from '../apps/games/tower-defense/engine';
import { ENEMY_TYPES } from '../apps/games/tower-defense';

describe('tower defense engine routes', () => {
  it('enforces adjacency and supports undo', () => {
    const engine = createTowerDefenseEngine({ gridSize: 5 });
    const addStart = engine.dispatch({ type: 'add-path-cell', cell: { x: 0, y: 0 } });
    expect(addStart.ok).toBe(true);

    const skipCell = engine.dispatch({ type: 'add-path-cell', cell: { x: 2, y: 0 } });
    expect(skipCell.ok).toBe(false);
    expect(engine.getState().pathCells).toHaveLength(1);

    const addAdjacent = engine.dispatch({ type: 'add-path-cell', cell: { x: 1, y: 0 } });
    expect(addAdjacent.ok).toBe(true);
    expect(engine.getState().route).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);

    const undo = engine.dispatch({ type: 'undo-path-cell' });
    expect(undo.ok).toBe(true);
    expect(engine.getState().pathCells).toHaveLength(1);
    expect(engine.getState().route).toEqual([]);
  });
});

describe('tower defense engine end states', () => {
  it('signals defeat when lives reach zero', () => {
    const engine = createTowerDefenseEngine({
      pathCells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      waveConfig: [['fast']],
      spawnInterval: 0.1,
      startingLives: 1,
    });
    const start = engine.dispatch({ type: 'start-run', skipCountdown: true });
    expect(start.ok).toBe(true);
    engine.tick(1.2);
    expect(engine.getState().runStatus).toBe('defeat');
  });

  it('signals victory after the final wave', () => {
    const engine = createTowerDefenseEngine({
      pathCells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      waveConfig: [[]],
      spawnInterval: 0.2,
    });
    const start = engine.dispatch({ type: 'start-run', skipCountdown: true });
    expect(start.ok).toBe(true);
    engine.tick(0.2);
    expect(engine.getState().runStatus).toBe('victory');
  });
});

describe('tower defense engine combat', () => {
  it('allows towers to damage enemies in range', () => {
    const engine = createTowerDefenseEngine({
      pathCells: [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
      waveConfig: [['fast']],
      spawnInterval: 0.1,
    });
    engine.dispatch({ type: 'place-tower', cell: { x: 1, y: 0 } });
    engine.dispatch({ type: 'start-run', skipCountdown: true });
    engine.tick(0.1);
    engine.tick(0.6);
    const enemy = engine.getState().enemies[0];
    expect(enemy).toBeDefined();
    expect(enemy.health).toBeLessThan(ENEMY_TYPES.fast.health);
  });
});


describe('tower defense targeting priorities', () => {
  const buildEngine = () => {
    const engine = createTowerDefenseEngine({
      pathCells: [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
      waveConfig: [['tank', 'fast']],
      spawnInterval: 0.1,
    });
    const start = engine.dispatch({ type: 'start-run', skipCountdown: true });
    expect(start.ok).toBe(true);
    engine.tick(0.11);
    engine.tick(0.11);
    return engine;
  };

  const setEnemyStateForTargeting = (engine: ReturnType<typeof createTowerDefenseEngine>) => {
    const enemies = engine.getState().enemies;
    expect(enemies).toHaveLength(2);

    const tank = enemies.find((enemy) => enemy.type === 'tank');
    const fast = enemies.find((enemy) => enemy.type === 'fast');

    expect(tank).toBeDefined();
    expect(fast).toBeDefined();

    if (!tank || !fast) return;

    tank.x = 1.3;
    tank.y = 1;
    tank.pathIndex = 1;
    tank.progress = 0.3;

    fast.x = 1.8;
    fast.y = 1;
    fast.pathIndex = 1;
    fast.progress = 0.8;
  };

  it('defaults to first targeting and hits the furthest-progress enemy', () => {
    const engine = buildEngine();
    setEnemyStateForTargeting(engine);

    const initialHealthByType = Object.fromEntries(
      engine.getState().enemies.map((enemy) => [enemy.type, enemy.health]),
    );

    const placed = engine.dispatch({ type: 'place-tower', cell: { x: 1, y: 0 } });
    expect(placed.ok).toBe(true);

    engine.tick(0.01);

    const fast = engine.getState().enemies.find((enemy) => enemy.type === 'fast');
    const tank = engine.getState().enemies.find((enemy) => enemy.type === 'tank');

    expect(fast?.health).toBeLessThan(initialHealthByType.fast);
    expect(tank?.health).toBe(initialHealthByType.tank);
  });

  it('switches targeting mode and strong prioritizes higher-health enemies', () => {
    const engine = buildEngine();
    setEnemyStateForTargeting(engine);

    const initialHealthByType = Object.fromEntries(
      engine.getState().enemies.map((enemy) => [enemy.type, enemy.health]),
    );

    const placed = engine.dispatch({ type: 'place-tower', cell: { x: 1, y: 0 } });
    expect(placed.ok).toBe(true);

    const updated = engine.dispatch({
      type: 'set-tower-targeting',
      index: 0,
      targeting: 'strong',
    });
    expect(updated.ok).toBe(true);

    engine.tick(0.01);

    const fast = engine.getState().enemies.find((enemy) => enemy.type === 'fast');
    const tank = engine.getState().enemies.find((enemy) => enemy.type === 'tank');

    expect(tank?.health).toBeLessThan(initialHealthByType.tank);
    expect(fast?.health).toBe(initialHealthByType.fast);
  });
});
