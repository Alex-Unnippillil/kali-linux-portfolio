export interface Point {
  x: number;
  y: number;
}

export interface MapData {
  width: number;
  height: number;
  start: Point;
  goal: Point;
  walls: Set<string>;
}

const key = (p: Point) => `${p.x},${p.y}`;

interface Node extends Point {
  g: number;
  f: number;
  parent: Node | null;
}

/**
 * Run A* and return all optimal paths from start to goal.
 */
export function astarPaths(map: MapData): Point[][] {
  const { width, height, start, goal, walls } = map;
  const open: Node[] = [
    { x: start.x, y: start.y, g: 0, f: Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y), parent: null },
  ];
  const closed = new Map<string, number>();
  let best = Infinity;
  const paths: Point[][] = [];

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    if (current.f > best) break;
    const cKey = key(current);
    if (current.x === goal.x && current.y === goal.y) {
      if (current.g <= best) {
        best = current.g;
        const path: Point[] = [];
        let n: Node | null = current;
        while (n) {
          path.unshift({ x: n.x, y: n.y });
          n = n.parent;
        }
        paths.push(path);
      }
      continue;
    }
    closed.set(cKey, current.g);
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    for (const d of dirs) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nKey = `${nx},${ny}`;
      if (walls.has(nKey)) continue;
      const g = current.g + 1;
      if (g > best) continue;
      if (closed.has(nKey) && closed.get(nKey)! <= g) continue;
      const h = Math.abs(nx - goal.x) + Math.abs(ny - goal.y);
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
    }
  }

  return paths;
}

export interface Enemy {
  id: number;
  path: number;
  index: number;
  x: number;
  y: number;
  health?: number;
}

export const spawnWave = (count: number, paths: Point[][]): Enemy[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    path: i % Math.max(paths.length, 1),
    index: 0,
    x: paths[i % Math.max(paths.length, 1)][0].x,
    y: paths[i % Math.max(paths.length, 1)][0].y,
  }));

export const stepEnemies = (enemies: Enemy[], paths: Point[][]): Enemy[] =>
  enemies.map((e) => {
    const path = paths[e.path];
    const next = Math.min(e.index + 1, path.length - 1);
    return { ...e, index: next, x: path[next].x, y: path[next].y };
  });

export const createEmptyMap = (size: number): MapData => ({
  width: size,
  height: size,
  start: { x: 0, y: Math.floor(size / 2) },
  goal: { x: size - 1, y: Math.floor(size / 2) },
  walls: new Set(),
});

// ---- Flow field utilities ----

export let flowRecomputeCount = 0;

export const computeDistanceField = (map: MapData): number[][] => {
  const { width, height, goal, walls } = map;
  const dist = Array.from({ length: height }, () => Array(width).fill(Infinity));
  const queue: Point[] = [{ x: goal.x, y: goal.y }];
  dist[goal.y][goal.x] = 0;
  while (queue.length) {
    const { x, y } = queue.shift()!;
    const d = dist[y][x];
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    for (const dir of dirs) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (walls.has(`${nx},${ny}`)) continue;
      if (dist[ny][nx] > d + 1) {
        dist[ny][nx] = d + 1;
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return dist;
};

export const computeFlowField = (map: MapData) => {
  const dist = computeDistanceField(map);
  const field = Array.from({ length: map.height }, () =>
    Array.from({ length: map.width }, () => ({ dx: 0, dy: 0 }))
  );
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (dist[y][x] === Infinity) continue;
      const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];
      let best = dist[y][x];
      let bestDir = { dx: 0, dy: 0 };
      for (const d of dirs) {
        const nx = x + d.dx;
        const ny = y + d.dy;
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
        if (dist[ny][nx] < best) {
          best = dist[ny][nx];
          bestDir = d;
        }
      }
      field[y][x] = bestDir;
    }
  }
  flowRecomputeCount += 1;
  return { dist, field };
};

export const pathsFromDistance = (map: MapData, dist: number[][]): Point[][] => {
  const { start, goal } = map;
  const paths: Point[][] = [];
  const dfs = (p: Point, path: Point[]) => {
    path.push(p);
    if (p.x === goal.x && p.y === goal.y) {
      paths.push([...path]);
      path.pop();
      return;
    }
    const d = dist[p.y][p.x];
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    for (const dir of dirs) {
      const nx = p.x + dir.x;
      const ny = p.y + dir.y;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      if (dist[ny][nx] === d - 1) dfs({ x: nx, y: ny }, path);
    }
    path.pop();
  };
  if (dist[start.y][start.x] !== Infinity) dfs(start, []);
  return paths;
};

// ---- Targeting priorities ----

export type TargetPriority = 'first' | 'last' | 'closest' | 'strongest';

export interface Tower extends Point {
  range: number;
  priority: TargetPriority;
}

export const selectTarget = (
  tower: Tower,
  enemies: Enemy[],
): Enemy | null => {
  const inRange = enemies.filter(
    (e) => Math.hypot(e.x - tower.x, e.y - tower.y) <= tower.range,
  );
  if (!inRange.length) return null;
  switch (tower.priority) {
    case 'last':
      return inRange[inRange.length - 1];
    case 'closest':
      return inRange.reduce((a, b) =>
        Math.hypot(a.x - tower.x, a.y - tower.y) <
        Math.hypot(b.x - tower.x, b.y - tower.y)
          ? a
          : b,
      );
    case 'strongest':
      return inRange.reduce((a, b) => (a.health || 0) > (b.health || 0) ? a : b);
    case 'first':
    default:
      return inRange[0];
  }
};

// ---- Projectile pooling ----

export interface Projectile {
  active: boolean;
  x: number;
  y: number;
  targetId: number | null;
  damage: number;
  speed: number;
  radius?: number;
}

export const createProjectilePool = (size: number): Projectile[] =>
  Array.from({ length: size }, () => ({
    active: false,
    x: 0,
    y: 0,
    targetId: null,
    damage: 0,
    speed: 1,
    radius: 0,
  }));

export const fireProjectile = (
  pool: Projectile[],
  props: Omit<Projectile, 'active'>,
): Projectile | null => {
  const idx = pool.findIndex((p) => !p.active);
  if (idx === -1) return null;
  Object.assign(pool[idx], props, { active: true });
  return pool[idx];
};

export const deactivateProjectile = (p: Projectile) => {
  p.active = false;
};

// ---- AoE using Matter collisions ----

import { Bodies, Query } from 'matter-js';

export const applyAOE = (
  projectile: Projectile,
  enemies: Enemy[],
): Enemy[] => {
  if (!projectile.radius) return enemies;
  const projBody = Bodies.circle(projectile.x, projectile.y, projectile.radius);
  const bodies = enemies.map((e) => ({ body: Bodies.circle(e.x, e.y, 0.5), enemy: e }));
  const collisions = Query.collides(
    projBody,
    bodies.map((b) => b.body),
  );
  collisions.forEach((c) => {
    const hit = bodies.find((b) => b.body === c.bodyB || b.body === c.bodyA);
    if (hit && hit.enemy.health !== undefined)
      hit.enemy.health = Math.max(0, hit.enemy.health - projectile.damage);
  });
  return enemies;
};

