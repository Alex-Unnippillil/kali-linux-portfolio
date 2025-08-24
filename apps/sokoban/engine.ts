export type Position = { x: number; y: number };
export interface State {
  width: number;
  height: number;
  walls: Set<string>;
  targets: Set<string>;
  boxes: Set<string>;
  player: Position;
  pushes: number;
  moves: number;
  history: HistoryEntry[];
  future: HistoryEntry[];
  deadlocks: Set<string>;
}
interface HistoryEntry {
  player: Position;
  boxes: string[];
  pushes: number;
  moves: number;
}
const key = (p: Position) => `${p.x},${p.y}`;

export function loadLevel(lines: string[]): State {
  const walls = new Set<string>();
  const targets = new Set<string>();
  const boxes = new Set<string>();
  let player: Position = { x: 0, y: 0 };
  lines.forEach((line, y) => {
    line.split('').forEach((ch, x) => {
      const k = key({ x, y });
      switch (ch) {
        case '#':
          walls.add(k);
          break;
        case '.':
          targets.add(k);
          break;
        case '$':
          boxes.add(k);
          break;
        case '*':
          boxes.add(k);
          targets.add(k);
          break;
        case '@':
          player = { x, y };
          break;
        case '+':
          player = { x, y };
          targets.add(k);
          break;
        default:
          break;
      }
    });
  });
  const width = Math.max(...lines.map((l) => l.length));
  const height = lines.length;
  const state: State = {
    width,
    height,
    walls,
    targets,
    boxes,
    player,
    pushes: 0,
    moves: 0,
    history: [],
    future: [],
    deadlocks: new Set(),
  };
  state.deadlocks = computeDeadlocks(state);
  return state;
}

function cloneState(state: State): HistoryEntry {
  return {
    player: { ...state.player },
    boxes: Array.from(state.boxes),
    pushes: state.pushes,
    moves: state.moves,
  };
}

export const DIRS: Record<string, Position> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

function isWallOrBox(state: State, pos: Position): boolean {
  const k = key(pos);
  if (pos.x < 0 || pos.y < 0 || pos.x >= state.width || pos.y >= state.height) return true;
  return state.walls.has(k) || state.boxes.has(k);
}

export function isDeadlockPosition(state: State, pos: Position): boolean {
  const k = key(pos);
  if (state.targets.has(k)) return false;
  const up = isWallOrBox(state, { x: pos.x, y: pos.y - 1 });
  const down = isWallOrBox(state, { x: pos.x, y: pos.y + 1 });
  const left = isWallOrBox(state, { x: pos.x - 1, y: pos.y });
  const right = isWallOrBox(state, { x: pos.x + 1, y: pos.y });
  return (up && left) || (up && right) || (down && left) || (down && right);
}

function isWall(state: State, pos: Position): boolean {
  const k = key(pos);
  if (pos.x < 0 || pos.y < 0 || pos.x >= state.width || pos.y >= state.height) return true;
  return state.walls.has(k);
}

function hasTargetInRow(state: State, y: number): boolean {
  for (let x = 0; x < state.width; x += 1) {
    if (state.targets.has(`${x},${y}`)) return true;
  }
  return false;
}

function hasTargetInColumn(state: State, x: number): boolean {
  for (let y = 0; y < state.height; y += 1) {
    if (state.targets.has(`${x},${y}`)) return true;
  }
  return false;
}

function computeDeadlocks(state: State): Set<string> {
  const d = new Set<string>();
  const add = (k: string) => {
    if (!state.targets.has(k)) d.add(k);
  };
  state.boxes.forEach((b) => {
    const [x, y] = b.split(',').map(Number);
    const pos = { x, y };
    if (isDeadlockPosition(state, pos)) {
      add(b);
      return;
    }
    const upWall = isWall(state, { x, y: y - 1 });
    const downWall = isWall(state, { x, y: y + 1 });
    const leftWall = isWall(state, { x: x - 1, y });
    const rightWall = isWall(state, { x: x + 1, y });

    // corridor deadlocks
    if (upWall && downWall && !hasTargetInRow(state, y)) add(b);
    else if (leftWall && rightWall && !hasTargetInColumn(state, x)) add(b);

    // freeze deadlocks (pairs along walls)
    const rowHasTarget = hasTargetInRow(state, y);
    const colHasTarget = hasTargetInColumn(state, x);
    if ((upWall || downWall) && !rowHasTarget) {
      const leftKey = `${x - 1},${y}`;
      const rightKey = `${x + 1},${y}`;
      if (state.boxes.has(leftKey) && (upWall || isWall(state, { x: x - 1, y: y + 1 })) && (downWall || isWall(state, { x: x - 1, y: y - 1 }))) {
        add(b);
        add(leftKey);
      }
      if (state.boxes.has(rightKey) && (upWall || isWall(state, { x: x + 1, y: y + 1 })) && (downWall || isWall(state, { x: x + 1, y: y - 1 }))) {
        add(b);
        add(rightKey);
      }
    }
    if ((leftWall || rightWall) && !colHasTarget) {
      const upKey = `${x},${y - 1}`;
      const downKey = `${x},${y + 1}`;
      if (state.boxes.has(upKey) && (leftWall || isWall(state, { x: x + 1, y: y - 1 })) && (rightWall || isWall(state, { x: x - 1, y: y - 1 }))) {
        add(b);
        add(upKey);
      }
      if (state.boxes.has(downKey) && (leftWall || isWall(state, { x: x + 1, y: y + 1 })) && (rightWall || isWall(state, { x: x - 1, y: y + 1 }))) {
        add(b);
        add(downKey);
      }
    }
  });
  return d;
}

export function move(state: State, dirKey: keyof typeof DIRS): State {
  const dir = DIRS[dirKey];
  if (!dir) return state;
  const next: Position = { x: state.player.x + dir.x, y: state.player.y + dir.y };
  const nextKey = key(next);
  if (state.walls.has(nextKey)) return state;
  const result = {
    ...state,
    player: { ...state.player },
    boxes: new Set(state.boxes),
    history: [...state.history],
    future: [],
  };
  result.history.push(cloneState(state));
  if (result.boxes.has(nextKey)) {
    const beyond: Position = { x: next.x + dir.x, y: next.y + dir.y };
    const beyondKey = key(beyond);
    if (isWallOrBox(state, beyond)) {
      result.history.pop();
      return state;
    }
    result.boxes.delete(nextKey);
    result.boxes.add(beyondKey);
    result.pushes += 1;
  }
  result.player = next;
  result.moves += 1;
  result.deadlocks = computeDeadlocks(result);
  return result;
}

export function undo(state: State): State {
  if (!state.history.length) return state;
  const prev = state.history[state.history.length - 1];
  const boxes = new Set(prev.boxes);
  const restored: State = {
    ...state,
    player: { ...prev.player },
    boxes,
    pushes: prev.pushes,
    moves: prev.moves,
    history: state.history.slice(0, -1),
    future: [...state.future, cloneState(state)],
  };
  restored.deadlocks = computeDeadlocks(restored);
  return restored;
}

export function redo(state: State): State {
  if (!state.future.length) return state;
  const next = state.future[state.future.length - 1];
  const boxes = new Set(next.boxes);
  const restored: State = {
    ...state,
    player: { ...next.player },
    boxes,
    pushes: next.pushes,
    moves: next.moves,
    history: [...state.history, cloneState(state)],
    future: state.future.slice(0, -1),
  };
  restored.deadlocks = computeDeadlocks(restored);
  return restored;
}

export function reset(lines: string[]): State {
  return loadLevel(lines);
}

export function reachable(state: State): Set<string> {
  const visited = new Set<string>();
  const q: Position[] = [state.player];
  visited.add(key(state.player));
  while (q.length) {
    const p = q.shift()!;
    Object.values(DIRS).forEach((d) => {
      const n = { x: p.x + d.x, y: p.y + d.y };
      const k = key(n);
      if (visited.has(k) || isWallOrBox(state, n)) return;
      if (state.boxes.has(k)) return; // cannot walk through boxes
      visited.add(k);
      q.push(n);
    });
  }
  return visited;
}

export function isSolved(state: State): boolean {
  let solved = true;
  state.boxes.forEach((b) => {
    if (!state.targets.has(b)) {
      solved = false;
    }
  });
  return solved;
}

export const directionKeys = Object.keys(DIRS) as (keyof typeof DIRS)[];
