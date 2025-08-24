const ctx: Worker = self as any;

export type Position = { x: number; y: number };
interface WorkerState {
  width: number;
  height: number;
  walls: string[];
  targets: string[];
  boxes: string[];
  player: Position;
}
interface SolveRequest {
  state: WorkerState;
}
interface SolveResponse {
  moves: string[];
}

const DIRS: Record<string, Position> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};
const dirKeys = Object.keys(DIRS) as (keyof typeof DIRS)[];

const key = (p: Position) => `${p.x},${p.y}`;

function isWallOrBox(state: SimpleState, pos: Position): boolean {
  const k = key(pos);
  if (pos.x < 0 || pos.y < 0 || pos.x >= state.width || pos.y >= state.height) return true;
  return state.walls.has(k) || state.boxes.has(k);
}

function isDeadlock(state: SimpleState, pos: Position): boolean {
  const k = key(pos);
  if (state.targets.has(k)) return false;
  const up = isWallOrBox(state, { x: pos.x, y: pos.y - 1 });
  const down = isWallOrBox(state, { x: pos.x, y: pos.y + 1 });
  const left = isWallOrBox(state, { x: pos.x - 1, y: pos.y });
  const right = isWallOrBox(state, { x: pos.x + 1, y: pos.y });
  return (up && left) || (up && right) || (down && left) || (down && right);
}

export interface SimpleState {
  width: number;
  height: number;
  walls: Set<string>;
  targets: Set<string>;
  boxes: Set<string>;
  player: Position;
}

function buildPatternDB(state: SimpleState): Map<string, number> {
  const dist = new Map<string, number>();
  const q: Position[] = [];
  state.targets.forEach((t) => {
    const [x, y] = t.split(',').map(Number);
    const p = { x, y };
    q.push(p);
    dist.set(t, 0);
  });
  while (q.length) {
    const p = q.shift()!;
    const d = dist.get(key(p))!;
    for (const dir of Object.values(DIRS)) {
      const n = { x: p.x + dir.x, y: p.y + dir.y };
      const k = key(n);
      if (dist.has(k) || isWallOrBox({ ...state, boxes: new Set() }, n)) continue;
      dist.set(k, d + 1);
      q.push(n);
    }
  }
  return dist;
}

function heuristic(state: SimpleState, pdb: Map<string, number>): number {
  let h = 0;
  for (const b of state.boxes) {
    const d = pdb.get(b);
    if (d === undefined) return Infinity;
    h += d;
  }
  return h;
}

function stateKey(state: SimpleState): string {
  const boxes = Array.from(state.boxes).sort().join('|');
  return `${state.player.x},${state.player.y};${boxes}`;
}

function moveState(state: SimpleState, dir: keyof typeof DIRS): SimpleState | null {
  const d = DIRS[dir];
  const next = { x: state.player.x + d.x, y: state.player.y + d.y };
  const nextKey = key(next);
  if (state.walls.has(nextKey)) return null;
  const boxes = new Set(state.boxes);
  if (boxes.has(nextKey)) {
    const beyond = { x: next.x + d.x, y: next.y + d.y };
    const beyondKey = key(beyond);
    if (isWallOrBox(state, beyond)) return null;
    boxes.delete(nextKey);
    boxes.add(beyondKey);
    if (isDeadlock({ ...state, boxes }, beyond)) return null;
  }
  return { ...state, player: next, boxes };
}

function isSolved(state: SimpleState): boolean {
  let solved = true;
  state.boxes.forEach((b) => {
    if (!state.targets.has(b)) solved = false;
  });
  return solved;
}

const FOUND = Symbol('found');

function idaSearch(
  state: SimpleState,
  g: number,
  bound: number,
  path: (keyof typeof DIRS)[],
  pdb: Map<string, number>,
  visited: Set<string>
): number | typeof FOUND {
  const f = g + heuristic(state, pdb);
  if (f > bound) return f;
  if (isSolved(state)) return FOUND;
  let min = Infinity;
  for (const dir of dirKeys) {
    const next = moveState(state, dir);
    if (!next) continue;
    const k = stateKey(next);
    if (visited.has(k)) continue;
    visited.add(k);
    path.push(dir);
    const t = idaSearch(next, g + 1, bound, path, pdb, visited);
    if (t === FOUND) return FOUND;
    if (typeof t === 'number' && t < min) min = t;
    path.pop();
    visited.delete(k);
  }
  return min;
}

export function solve(start: SimpleState): string[] {
  const pdb = buildPatternDB(start);
  let bound = heuristic(start, pdb);
  const path: (keyof typeof DIRS)[] = [];
  const visited = new Set<string>();
  while (true) {
    visited.clear();
    visited.add(stateKey(start));
    const t = idaSearch(start, 0, bound, path, pdb, visited);
    if (t === FOUND) return path.slice();
    if (typeof t === 'number' && t === Infinity) return [];
    bound = t as number;
  }
}

ctx.onmessage = (e: MessageEvent<SolveRequest>) => {
  const { state: raw } = e.data;
  const state: SimpleState = {
    width: raw.width,
    height: raw.height,
    walls: new Set(raw.walls),
    targets: new Set(raw.targets),
    boxes: new Set(raw.boxes),
    player: raw.player,
  };
  const moves = solve(state);
  const res: SolveResponse = { moves };
  ctx.postMessage(res);
};
