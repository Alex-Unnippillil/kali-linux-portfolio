import {
  ENEMY_TYPES,
  GRID_SIZE,
  Tower,
  createEnemyPool,
  spawnEnemy,
  deactivateEnemy,
  Enemy,
} from '.';

export type Vec = { x: number; y: number };

const DIRS: Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const computeFlowField = (
  start: Vec,
  goal: Vec,
  towers: Tower[],
): Vec[][] | null => {
  const obstacle = new Set(towers.map((t) => `${t.x},${t.y}`));
  const h = (a: Vec) => Math.abs(a.x - goal.x) + Math.abs(a.y - goal.y);
  const key = (p: Vec) => `${p.x},${p.y}`;
  const open: (Vec & { f: number })[] = [{ ...start, f: h(start) }];
  const came = new Map<string, string>();
  const g = new Map<string, number>();
  g.set(key(start), 0);
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    if (current.x === goal.x && current.y === goal.y) break;
    for (const d of DIRS) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= GRID_SIZE ||
        ny >= GRID_SIZE ||
        obstacle.has(key({ x: nx, y: ny }))
      )
        continue;
      const nk = key({ x: nx, y: ny });
      const tentative = (g.get(key(current)) ?? 0) + 1;
      if (tentative < (g.get(nk) ?? Infinity)) {
        came.set(nk, key(current));
        g.set(nk, tentative);
        const f = tentative + h({ x: nx, y: ny });
        const existing = open.find((o) => o.x === nx && o.y === ny);
        if (existing) existing.f = f;
        else open.push({ x: nx, y: ny, f });
      }
    }
  }
  if (!came.has(key(goal))) return null;
  const field: Vec[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ x: 0, y: 0 })),
  );
  let cur = key(goal);
  while (cur !== key(start)) {
    const prev = came.get(cur);
    if (!prev) break;
    const [cx, cy] = cur.split(',').map(Number);
    const [px, py] = prev.split(',').map(Number);
    field[px][py] = { x: cx - px, y: cy - py };
    cur = prev;
  }
  return field;
};

export interface TowerDefenseStatus {
  wave: number;
  totalWaves: number;
  waveCountdown: number | null;
  running: boolean;
}

export interface EngineConfig {
  path: Vec[];
  towers: Tower[];
  waveConfig: (keyof typeof ENEMY_TYPES)[][];
  selected: number | null;
  hovered: number | null;
}

interface DamageNumber {
  x: number;
  y: number;
  value: number;
  life: number;
}

interface DamageTick {
  x: number;
  y: number;
  life: number;
}

interface EngineState extends EngineConfig {
  flowField: Vec[][] | null;
  enemies: Enemy[];
  enemyPool: Enemy[];
  spawnTimer: number;
  wave: number;
  waveCountdown: number | null;
  running: boolean;
  enemiesSpawned: number;
  damageNumbers: DamageNumber[];
  damageTicks: DamageTick[];
}

export interface TowerDefenseEngine {
  setConfig: (config: Partial<EngineConfig>) => void;
  start: () => void;
  step: (dt: number) => void;
  draw: (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => void;
  getStatus: () => TowerDefenseStatus;
}

const defaultStatus: TowerDefenseStatus = {
  wave: 1,
  totalWaves: 0,
  waveCountdown: null,
  running: false,
};

const cloneStatus = (status: TowerDefenseStatus): TowerDefenseStatus => ({
  wave: status.wave,
  totalWaves: status.totalWaves,
  waveCountdown: status.waveCountdown,
  running: status.running,
});

export interface EngineOptions {
  cellSize: number;
  gridSize: number;
  onStatusChange?: (status: TowerDefenseStatus) => void;
}

export const createTowerDefenseEngine = (
  options: EngineOptions,
): TowerDefenseEngine => {
  const state: EngineState = {
    path: [],
    towers: [],
    waveConfig: [],
    selected: null,
    hovered: null,
    flowField: null,
    enemies: [],
    enemyPool: createEnemyPool(100),
    spawnTimer: 0,
    wave: 1,
    waveCountdown: null,
    running: false,
    enemiesSpawned: 0,
    damageNumbers: [],
    damageTicks: [],
  };

  const cooldowns = new Map<number, number>();
  const status: TowerDefenseStatus = cloneStatus(defaultStatus);

  const notifyStatus = () => {
    const next: TowerDefenseStatus = {
      wave: state.wave,
      totalWaves: state.waveConfig.length,
      waveCountdown: state.waveCountdown,
      running: state.running,
    };
    if (
      next.wave !== status.wave ||
      next.totalWaves !== status.totalWaves ||
      next.running !== status.running ||
      (next.waveCountdown ?? null) !== (status.waveCountdown ?? null)
    ) {
      status.wave = next.wave;
      status.totalWaves = next.totalWaves;
      status.waveCountdown = next.waveCountdown;
      status.running = next.running;
      options.onStatusChange?.(cloneStatus(status));
    }
  };

  const updateFlowField = () => {
    if (state.path.length >= 2) {
      state.flowField = computeFlowField(
        state.path[0],
        state.path[state.path.length - 1],
        state.towers,
      );
    } else {
      state.flowField = null;
    }
  };

  const setConfig: TowerDefenseEngine['setConfig'] = (config) => {
    let needsFlowUpdate = false;
    if (config.path !== undefined) {
      state.path = config.path;
      needsFlowUpdate = true;
    }
    if (config.towers !== undefined) {
      state.towers = config.towers;
      needsFlowUpdate = true;
      // remove cooldown entries for removed towers
      const ids = new Set(state.towers.map((_, i) => i));
      Array.from(cooldowns.keys()).forEach((key) => {
        if (!ids.has(key)) cooldowns.delete(key);
      });
      state.towers.forEach((_, index) => {
        if (!cooldowns.has(index)) cooldowns.set(index, 0);
      });
    }
    if (config.waveConfig !== undefined) {
      state.waveConfig = config.waveConfig;
    }
    if (config.selected !== undefined) {
      state.selected = config.selected;
    }
    if (config.hovered !== undefined) {
      state.hovered = config.hovered;
    }
    if (needsFlowUpdate) updateFlowField();
    notifyStatus();
  };

  const start = () => {
    if (!state.path.length || !state.waveConfig.length) return;
    state.wave = 1;
    state.waveCountdown = 3;
    state.running = false;
    state.spawnTimer = 0;
    state.enemiesSpawned = 0;
    state.enemies.forEach(deactivateEnemy);
    state.enemies = [];
    state.damageNumbers = [];
    state.damageTicks = [];
    cooldowns.clear();
    state.towers.forEach((_, index) => cooldowns.set(index, 0));
    notifyStatus();
  };

  const spawnEnemyInstance = () => {
    if (!state.path.length) return;
    const wave = state.waveConfig[state.wave - 1] || [];
    const type = wave[state.enemiesSpawned];
    if (!type) return;
    const spec = ENEMY_TYPES[type];
    const enemy = spawnEnemy(state.enemyPool, {
      id: Date.now(),
      x: state.path[0].x,
      y: state.path[0].y,
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
      state.enemies.push(enemy);
      state.enemiesSpawned += 1;
    }
  };

  const step: TowerDefenseEngine['step'] = (dt) => {
    if (dt <= 0) return;

    if (state.waveCountdown !== null) {
      state.waveCountdown -= dt;
      if (state.waveCountdown <= 0) {
        state.waveCountdown = null;
        state.running = true;
        state.spawnTimer = 0;
        state.enemiesSpawned = 0;
      }
      notifyStatus();
    }

    if (!state.running) return;

    const currentWave = state.waveConfig[state.wave - 1] || [];
    state.spawnTimer += dt;
    if (state.spawnTimer > 1 && state.enemiesSpawned < currentWave.length) {
      state.spawnTimer = 0;
      spawnEnemyInstance();
    }

    state.enemies.forEach((en) => {
      const field = state.flowField;
      if (!field) return;
      const cellX = Math.floor(en.x);
      const cellY = Math.floor(en.y);
      const vec = field[cellX]?.[cellY];
      if (!vec) return;
      const stepDistance = (en.baseSpeed * dt) / options.cellSize;
      en.x += vec.x * stepDistance;
      en.y += vec.y * stepDistance;
    });

    state.enemies = state.enemies.filter((enemy) => {
      if (enemy.health <= 0) {
        deactivateEnemy(enemy);
        return false;
      }
      const goal = state.path[state.path.length - 1];
      if (!goal) return false;
      const reached =
        Math.floor(enemy.x) === goal.x && Math.floor(enemy.y) === goal.y;
      if (reached) {
        deactivateEnemy(enemy);
        return false;
      }
      return true;
    });

    state.towers.forEach((tower, index) => {
      const remaining = (cooldowns.get(index) ?? 0) - dt;
      cooldowns.set(index, remaining);
      if (remaining <= 0) {
        const enemy = state.enemies.find(
          (e) => Math.hypot(e.x - tower.x, e.y - tower.y) <= tower.range,
        );
        if (enemy) {
          enemy.health -= tower.damage;
          state.damageNumbers.push({
            x: enemy.x,
            y: enemy.y,
            value: tower.damage,
            life: 1,
          });
          state.damageTicks.push({ x: enemy.x, y: enemy.y, life: 1 });
          cooldowns.set(index, 1);
        }
      }
    });

    state.damageNumbers.forEach((d) => {
      d.y -= dt * 0.5;
      d.life -= dt * 2;
    });
    state.damageNumbers = state.damageNumbers.filter((d) => d.life > 0);

    state.damageTicks.forEach((t) => {
      t.life -= dt * 2;
    });
    state.damageTicks = state.damageTicks.filter((t) => t.life > 0);

    if (
      state.enemiesSpawned >= currentWave.length &&
      state.enemies.length === 0
    ) {
      state.running = false;
      if (state.wave < state.waveConfig.length) {
        state.wave += 1;
        state.waveCountdown = 5;
      }
      notifyStatus();
    }
  };

  const draw: TowerDefenseEngine['draw'] = (ctx) => {
    ctx.clearRect(0, 0, options.gridSize * options.cellSize, options.gridSize * options.cellSize);
    ctx.strokeStyle = '#555';
    for (let i = 0; i <= options.gridSize; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * options.cellSize, 0);
      ctx.lineTo(i * options.cellSize, options.gridSize * options.cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * options.cellSize);
      ctx.lineTo(options.gridSize * options.cellSize, i * options.cellSize);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,0,0.2)';
    state.path.forEach((c) => {
      ctx.fillRect(
        c.x * options.cellSize,
        c.y * options.cellSize,
        options.cellSize,
        options.cellSize,
      );
      ctx.strokeStyle = 'yellow';
      ctx.strokeRect(
        c.x * options.cellSize,
        c.y * options.cellSize,
        options.cellSize,
        options.cellSize,
      );
    });

    ctx.fillStyle = 'blue';
    state.towers.forEach((t, i) => {
      ctx.beginPath();
      ctx.arc(
        t.x * options.cellSize + options.cellSize / 2,
        t.y * options.cellSize + options.cellSize / 2,
        options.cellSize / 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      if (state.selected === i || state.hovered === i) {
        ctx.strokeStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(
          t.x * options.cellSize + options.cellSize / 2,
          t.y * options.cellSize + options.cellSize / 2,
          t.range * options.cellSize,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    });

    ctx.fillStyle = 'red';
    state.enemies.forEach((en) => {
      ctx.beginPath();
      ctx.arc(
        en.x * options.cellSize + options.cellSize / 2,
        en.y * options.cellSize + options.cellSize / 2,
        options.cellSize / 4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });

    state.damageTicks.forEach((t) => {
      ctx.strokeStyle = `rgba(255,0,0,${t.life})`;
      ctx.beginPath();
      ctx.arc(
        t.x * options.cellSize + options.cellSize / 2,
        t.y * options.cellSize + options.cellSize / 2,
        (options.cellSize / 2) * (1 - t.life),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    });

    state.damageNumbers.forEach((d) => {
      ctx.fillStyle = `rgba(255,255,255,${d.life})`;
      ctx.font = '12px sans-serif';
      ctx.fillText(
        d.value.toString(),
        d.x * options.cellSize + options.cellSize / 2,
        d.y * options.cellSize + options.cellSize / 2 - (1 - d.life) * 10,
      );
    });
  };

  return {
    setConfig,
    start,
    step,
    draw,
    getStatus: () => cloneStatus(status),
  };
};
