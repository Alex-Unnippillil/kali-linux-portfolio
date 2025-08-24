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

interface SimpleState {
  width: number;
  height: number;
  walls: Set<string>;
  targets: Set<string>;
  boxes: Set<string>;
  player: Position;
}

function heuristic(state: SimpleState): number {
  const targetArr = Array.from(state.targets).map((t) => t.split(',').map(Number));
  let h = 0;
  state.boxes.forEach((b) => {
    const [bx, by] = b.split(',').map(Number);
    let min = Infinity;
    for (const [tx, ty] of targetArr) {
      const d = Math.abs(bx - tx) + Math.abs(by - ty);
      if (d < min) min = d;
    }
    h += min;
  });
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

interface Node {
  state: SimpleState;
  g: number;
  f: number;
  path: string[];
}

function solve(start: SimpleState): string[] {
  const open: Node[] = [{ state: start, g: 0, f: heuristic(start), path: [] }];
  const visited = new Map<string, number>();
  visited.set(stateKey(start), 0);
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    if (isSolved(cur.state)) return cur.path;
    for (const dir of dirKeys) {
      const next = moveState(cur.state, dir);
      if (!next) continue;
      const g = cur.g + 1;
      const keyStr = stateKey(next);
      if (visited.has(keyStr) && visited.get(keyStr)! <= g) continue;
      visited.set(keyStr, g);
      const h = heuristic(next);
      open.push({ state: next, g, f: g + h, path: [...cur.path, dir] });
    }
  }
  return [];
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

export {};
