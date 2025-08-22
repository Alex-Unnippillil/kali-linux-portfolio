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
