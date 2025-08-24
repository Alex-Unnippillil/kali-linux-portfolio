import type { Point } from './engine';

interface State {
  gridSize: number;
  snake: Point[];
  food: Point;
  obstacles: Point[];
  wrap: boolean;
}

const key = (p: Point) => `${p.x},${p.y}`;

const dirs: Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const neighbors = (p: Point, size: number, wrap: boolean): Point[] => {
  return dirs
    .map((d) => ({ x: p.x + d.x, y: p.y + d.y }))
    .map((n) => {
      if (wrap) {
        return { x: (n.x + size) % size, y: (n.y + size) % size };
      }
      return n;
    })
    .filter((n) => n.x >= 0 && n.x < size && n.y >= 0 && n.y < size);
};

const bfs = (
  start: Point,
  target: Point,
  occupied: Set<string>,
  size: number,
  wrap: boolean
): Map<string, string> | null => {
  const q: Point[] = [start];
  const prev = new Map<string, string>();
  const visited = new Set<string>([key(start)]);
  while (q.length) {
    const cur = q.shift()!;
    if (cur.x === target.x && cur.y === target.y) return prev;
    for (const n of neighbors(cur, size, wrap)) {
      const k = key(n);
      if (visited.has(k) || occupied.has(k)) continue;
      visited.add(k);
      prev.set(k, key(cur));
      q.push(n);
    }
  }
  return null;
};

const reconstruct = (prev: Map<string, string>, target: string): Point[] => {
  const path: Point[] = [];
  let k: string | undefined = target;
  while (k) {
    const [x, y] = k.split(',').map(Number);
    path.push({ x, y });
    k = prev.get(k);
  }
  return path.reverse();
};

const cycleCache: Record<number, Point[]> = {};

const generateCycle = (size: number): Point[] => {
  const cycle: Point[] = [];
  for (let y = 0; y < size; y++) {
    if (y % 2 === 0) {
      for (let x = 0; x < size; x++) cycle.push({ x, y });
    } else {
      for (let x = size - 1; x >= 0; x--) cycle.push({ x, y });
    }
  }
  cycle.push({ x: 0, y: 0 });
  return cycle;
};

const hamiltonianDir = (state: State): Point => {
  const { gridSize, snake } = state;
  let cycle = cycleCache[gridSize];
  if (!cycle) cycleCache[gridSize] = cycle = generateCycle(gridSize);
  const head = snake[0];
  const idx = cycle.findIndex((p) => p.x === head.x && p.y === head.y);
  return cycle[(idx + 1) % cycle.length];
};

const decide = (state: State): Point => {
  const { gridSize, snake, food, obstacles, wrap } = state;
  const occupied = new Set<string>();
  snake.forEach((s) => occupied.add(key(s)));
  obstacles.forEach((o) => occupied.add(key(o)));
  const prev = bfs(snake[0], food, occupied, gridSize, wrap);
  if (prev) {
    const path = reconstruct(prev, key(food));
    if (path.length > 1) {
      const next = path[1];
      const newSnake = [next, ...snake.slice(0, -1)];
      const occ2 = new Set<string>();
      newSnake.forEach((s) => occ2.add(key(s)));
      obstacles.forEach((o) => occ2.add(key(o)));
      const tail = newSnake[newSnake.length - 1];
      const safe = bfs(next, tail, occ2, gridSize, wrap);
      if (safe) {
        return { x: next.x - snake[0].x, y: next.y - snake[0].y };
      }
    }
  }
  const next = hamiltonianDir(state);
  return { x: next.x - snake[0].x, y: next.y - snake[0].y };
};

(self as any).onmessage = (e: MessageEvent<State>) => {
  const dir = decide(e.data);
  (self as any).postMessage(dir);
};

export {};
