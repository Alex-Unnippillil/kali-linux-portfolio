import {
  ENEMY_TYPES,
  Tower,
  upgradeTower,
  Enemy,
  createEnemyPool,
  spawnEnemy,
} from '.';

export type Vec = { x: number; y: number };

export type RunStatus = 'idle' | 'countdown' | 'running' | 'victory' | 'defeat';

export type RunStats = {
  enemiesDefeated: number;
  enemiesLeaked: number;
  wavesCleared: number;
  elapsedMs: number;
};

export type EnemyInstance = Enemy & {
  pathIndex: number;
  progress: number;
};

export type ShotLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
};

export type DamageNumber = {
  x: number;
  y: number;
  value: number;
  life: number;
};

export type HitRing = {
  x: number;
  y: number;
  life: number;
};

export type TowerDefenseConfig = {
  gridSize?: number;
  cellSize?: number;
  baseTowerCost?: number;
  startingGold?: number;
  startingLives?: number;
  spawnInterval?: number;
  waveConfig?: (keyof typeof ENEMY_TYPES)[][];
  pathCells?: Vec[];
  editing?: boolean;
  countdownSeconds?: number;
};

export type TowerDefenseState = {
  gridSize: number;
  cellSize: number;
  baseTowerCost: number;
  editing: boolean;
  pathCells: Vec[];
  route: Vec[];
  routeError: string | null;
  towers: Tower[];
  gold: number;
  lives: number;
  waveNumber: number;
  countdown: number | null;
  runStatus: RunStatus;
  spawnInterval: number;
  waveConfig: (keyof typeof ENEMY_TYPES)[][];
  enemies: EnemyInstance[];
  damageNumbers: DamageNumber[];
  hitRings: HitRing[];
  shotLines: ShotLine[];
  stats: RunStats;
};

export type EngineDispatchResult = {
  ok: boolean;
  toast?: string;
};

export type EngineDispatchAction =
  | { type: 'add-path-cell'; cell: Vec }
  | { type: 'undo-path-cell' }
  | { type: 'clear-path-cells' }
  | { type: 'set-path-cells'; cells: Vec[] }
  | { type: 'set-editing'; editing: boolean }
  | { type: 'place-tower'; cell: Vec }
  | { type: 'clear-towers' }
  | { type: 'sell-tower'; index: number }
  | { type: 'upgrade-tower'; index: number; upgrade: 'range' | 'damage' }
  | { type: 'reset-run' }
  | { type: 'start-run'; skipCountdown?: boolean }
  | { type: 'set-wave-config'; waves: (keyof typeof ENEMY_TYPES)[][] }
  | { type: 'set-spawn-interval'; value: number }
  | {
      type: 'apply-preset';
      pathCells: Vec[];
      waveConfig: (keyof typeof ENEMY_TYPES)[][];
      spawnInterval: number;
      startingGold: number;
      startingLives: number;
      editing?: boolean;
    };

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getTowerCooldown = (level: number) =>
  clamp(1 - (level - 1) * 0.08, 0.3, 1.2);

export const getUpgradeCost = (level: number) => 8 + level * 2;

export const keyFor = (p: Vec) => `${p.x},${p.y}`;

export const DEFAULT_ROUTE_ERROR =
  'Paint at least two cells to define a route.';
export const ADJACENT_ROUTE_ERROR =
  'Route must be painted cell-by-cell without diagonals or gaps.';

export const validateRouteCells = (
  cells: Vec[],
  gridSize: number,
): string | null => {
  if (cells.length < 2) return DEFAULT_ROUTE_ERROR;
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    if (
      cell.x < 0 ||
      cell.y < 0 ||
      cell.x >= gridSize ||
      cell.y >= gridSize
    ) {
      return 'Route cells must stay within the grid.';
    }
    if (i === 0) continue;
    const prev = cells[i - 1];
    const distance = Math.abs(prev.x - cell.x) + Math.abs(prev.y - cell.y);
    if (distance !== 1) return ADJACENT_ROUTE_ERROR;
  }
  return null;
};

const cloneVecs = (cells: Vec[]) => cells.map((cell) => ({ ...cell }));

const createStats = (): RunStats => ({
  enemiesDefeated: 0,
  enemiesLeaked: 0,
  wavesCleared: 0,
  elapsedMs: 0,
});

export const createTowerDefenseEngine = (config: TowerDefenseConfig = {}) => {
  const gridSize = config.gridSize ?? 10;
  const cellSize = config.cellSize ?? 40;
  const baseTowerCost = config.baseTowerCost ?? 10;
  let startingGold = config.startingGold ?? 30;
  let startingLives = config.startingLives ?? 10;
  const spawnInterval = config.spawnInterval ?? 1;
  const waveConfig =
    config.waveConfig ??
    ([Array(5).fill('fast') as (keyof typeof ENEMY_TYPES)[]] as (
      | keyof typeof ENEMY_TYPES
    )[][]);
  const countdownSeconds = config.countdownSeconds ?? 2.5;

  const state: TowerDefenseState = {
    gridSize,
    cellSize,
    baseTowerCost,
    editing: config.editing ?? true,
    pathCells: cloneVecs(config.pathCells ?? []),
    route: [],
    routeError: DEFAULT_ROUTE_ERROR,
    towers: [],
    gold: startingGold,
    lives: startingLives,
    waveNumber: 1,
    countdown: null,
    runStatus: 'idle',
    spawnInterval,
    waveConfig: waveConfig.map((wave) => [...wave]),
    enemies: [],
    damageNumbers: [],
    hitRings: [],
    shotLines: [],
    stats: createStats(),
  };

  const enemyPool = createEnemyPool(80);
  let enemiesSpawned = 0;
  let spawnTimer = 0;
  let nextEnemyId = 1;
  const cooldowns = new Map<string, number>();

  const resetEnemies = () => {
    state.enemies = [];
    enemyPool.forEach((enemy) => {
      enemy.active = false;
    });
    enemiesSpawned = 0;
    spawnTimer = 0;
  };

  const updateRoute = () => {
    const error = validateRouteCells(state.pathCells, gridSize);
    state.routeError = error;
    state.route = error ? [] : cloneVecs(state.pathCells);
  };

  updateRoute();

  const resetRun = () => {
    resetEnemies();
    cooldowns.clear();
    state.damageNumbers = [];
    state.hitRings = [];
    state.shotLines = [];
    state.gold = startingGold;
    state.lives = startingLives;
    state.waveNumber = 1;
    state.countdown = null;
    state.runStatus = 'idle';
    state.stats = createStats();
  };

  const startRun = (skipCountdown = false) => {
    if (state.routeError || state.route.length < 2) {
      return { ok: false, toast: 'Finish a valid route before launching waves.' };
    }
    resetEnemies();
    state.countdown = skipCountdown ? 0 : countdownSeconds;
    state.runStatus = skipCountdown ? 'running' : 'countdown';
    state.stats = createStats();
    state.stats.elapsedMs = 0;
    return { ok: true };
  };

  const spawnEnemyInstance = () => {
    const path = state.route;
    if (!path.length) return;
    const wave = state.waveConfig[state.waveNumber - 1] || [];
    const type = wave[enemiesSpawned];
    if (!type) return;
    const spec = ENEMY_TYPES[type];
    const enemy = spawnEnemy(enemyPool, {
      id: nextEnemyId,
      x: path[0].x,
      y: path[0].y,
      pathIndex: 0,
      progress: 0,
      health: spec.health,
      resistance: 0,
      baseSpeed: spec.speed,
      slow: null,
      dot: null,
      type,
    });
    if (enemy) {
      nextEnemyId += 1;
      state.enemies.push(enemy as EnemyInstance);
    }
  };

  const tickEnemies = (dt: number) => {
    const path = state.route;
    if (!path.length) return;

    const survivors: EnemyInstance[] = [];

    for (const enemy of state.enemies) {
      let { pathIndex, progress } = enemy;
      let x = enemy.x;
      let y = enemy.y;

      while (true) {
        const nextIndex = pathIndex + 1;
        if (!path[nextIndex]) break;
        const current = path[pathIndex];
        const next = path[nextIndex];
        const dx = next.x - current.x;
        const dy = next.y - current.y;
        const segmentLength = Math.hypot(dx, dy) || 1;
        const step = (enemy.baseSpeed * dt) / cellSize;
        progress += step / segmentLength;
        if (progress < 1) {
          x = current.x + dx * progress;
          y = current.y + dy * progress;
          break;
        }
        progress -= 1;
        pathIndex = nextIndex;
        x = next.x;
        y = next.y;
      }

      if (pathIndex >= path.length - 1) {
        enemy.active = false;
        state.lives = Math.max(state.lives - 1, 0);
        state.stats.enemiesLeaked += 1;
        if (state.lives === 0) {
          state.runStatus = 'defeat';
          state.countdown = null;
          state.enemies = [];
          return;
        }
        continue;
      }

      enemy.x = x;
      enemy.y = y;
      enemy.pathIndex = pathIndex;
      enemy.progress = progress;
      survivors.push(enemy);
    }

    state.enemies = survivors;
  };

  const towerAttack = (dt: number) => {
    const enemies = state.enemies;
    if (!enemies.length) return;

    const bounty: Record<string, number> = {
      fast: 3,
      tank: 6,
    };

    state.towers.forEach((tower) => {
      const key = keyFor({ x: tower.x, y: tower.y });
      const currentCooldown = cooldowns.get(key) ?? 0;
      const nextCooldown = Math.max(0, currentCooldown - dt);
      cooldowns.set(key, nextCooldown);
      if (nextCooldown > 0) return;

      const towerCenterX = tower.x + 0.5;
      const towerCenterY = tower.y + 0.5;
      const target = enemies.find((enemy) =>
        Math.hypot(
          enemy.x + 0.5 - towerCenterX,
          enemy.y + 0.5 - towerCenterY,
        ) <= tower.range,
      );
      if (!target) return;

      target.health -= tower.damage;
      cooldowns.set(key, getTowerCooldown(tower.level));
      state.shotLines.push({
        x1: tower.x,
        y1: tower.y,
        x2: target.x,
        y2: target.y,
        life: 0.25,
      });
      state.damageNumbers.push({
        x: target.x,
        y: target.y,
        value: tower.damage,
        life: 1,
      });
      state.hitRings.push({
        x: target.x,
        y: target.y,
        life: 1,
      });
    });

    const survivors: EnemyInstance[] = [];
    enemies.forEach((enemy) => {
      if (enemy.health > 0) {
        survivors.push(enemy);
        return;
      }
      enemy.active = false;
      const reward = bounty[enemy.type ?? 'fast'] ?? 2;
      state.gold += reward;
      state.stats.enemiesDefeated += 1;
    });

    state.enemies = survivors;
  };

  const updateEffects = (dt: number) => {
    state.damageNumbers.forEach((d) => {
      d.y -= dt * 0.5;
      d.life -= dt * 1.5;
    });
    state.damageNumbers = state.damageNumbers.filter((d) => d.life > 0);

    state.hitRings.forEach((t) => {
      t.life -= dt * 2;
    });
    state.hitRings = state.hitRings.filter((t) => t.life > 0);

    state.shotLines.forEach((s) => {
      s.life -= dt * 3;
    });
    state.shotLines = state.shotLines.filter((s) => s.life > 0);
  };

  const updateWaveFlow = (dt: number) => {
    if (state.runStatus === 'defeat' || state.runStatus === 'victory') return;
    if (state.runStatus === 'countdown') {
      if (state.countdown === null) return;
      const next = state.countdown - dt;
      state.countdown = next <= 0 ? null : next;
      if (next <= 0) {
        state.runStatus = 'running';
        spawnTimer = 0;
        enemiesSpawned = 0;
      }
      return;
    }

    if (state.runStatus !== 'running') return;

    spawnTimer += dt;
    const currentWave = state.waveConfig[state.waveNumber - 1] || [];
    if (spawnTimer >= state.spawnInterval && enemiesSpawned < currentWave.length) {
      spawnTimer = 0;
      spawnEnemyInstance();
      enemiesSpawned += 1;
    }

    if (enemiesSpawned >= currentWave.length && state.enemies.length === 0) {
      if (state.waveNumber < state.waveConfig.length) {
        state.stats.wavesCleared += 1;
        state.waveNumber += 1;
        state.runStatus = 'countdown';
        state.countdown = countdownSeconds;
        enemiesSpawned = 0;
        spawnTimer = 0;
      } else {
        state.stats.wavesCleared = state.waveConfig.length;
        state.runStatus = 'victory';
        state.countdown = null;
      }
    }
  };

  const tick = (dt: number) => {
    if (state.runStatus === 'running' || state.runStatus === 'countdown') {
      state.stats.elapsedMs += dt * 1000;
    }
    updateWaveFlow(dt);
    if (state.runStatus === 'running') {
      tickEnemies(dt);
      if (state.runStatus === 'running') {
        towerAttack(dt);
      }
    }
    updateEffects(dt);
  };

  const dispatch = (action: EngineDispatchAction): EngineDispatchResult => {
    switch (action.type) {
      case 'add-path-cell': {
        if (!state.editing) {
          return { ok: false, toast: 'Route editing is disabled.' };
        }
        const cell = action.cell;
        if (
          cell.x < 0 ||
          cell.y < 0 ||
          cell.x >= gridSize ||
          cell.y >= gridSize
        ) {
          return { ok: false, toast: 'That cell is outside the grid.' };
        }
        if (
          state.towers.some((tower) => tower.x === cell.x && tower.y === cell.y)
        ) {
          return { ok: false, toast: 'Remove the tower before painting this cell.' };
        }
        const last = state.pathCells[state.pathCells.length - 1];
        if (last && last.x === cell.x && last.y === cell.y) {
          state.pathCells.pop();
          updateRoute();
          return { ok: true };
        }
        const hasCell = state.pathCells.some(
          (existing) => existing.x === cell.x && existing.y === cell.y,
        );
        if (hasCell) {
          return {
            ok: false,
            toast: 'Route order is locked. Use Undo to remove the last cell.',
          };
        }
        if (last) {
          const distance =
            Math.abs(last.x - cell.x) + Math.abs(last.y - cell.y);
          if (distance !== 1) {
            return {
              ok: false,
              toast: 'New route cells must touch the last cell.',
            };
          }
        }
        state.pathCells.push({ ...cell });
        updateRoute();
        return { ok: true };
      }
      case 'undo-path-cell': {
        if (!state.pathCells.length) {
          return { ok: false, toast: 'No route cells to undo.' };
        }
        state.pathCells.pop();
        updateRoute();
        return { ok: true };
      }
      case 'clear-path-cells': {
        state.pathCells = [];
        updateRoute();
        return { ok: true };
      }
      case 'set-path-cells': {
        state.pathCells = cloneVecs(action.cells);
        updateRoute();
        return { ok: true };
      }
      case 'set-editing': {
        state.editing = action.editing;
        return { ok: true };
      }
      case 'place-tower': {
        const cell = action.cell;
        if (state.pathCells.some((c) => c.x === cell.x && c.y === cell.y)) {
          return { ok: false, toast: 'Towers cannot be placed on the route.' };
        }
        if (state.gold < baseTowerCost) {
          return { ok: false, toast: 'Not enough gold to place a tower.' };
        }
        state.towers.push({
          x: cell.x,
          y: cell.y,
          range: 1.5,
          damage: 2,
          level: 1,
        });
        state.gold -= baseTowerCost;
        return { ok: true };
      }
      case 'clear-towers': {
        state.towers = [];
        cooldowns.clear();
        return { ok: true };
      }
      case 'sell-tower': {
        const tower = state.towers[action.index];
        if (!tower) return { ok: false };
        let total = baseTowerCost;
        for (let lvl = 1; lvl < tower.level; lvl += 1) {
          total += getUpgradeCost(lvl);
        }
        state.gold += Math.max(1, Math.floor(total * 0.6));
        state.towers = state.towers.filter((_, i) => i !== action.index);
        return { ok: true };
      }
      case 'upgrade-tower': {
        const tower = state.towers[action.index];
        if (!tower) return { ok: false };
        const cost = getUpgradeCost(tower.level);
        if (state.gold < cost) {
          return { ok: false, toast: 'Not enough gold for that upgrade.' };
        }
        state.gold -= cost;
        const updated = { ...tower };
        upgradeTower(updated, action.upgrade);
        state.towers = state.towers.map((t, i) => (i === action.index ? updated : t));
        return { ok: true };
      }
      case 'reset-run': {
        resetRun();
        return { ok: true };
      }
      case 'start-run': {
        return startRun(action.skipCountdown);
      }
      case 'set-wave-config': {
        state.waveConfig = action.waves.map((wave) => [...wave]);
        return { ok: true };
      }
      case 'set-spawn-interval': {
        state.spawnInterval = action.value;
        return { ok: true };
      }
      case 'apply-preset': {
        state.pathCells = cloneVecs(action.pathCells);
        state.waveConfig = action.waveConfig.map((wave) => [...wave]);
        state.spawnInterval = action.spawnInterval;
        state.editing = action.editing ?? false;
        state.towers = [];
        startingGold = action.startingGold;
        startingLives = action.startingLives;
        state.gold = startingGold;
        state.lives = startingLives;
        state.waveNumber = 1;
        state.countdown = null;
        state.runStatus = 'idle';
        state.stats = createStats();
        resetEnemies();
        updateRoute();
        return { ok: true };
      }
      default:
        return { ok: false };
    }
  };

  const getState = () => state;
  const getUiState = () => ({
    ...state,
    pathCells: cloneVecs(state.pathCells),
    route: cloneVecs(state.route),
    towers: state.towers.map((tower) => ({ ...tower })),
    waveConfig: state.waveConfig.map((wave) => [...wave]),
    enemies: state.enemies.map((enemy) => ({ ...enemy })),
    damageNumbers: state.damageNumbers.map((d) => ({ ...d })),
    hitRings: state.hitRings.map((h) => ({ ...h })),
    shotLines: state.shotLines.map((s) => ({ ...s })),
    stats: { ...state.stats },
  });

  return {
    getState,
    getUiState,
    dispatch,
    tick,
    resetRun,
    startRun,
  };
};

export type TowerDefenseEngine = ReturnType<typeof createTowerDefenseEngine>;
