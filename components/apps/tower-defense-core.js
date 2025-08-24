// Core logic and utilities for Tower Defense
export const GRID_SIZE = 10;
export const START = { x: 0, y: 4 };
export const GOAL = { x: GRID_SIZE - 1, y: 4 };

// Tower statistics per type and level
export const TOWER_TYPES = {
  single: [
    { damage: 1, range: 2, fireRate: 1 },
    { damage: 2, range: 3, fireRate: 0.8 },
    { damage: 3, range: 3, fireRate: 0.6 },
  ],
  splash: [
    { damage: 1, range: 2, fireRate: 1, splash: 1 },
    { damage: 2, range: 3, fireRate: 0.9, splash: 1 },
    { damage: 3, range: 3, fireRate: 0.8, splash: 2 },
  ],
  slow: [
    { damage: 0, range: 3, fireRate: 1, slow: { amount: 0.5, duration: 2 } },
    { damage: 0, range: 3, fireRate: 0.8, slow: { amount: 0.6, duration: 2.5 } },
    { damage: 0, range: 4, fireRate: 0.6, slow: { amount: 0.7, duration: 3 } },
  ],
};

export const getTowerDPS = (type, level) => {
  const stats = TOWER_TYPES[type]?.[level - 1];
  if (!stats) return 0;
  return stats.damage / stats.fireRate;
};

// ---- Pathfinding with caching ----
let lastKey = '';
let lastPath = null;
export let pathComputationCount = 0;

const keyFromTowers = (towers) =>
  towers
    .map((t) => `${t.x},${t.y}`)
    .sort()
    .join('|');

const astar = (towers) => {
  const obstacles = new Set(towers.map((t) => `${t.x},${t.y}`));
  const key = (p) => `${p.x},${p.y}`;
  const open = [
    {
      x: START.x,
      y: START.y,
      g: 0,
      f: Math.abs(START.x - GOAL.x) + Math.abs(START.y - GOAL.y),
      parent: null,
    },
  ];
  const closed = new Set();

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    if (current.x === GOAL.x && current.y === GOAL.y) {
      const path = [];
      let node = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closed.add(key(current));
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    dirs.forEach((d) => {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      const nKey = `${nx},${ny}`;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= GRID_SIZE ||
        ny >= GRID_SIZE ||
        obstacles.has(nKey) ||
        closed.has(nKey)
      )
        return;
      const g = current.g + 1;
      const h = Math.abs(nx - GOAL.x) + Math.abs(ny - GOAL.y);
      const existing = open.find((n) => n.x === nx && n.y === ny);
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = g + h;
          existing.parent = current;
        }
      } else {
        open.push({ x: nx, y: ny, g, f: g + h, parent: current });
      }
    });
  }
  return null;
};

export const getPath = (towers) => {
  const key = keyFromTowers(towers);
  if (key === lastKey && lastPath) return lastPath;
  pathComputationCount += 1;
  lastPath = astar(towers);
  lastKey = key;
  return lastPath;
};

export const resetPathCache = () => {
  lastKey = '';
  lastPath = null;
  pathComputationCount = 0;
};

// ---- Flow field from Dijkstra ----
export const computeDistanceField = (towers) => {
  const obstacles = new Set(towers.map((t) => `${t.x},${t.y}`));
  const dist = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => Infinity)
  );
  const q = [{ x: GOAL.x, y: GOAL.y }];
  dist[GOAL.y][GOAL.x] = 0;
  while (q.length) {
    const { x, y } = q.shift();
    const d = dist[y][x];
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    dirs.forEach(({ x: dx, y: dy }) => {
      const nx = x + dx;
      const ny = y + dy;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= GRID_SIZE ||
        ny >= GRID_SIZE ||
        obstacles.has(`${nx},${ny}`)
      )
        return;
      if (dist[ny][nx] > d + 1) {
        dist[ny][nx] = d + 1;
        q.push({ x: nx, y: ny });
      }
    });
  }
  return dist;
};

export const computeFlowField = (towers) => {
  const dist = computeDistanceField(towers);
  const field = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ dx: 0, dy: 0 }))
  );
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (dist[y][x] === Infinity) continue;
      const dirs = [
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
      ];
      let best = dist[y][x];
      let bestDir = { dx: 0, dy: 0 };
      dirs.forEach((d) => {
        const nx = x + d.dx;
        const ny = y + d.dy;
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= GRID_SIZE ||
          ny >= GRID_SIZE
        )
          return;
        if (dist[ny][nx] < best) {
          best = dist[ny][nx];
          bestDir = d;
        }
      });
      field[y][x] = bestDir;
    }
  }
  return { dist, field };
};

// ---- Projectile pooling ----
export const createProjectilePool = (size) =>
  Array.from({ length: size }, () => ({
    active: false,
    x: 0,
    y: 0,
    targetId: null,
    damage: 0,
    speed: 1,
    splash: 0,
    slow: null,
  }));

export const fireProjectile = (pool, props) => {
  const idx = pool.findIndex((p) => !p.active);
  if (idx === -1) return null;
  const p = pool[idx];
  Object.assign(p, props, { active: true });
  return p;
};

export const deactivateProjectile = (p) => {
  p.active = false;
};
