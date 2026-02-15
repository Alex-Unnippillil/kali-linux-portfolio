import {
  ENEMY_TYPES,
  getTowerStatsAtLevel,
  getUpgradeCost,
  GRID_SIZE,
  TargetingMode,
  TowerTypeKey,
  Vec,
  WaveConfig,
  EnemyTypeKey,
  TOWER_TYPES,
} from '.';

export type RunStatus =
  | 'start'
  | 'build'
  | 'running'
  | 'between-waves'
  | 'victory'
  | 'defeat'
  | 'error';

export type EnemyInstance = {
  id: number;
  type: EnemyTypeKey;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  pathProgress: number;
  pathIndex: number;
  reward: number;
  reachedGoal: boolean;
};

export type Tower = {
  id: number;
  x: number;
  y: number;
  type: TowerTypeKey;
  level: number;
  range: number;
  damage: number;
  fireRate: number;
  splashRadius: number;
  targetingMode: TargetingMode;
};

export type Projectile = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  splashRadius: number;
  targetId: number;
  sourceTowerId: number;
};

export type WaveEnemySpawn = { type: EnemyTypeKey };

export type WavePreview = {
  index: number;
  totalEnemies: number;
  rewardBonus: number;
  composition: WaveConfig['enemies'];
};

export type TowerDefenseConfig = {
  gridSize?: number;
  cellSize?: number;
  startingGold?: number;
  startingLives?: number;
  pathCells?: Vec[];
  waves?: WaveConfig[];
  autoStartWaves?: boolean;
};

export type TowerDefenseState = {
  gridSize: number;
  cellSize: number;
  status: RunStatus;
  error: string | null;
  path: Vec[];
  pathSet: Set<string>;
  towers: Tower[];
  enemies: EnemyInstance[];
  projectiles: Projectile[];
  selectedTowerId: number | null;
  selectedBuildType: TowerTypeKey;
  waveIndex: number;
  waveQueue: WaveEnemySpawn[];
  spawnTimer: number;
  timeScale: 1 | 2;
  autoStartWaves: boolean;
  pendingWaveReward: number;
  gold: number;
  lives: number;
  kills: number;
  score: number;
  canSendWave: boolean;
};

export type EngineDispatchAction =
  | { type: 'start-game' }
  | { type: 'toggle-pause' }
  | { type: 'restart' }
  | { type: 'send-wave' }
  | { type: 'toggle-auto-start' }
  | { type: 'set-time-scale'; value: 1 | 2 }
  | { type: 'set-build-type'; towerType: TowerTypeKey }
  | { type: 'select-tower'; towerId: number | null }
  | { type: 'place-tower'; cell: Vec }
  | { type: 'sell-tower'; towerId: number }
  | { type: 'upgrade-tower'; towerId: number }
  | { type: 'cycle-targeting'; towerId: number };

export type EngineDispatchResult = {
  ok: boolean;
  toast?: string;
};

export type EngineUiState = Omit<TowerDefenseState, 'pathSet'> & {
  waveCount: number;
  wavePreview: WavePreview[];
};

const DEFAULT_PATH: Vec[] = [
  { x: 0, y: 5 },
  { x: 4, y: 5 },
  { x: 4, y: 2 },
  { x: 9, y: 2 },
  { x: 9, y: 8 },
  { x: 11, y: 8 },
];

const DEFAULT_WAVES: WaveConfig[] = [
  {
    id: 'w1',
    enemies: [
      { type: 'normal', count: 7 },
      { type: 'fast', count: 4 },
    ],
    spawnInterval: 0.75,
    rewardBonus: 18,
  },
  {
    id: 'w2',
    enemies: [
      { type: 'fast', count: 8 },
      { type: 'normal', count: 6 },
      { type: 'tank', count: 2 },
    ],
    spawnInterval: 0.68,
    rewardBonus: 22,
  },
  {
    id: 'w3',
    enemies: [
      { type: 'tank', count: 5 },
      { type: 'normal', count: 10 },
      { type: 'fast', count: 8 },
    ],
    spawnInterval: 0.62,
    rewardBonus: 34,
  },
  {
    id: 'w4',
    enemies: [
      { type: 'tank', count: 9 },
      { type: 'normal', count: 14 },
      { type: 'fast', count: 12 },
    ],
    spawnInterval: 0.55,
    rewardBonus: 48,
  },
];

const keyFor = ({ x, y }: Vec) => `${x},${y}`;

const clonePath = (path: Vec[]) => path.map((cell) => ({ ...cell }));

const expandWave = (wave: WaveConfig): WaveEnemySpawn[] => {
  const queue: WaveEnemySpawn[] = [];
  wave.enemies.forEach((entry) => {
    for (let i = 0; i < entry.count; i += 1) {
      queue.push({ type: entry.type });
    }
  });
  return queue;
};

const validatePath = (path: Vec[], gridSize: number): string | null => {
  if (path.length < 2) return 'Path must contain at least two points.';
  for (let i = 0; i < path.length; i += 1) {
    const cell = path[i];
    if (cell.x < 0 || cell.y < 0 || cell.x >= gridSize || cell.y >= gridSize) {
      return 'Path goes out of map bounds.';
    }
    if (i > 0) {
      const prev = path[i - 1];
      const d = Math.abs(prev.x - cell.x) + Math.abs(prev.y - cell.y);
      if (d !== 1 && !(prev.x === cell.x || prev.y === cell.y)) {
        return 'Path must use straight orthogonal segments.';
      }
    }
  }
  return null;
};

const expandPolyline = (points: Vec[]): Vec[] => {
  if (!points.length) return [];
  const expanded: Vec[] = [{ ...points[0] }];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    const dx = Math.sign(next.x - prev.x);
    const dy = Math.sign(next.y - prev.y);
    if (dx !== 0 && dy !== 0) {
      return [];
    }
    let x = prev.x;
    let y = prev.y;
    while (x !== next.x || y !== next.y) {
      x += dx;
      y += dy;
      expanded.push({ x, y });
    }
  }
  return expanded;
};

const getWaveEnemyHp = (baseHp: number, waveIndex: number) =>
  Math.max(1, Math.round(baseHp * (1 + waveIndex * 0.17)));

const getDistance = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(ax - bx, ay - by);

const getProgressToGoal = (enemy: EnemyInstance, pathLength: number) =>
  enemy.pathIndex + enemy.pathProgress / Math.max(1, pathLength);

export const createTowerDefenseEngine = (config: TowerDefenseConfig = {}) => {
  const gridSize = config.gridSize ?? GRID_SIZE;
  const cellSize = config.cellSize ?? 38;
  const startGold = config.startingGold ?? 90;
  const startLives = config.startingLives ?? 20;

  const expandedPath = expandPolyline(config.pathCells ?? DEFAULT_PATH);
  const pathValidationError = validatePath(expandedPath, gridSize);
  const path = pathValidationError ? expandPolyline(DEFAULT_PATH) : expandedPath;
  const pathSet = new Set(path.map(keyFor));

  const waves = (config.waves && config.waves.length ? config.waves : DEFAULT_WAVES).map((wave) => ({
    ...wave,
    enemies: wave.enemies.map((entry) => ({ ...entry })),
  }));

  const state: TowerDefenseState = {
    gridSize,
    cellSize,
    status: pathValidationError ? 'error' : 'start',
    error: pathValidationError,
    path,
    pathSet,
    towers: [],
    enemies: [],
    projectiles: [],
    selectedTowerId: null,
    selectedBuildType: 'basic',
    waveIndex: 0,
    waveQueue: [],
    spawnTimer: 0,
    timeScale: 1,
    autoStartWaves: Boolean(config.autoStartWaves),
    pendingWaveReward: 0,
    gold: startGold,
    lives: startLives,
    kills: 0,
    score: 0,
    canSendWave: false,
  };

  let nextEnemyId = 1;
  let nextTowerId = 1;
  let nextProjectileId = 1;
  const cooldowns = new Map<number, number>();

  const getWavePreview = (): WavePreview[] =>
    waves.map((wave, index) => ({
      index,
      totalEnemies: wave.enemies.reduce((sum, e) => sum + e.count, 0),
      rewardBonus: wave.rewardBonus,
      composition: wave.enemies.map((e) => ({ ...e })),
    }));

  const getTowerById = (towerId: number) => state.towers.find((tower) => tower.id === towerId);

  const canPlace = (cell: Vec) => {
    if (cell.x < 0 || cell.y < 0 || cell.x >= gridSize || cell.y >= gridSize) return 'Outside map bounds.';
    if (state.pathSet.has(keyFor(cell))) return 'Cannot build on the enemy path.';
    if (state.towers.some((tower) => tower.x === cell.x && tower.y === cell.y)) return 'Tile already occupied.';
    return null;
  };

  const setTowerStats = (tower: Tower) => {
    const stats = getTowerStatsAtLevel(tower.type, tower.level);
    tower.damage = stats.damage;
    tower.range = stats.range;
    tower.fireRate = stats.fireRate;
    tower.splashRadius = stats.splashRadius ?? 0;
  };

  const placeTower = (cell: Vec): EngineDispatchResult => {
    if (!['build', 'running', 'between-waves'].includes(state.status)) {
      return { ok: false, toast: 'Start the game before building towers.' };
    }
    const placementError = canPlace(cell);
    if (placementError) return { ok: false, toast: placementError };

    const towerType = state.selectedBuildType;
    const cost = TOWER_TYPES[towerType].cost;
    if (state.gold < cost) return { ok: false, toast: 'Not enough gold.' };

    const tower: Tower = {
      id: nextTowerId,
      x: cell.x,
      y: cell.y,
      type: towerType,
      level: 1,
      range: 0,
      damage: 0,
      fireRate: 0,
      splashRadius: 0,
      targetingMode: TOWER_TYPES[towerType].targetingModes[0],
    };
    setTowerStats(tower);
    nextTowerId += 1;
    state.gold -= cost;
    state.towers.push(tower);
    state.selectedTowerId = tower.id;
    return { ok: true };
  };

  const startGame = (): EngineDispatchResult => {
    if (state.status === 'error') return { ok: false, toast: state.error ?? 'Map data is invalid.' };
    state.status = 'build';
    state.canSendWave = true;
    return { ok: true };
  };

  const queueWave = (): EngineDispatchResult => {
    if (state.status === 'error' || state.status === 'defeat' || state.status === 'victory') {
      return { ok: false, toast: 'Round has ended.' };
    }
    if (state.waveQueue.length || state.status === 'running') {
      return { ok: false, toast: 'Current wave is still active.' };
    }
    const wave = waves[state.waveIndex];
    if (!wave) return { ok: false, toast: 'No waves remaining.' };

    state.waveQueue = expandWave(wave);
    state.spawnTimer = 0;
    state.pendingWaveReward = wave.rewardBonus;
    state.status = 'running';
    state.canSendWave = false;
    return { ok: true };
  };

  const selectTarget = (tower: Tower) => {
    const towerCx = tower.x + 0.5;
    const towerCy = tower.y + 0.5;
    let selected: EnemyInstance | null = null;

    for (let i = 0; i < state.enemies.length; i += 1) {
      const enemy = state.enemies[i];
      const distance = getDistance(towerCx, towerCy, enemy.x, enemy.y);
      if (distance > tower.range) continue;
      if (!selected) {
        selected = enemy;
        continue;
      }
      if (tower.targetingMode === 'strongest') {
        if (enemy.hp > selected.hp) selected = enemy;
      } else {
        const selectedProgress = getProgressToGoal(selected, state.path.length);
        const enemyProgress = getProgressToGoal(enemy, state.path.length);
        if (enemyProgress > selectedProgress) selected = enemy;
      }
    }

    return selected;
  };

  const spawnEnemyFromQueue = () => {
    const wave = waves[state.waveIndex];
    if (!wave || state.waveQueue.length === 0) return;
    const entry = state.waveQueue.shift();
    if (!entry) return;
    const spec = ENEMY_TYPES[entry.type];
    const hp = getWaveEnemyHp(spec.baseHp, state.waveIndex);

    state.enemies.push({
      id: nextEnemyId,
      type: entry.type,
      x: state.path[0].x + 0.5,
      y: state.path[0].y + 0.5,
      hp,
      maxHp: hp,
      speed: spec.speed,
      pathProgress: 0,
      pathIndex: 0,
      reward: Math.round(spec.reward * (1 + state.waveIndex * 0.1)),
      reachedGoal: false,
    });
    nextEnemyId += 1;
  };

  const moveEnemies = (dt: number) => {
    const survivors: EnemyInstance[] = [];
    state.enemies.forEach((enemy) => {
      let remaining = enemy.speed * dt;
      while (remaining > 0) {
        const nextIndex = enemy.pathIndex + 1;
        if (nextIndex >= state.path.length) {
          enemy.reachedGoal = true;
          break;
        }
        const from = state.path[enemy.pathIndex];
        const to = state.path[nextIndex];
        const segmentDistance = getDistance(from.x, from.y, to.x, to.y) || 1;
        const segmentRemaining = segmentDistance - enemy.pathProgress;
        const step = Math.min(remaining, segmentRemaining);
        enemy.pathProgress += step;
        remaining -= step;

        const progressRatio = enemy.pathProgress / segmentDistance;
        enemy.x = from.x + (to.x - from.x) * progressRatio + 0.5;
        enemy.y = from.y + (to.y - from.y) * progressRatio + 0.5;

        if (enemy.pathProgress >= segmentDistance - 1e-6) {
          enemy.pathIndex = nextIndex;
          enemy.pathProgress = 0;
          enemy.x = to.x + 0.5;
          enemy.y = to.y + 0.5;
        }
      }

      if (enemy.reachedGoal) {
        state.lives = Math.max(0, state.lives - 1);
      } else if (enemy.hp > 0) {
        survivors.push(enemy);
      }
    });

    state.enemies = survivors;
  };

  const launchProjectiles = (dt: number) => {
    state.towers.forEach((tower) => {
      const cd = Math.max(0, (cooldowns.get(tower.id) ?? 0) - dt);
      cooldowns.set(tower.id, cd);
      if (cd > 0) return;

      const target = selectTarget(tower);
      if (!target) return;

      const dx = target.x - (tower.x + 0.5);
      const dy = target.y - (tower.y + 0.5);
      const len = Math.hypot(dx, dy) || 1;
      const speed = TOWER_TYPES[tower.type].projectileSpeed;

      state.projectiles.push({
        id: nextProjectileId,
        x: tower.x + 0.5,
        y: tower.y + 0.5,
        vx: dx / len,
        vy: dy / len,
        speed,
        damage: tower.damage,
        splashRadius: tower.splashRadius,
        targetId: target.id,
        sourceTowerId: tower.id,
      });
      nextProjectileId += 1;
      cooldowns.set(tower.id, 1 / Math.max(0.1, tower.fireRate));
    });
  };

  const applyDamage = (enemy: EnemyInstance, damage: number) => {
    enemy.hp = Math.max(0, enemy.hp - damage);
    if (enemy.hp <= 0) {
      state.gold += enemy.reward;
      state.kills += 1;
      state.score += enemy.reward * 10;
    }
  };

  const tickProjectiles = (dt: number) => {
    const remaining: Projectile[] = [];

    for (let i = 0; i < state.projectiles.length; i += 1) {
      const projectile = state.projectiles[i];
      projectile.x += projectile.vx * projectile.speed * dt;
      projectile.y += projectile.vy * projectile.speed * dt;

      const directTarget = state.enemies.find((enemy) => enemy.id === projectile.targetId);
      let exploded = false;
      if (directTarget && getDistance(projectile.x, projectile.y, directTarget.x, directTarget.y) <= 0.25) {
        if (projectile.splashRadius > 0) {
          state.enemies.forEach((enemy) => {
            if (getDistance(projectile.x, projectile.y, enemy.x, enemy.y) <= projectile.splashRadius) {
              applyDamage(enemy, projectile.damage);
            }
          });
        } else {
          applyDamage(directTarget, projectile.damage);
        }
        exploded = true;
      }

      if (exploded) continue;
      if (projectile.x < 0 || projectile.y < 0 || projectile.x > gridSize || projectile.y > gridSize) {
        continue;
      }
      remaining.push(projectile);
    }

    state.projectiles = remaining;
    state.enemies = state.enemies.filter((enemy) => enemy.hp > 0 && !enemy.reachedGoal);
  };

  const handleWaveFlow = (dt: number) => {
    if (state.status !== 'running') return;

    const wave = waves[state.waveIndex];
    if (!wave) return;

    state.spawnTimer += dt;
    while (state.spawnTimer >= wave.spawnInterval && state.waveQueue.length) {
      state.spawnTimer -= wave.spawnInterval;
      spawnEnemyFromQueue();
    }

    const waveFinished = state.waveQueue.length === 0 && state.enemies.length === 0;
    if (!waveFinished) return;

    state.gold += state.pendingWaveReward;
    state.score += state.pendingWaveReward * 8;
    state.pendingWaveReward = 0;
    state.waveIndex += 1;

    if (state.waveIndex >= waves.length) {
      state.status = 'victory';
      state.canSendWave = false;
      return;
    }

    state.status = 'between-waves';
    state.canSendWave = true;
    if (state.autoStartWaves) {
      queueWave();
    }
  };

  const tick = (dtInput: number) => {
    const dt = Math.max(0, Math.min(0.05, Number.isFinite(dtInput) ? dtInput : 0));
    if (dt === 0) return;
    if (state.status === 'error' || state.status === 'start' || state.status === 'build') return;
    if (state.status === 'defeat' || state.status === 'victory') return;

    const scaledDt = dt * state.timeScale;
    moveEnemies(scaledDt);
    launchProjectiles(scaledDt);
    tickProjectiles(scaledDt);

    if (state.lives <= 0) {
      state.status = 'defeat';
      state.canSendWave = false;
      return;
    }

    handleWaveFlow(scaledDt);
  };

  const getUiState = (): EngineUiState => ({
    ...state,
    path: clonePath(state.path),
    towers: state.towers.map((tower) => ({ ...tower })),
    enemies: state.enemies.map((enemy) => ({ ...enemy })),
    projectiles: state.projectiles.map((projectile) => ({ ...projectile })),
    waveCount: waves.length,
    wavePreview: getWavePreview(),
  });

  const resetGame = () => {
    state.status = pathValidationError ? 'error' : 'start';
    state.error = pathValidationError;
    state.towers = [];
    state.enemies = [];
    state.projectiles = [];
    state.waveIndex = 0;
    state.waveQueue = [];
    state.spawnTimer = 0;
    state.pendingWaveReward = 0;
    state.selectedTowerId = null;
    state.selectedBuildType = 'basic';
    state.gold = startGold;
    state.lives = startLives;
    state.kills = 0;
    state.score = 0;
    state.canSendWave = false;
    cooldowns.clear();
  };

  const dispatch = (action: EngineDispatchAction): EngineDispatchResult => {
    switch (action.type) {
      case 'start-game':
        return startGame();
      case 'toggle-pause':
        if (state.status === 'running') {
          state.status = 'between-waves';
          state.canSendWave = true;
          return { ok: true };
        }
        if (state.status === 'between-waves') {
          return queueWave();
        }
        return { ok: false };
      case 'restart':
        resetGame();
        return { ok: true };
      case 'send-wave':
        return queueWave();
      case 'toggle-auto-start':
        state.autoStartWaves = !state.autoStartWaves;
        return { ok: true };
      case 'set-time-scale':
        state.timeScale = action.value;
        return { ok: true };
      case 'set-build-type':
        state.selectedBuildType = action.towerType;
        return { ok: true };
      case 'select-tower':
        state.selectedTowerId = action.towerId;
        return { ok: true };
      case 'place-tower':
        return placeTower(action.cell);
      case 'sell-tower': {
        const tower = getTowerById(action.towerId);
        if (!tower) return { ok: false, toast: 'Tower no longer exists.' };
        const invested = TOWER_TYPES[tower.type].cost + Array.from({ length: tower.level - 1 }).reduce((sum, _, level) => {
          return sum + getUpgradeCost(tower.type, level + 1);
        }, 0);
        state.gold += Math.floor(invested * 0.7);
        state.towers = state.towers.filter((entry) => entry.id !== action.towerId);
        cooldowns.delete(action.towerId);
        if (state.selectedTowerId === action.towerId) state.selectedTowerId = null;
        return { ok: true };
      }
      case 'upgrade-tower': {
        const tower = getTowerById(action.towerId);
        if (!tower) return { ok: false, toast: 'Tower no longer exists.' };
        if (tower.level >= 3) return { ok: false, toast: 'Tower already max level.' };
        const cost = getUpgradeCost(tower.type, tower.level);
        if (state.gold < cost) return { ok: false, toast: 'Not enough gold for upgrade.' };
        state.gold -= cost;
        tower.level += 1;
        setTowerStats(tower);
        return { ok: true };
      }
      case 'cycle-targeting': {
        const tower = getTowerById(action.towerId);
        if (!tower) return { ok: false, toast: 'Tower no longer exists.' };
        const modes = TOWER_TYPES[tower.type].targetingModes;
        const index = modes.indexOf(tower.targetingMode);
        tower.targetingMode = modes[(index + 1) % modes.length];
        return { ok: true };
      }
      default:
        return { ok: false };
    }
  };

  return {
    dispatch,
    tick,
    getState: () => state,
    getUiState,
  };
};

export type TowerDefenseEngine = ReturnType<typeof createTowerDefenseEngine>;
export { getUpgradeCost };
