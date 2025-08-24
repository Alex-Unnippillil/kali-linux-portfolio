export interface MinesweeperGame {
  width: number;
  height: number;
  mines: number;
  cells: Uint8Array;
  revealedCount: number;
  initialized: boolean;
}

export const enum CellBits {
  Mine = 1,
  Revealed = 2,
  Flagged = 4,
  AdjShift = 3,
}

const index = (g: MinesweeperGame, x: number, y: number) => x * g.width + y;

export const PRESETS = {
  beginner: { width: 9, height: 9, mines: 10 },
  intermediate: { width: 16, height: 16, mines: 40 },
  expert: { width: 30, height: 16, mines: 99 },
} as const;

export type PresetName = keyof typeof PRESETS;

export const createGame = (
  width: number,
  height: number,
  mines: number,
): MinesweeperGame => ({
  width,
  height,
  mines,
  cells: new Uint8Array(width * height),
  revealedCount: 0,
  initialized: false,
});

const initGame = (
  g: MinesweeperGame,
  safeX: number,
  safeY: number,
  rng: () => number = Math.random,
) => {
  const indices = Array.from({ length: g.width * g.height }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const safe = new Set<number>();
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const nx = safeX + dx;
      const ny = safeY + dy;
      if (nx >= 0 && nx < g.width && ny >= 0 && ny < g.height) {
        safe.add(nx * g.width + ny);
      }
    }
  }
  let placed = 0;
  for (const id of indices) {
    if (placed >= g.mines) break;
    if (safe.has(id)) continue;
    g.cells[id] |= CellBits.Mine;
    placed++;
  }
  for (let x = 0; x < g.width; x++) {
    for (let y = 0; y < g.height; y++) {
      const i = x * g.width + y;
      if (g.cells[i] & CellBits.Mine) continue;
      let count = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < g.width && ny >= 0 && ny < g.height) {
            if (g.cells[nx * g.width + ny] & CellBits.Mine) count++;
          }
        }
      }
      g.cells[i] |= count << CellBits.AdjShift;
    }
  }
  g.initialized = true;
};

export const createPresetGame = (preset: PresetName): MinesweeperGame => {
  const p = PRESETS[preset];
  return createGame(p.width, p.height, p.mines);
};

export const adjacent = (g: MinesweeperGame, x: number, y: number) =>
  g.cells[index(g, x, y)] >> CellBits.AdjShift;

export const isMine = (g: MinesweeperGame, x: number, y: number) =>
  (g.cells[index(g, x, y)] & CellBits.Mine) !== 0;

export const isRevealed = (g: MinesweeperGame, x: number, y: number) =>
  (g.cells[index(g, x, y)] & CellBits.Revealed) !== 0;

export const isFlagged = (g: MinesweeperGame, x: number, y: number) =>
  (g.cells[index(g, x, y)] & CellBits.Flagged) !== 0;

export const toggleFlag = (g: MinesweeperGame, x: number, y: number) => {
  const i = index(g, x, y);
  if (g.cells[i] & CellBits.Revealed) return;
  g.cells[i] ^= CellBits.Flagged;
};

export interface SolverAction {
  x: number;
  y: number;
  flag: boolean;
}

const solveConstraints = (g: MinesweeperGame): SolverAction[] => {
  const actions: Map<number, SolverAction> = new Map();
  for (let x = 0; x < g.width; x++) {
    for (let y = 0; y < g.height; y++) {
      if (!isRevealed(g, x, y)) continue;
      const adj = adjacent(g, x, y);
      let flagged = 0;
      const hidden: { x: number; y: number }[] = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < g.width && ny >= 0 && ny < g.height) {
            if (isFlagged(g, nx, ny)) flagged++;
            else if (!isRevealed(g, nx, ny)) hidden.push({ x: nx, y: ny });
          }
        }
      }
      if (!hidden.length) continue;
      if (flagged === adj) {
        for (const h of hidden) {
          const id = index(g, h.x, h.y);
          actions.set(id, { x: h.x, y: h.y, flag: false });
        }
      } else if (flagged + hidden.length === adj) {
        for (const h of hidden) {
          const id = index(g, h.x, h.y);
          actions.set(id, { x: h.x, y: h.y, flag: true });
        }
      }
    }
  }
  return Array.from(actions.values());
};

export function applySolver(g: MinesweeperGame): boolean {
  let changed = false;
  while (true) {
    const actions = solveConstraints(g);
    if (actions.length === 0) break;
    changed = true;
    for (const a of actions) {
      if (a.flag) {
        const i = index(g, a.x, a.y);
        if (!(g.cells[i] & CellBits.Flagged)) g.cells[i] |= CellBits.Flagged;
      } else {
        revealCell(g, a.x, a.y);
      }
    }
  }
  return changed;
}

export const getHint = (g: MinesweeperGame): SolverAction | null => {
  const actions = solveConstraints(g);
  return actions.length > 0 ? actions[0] : null;
};

const revealCell = (
  g: MinesweeperGame,
  x: number,
  y: number,
): boolean => {
  const stack: { x: number; y: number }[] = [{ x, y }];
  let hit = false;
  while (stack.length) {
    const { x: cx, y: cy } = stack.pop()!;
    const i = index(g, cx, cy);
    const cell = g.cells[i];
    if (cell & (CellBits.Revealed | CellBits.Flagged)) continue;
    g.cells[i] |= CellBits.Revealed;
    g.revealedCount++;
    if (cell & CellBits.Mine) {
      hit = true;
      continue;
    }
    if (adjacent(g, cx, cy) === 0) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < g.width && ny >= 0 && ny < g.height) {
            stack.push({ x: nx, y: ny });
          }
        }
      }
    }
  }
  return hit;
};

export const reveal = (
  g: MinesweeperGame,
  x: number,
  y: number,
): boolean => {
  if (!g.initialized) initGame(g, x, y);
  const hitMine = revealCell(g, x, y);
  if (!hitMine) applySolver(g);
  return hitMine;
};

export const chord = (
  g: MinesweeperGame,
  x: number,
  y: number,
): boolean => {
  if (!g.initialized || !isRevealed(g, x, y)) return false;
  const adj = adjacent(g, x, y);
  let flagged = 0;
  const hidden: { x: number; y: number }[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < g.width && ny >= 0 && ny < g.height) {
        if (isFlagged(g, nx, ny)) flagged++;
        else if (!isRevealed(g, nx, ny)) hidden.push({ x: nx, y: ny });
      }
    }
  }
  if (flagged !== adj) return false;
  let hit = false;
  for (const h of hidden) {
    hit = revealCell(g, h.x, h.y) || hit;
  }
  if (!hit) applySolver(g);
  return hit;
};

export const isComplete = (g: MinesweeperGame) =>
  g.revealedCount >= g.width * g.height - g.mines;

export const computeProbabilities = (g: MinesweeperGame): number[] => {
  const probs = Array(g.width * g.height).fill(0);
  const hidden: number[] = [];
  const frontier: number[] = [];
  let flagged = 0;
  for (let x = 0; x < g.width; x++) {
    for (let y = 0; y < g.height; y++) {
      const i = index(g, x, y);
      const cell = g.cells[i];
      if (cell & CellBits.Flagged) {
        flagged++;
        continue;
      }
      if (!(cell & CellBits.Revealed)) {
        hidden.push(i);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < g.width && ny >= 0 && ny < g.height) {
              if (isRevealed(g, nx, ny)) {
                frontier.push(i);
                dx = dy = 2; // break loops
              }
            }
          }
        }
      }
    }
  }
  const uniqueFrontier = Array.from(new Set(frontier));
  const otherHidden = hidden.filter((i) => !uniqueFrontier.includes(i));
  const constraints: { cells: number[]; count: number }[] = [];
  for (let x = 0; x < g.width; x++) {
    for (let y = 0; y < g.height; y++) {
      if (!isRevealed(g, x, y)) continue;
      const cells: number[] = [];
      let flagC = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < g.width && ny >= 0 && ny < g.height) {
            const ni = index(g, nx, ny);
            if (isFlagged(g, nx, ny)) flagC++;
            else if (!isRevealed(g, nx, ny)) cells.push(ni);
          }
        }
      }
      if (cells.length) {
        constraints.push({ cells, count: adjacent(g, x, y) - flagC });
      }
    }
  }
  const remainingMines = g.mines - flagged;
  const F = uniqueFrontier.length;
  if (F === 0) {
    const prob = remainingMines / hidden.length;
    hidden.forEach((i) => (probs[i] = prob));
    return probs;
  }
  let total = 0;
  const mineCount = Array(F).fill(0);
  let outsideMineSum = 0;
  const outsideCount = otherHidden.length;
  const frontierIdxMap = new Map<number, number>();
  uniqueFrontier.forEach((id, i) => frontierIdxMap.set(id, i));
  const constraintIdx = constraints.map((c) => c.cells.map((id) => frontierIdxMap.get(id)!));
  const max = 1 << F;
  for (let mask = 0; mask < max; mask++) {
    let minesInMask = 0;
    let valid = true;
    for (let i = 0; i < F; i++) if (mask & (1 << i)) minesInMask++;
    if (minesInMask > remainingMines) continue;
    for (let ci = 0; ci < constraints.length; ci++) {
      let cnt = 0;
      for (const idx of constraintIdx[ci]) if (mask & (1 << idx)) cnt++;
      if (cnt !== constraints[ci].count) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;
    total++;
    for (let i = 0; i < F; i++) if (mask & (1 << i)) mineCount[i]++;
    outsideMineSum += remainingMines - minesInMask;
  }
  if (total === 0) return probs;
  for (let i = 0; i < F; i++) {
    probs[uniqueFrontier[i]] = mineCount[i] / total;
  }
  if (outsideCount) {
    const p = outsideMineSum / (total * outsideCount);
    otherHidden.forEach((i) => (probs[i] = p));
  }
  return probs;
};

export const serialize = (g: MinesweeperGame) =>
  JSON.stringify({
    width: g.width,
    height: g.height,
    mines: g.mines,
    revealedCount: g.revealedCount,
    initialized: g.initialized,
    cells: Array.from(g.cells),
  });

export const deserialize = (data: string): MinesweeperGame => {
  const obj = JSON.parse(data);
  return {
    width: obj.width,
    height: obj.height,
    mines: obj.mines,
    revealedCount: obj.revealedCount,
    initialized: obj.initialized || false,
    cells: Uint8Array.from(obj.cells),
  };
};
