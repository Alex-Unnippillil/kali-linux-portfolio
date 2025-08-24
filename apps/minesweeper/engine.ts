export interface MinesweeperGame {
  width: number;
  height: number;
  mines: number;
  cells: Uint8Array;
  revealedCount: number;
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
  safeX: number,
  safeY: number,
): MinesweeperGame => {
  const cells = new Uint8Array(width * height);
  const indices = Array.from({ length: width * height }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const safe = new Set<number>();
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const nx = safeX + dx;
      const ny = safeY + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        safe.add(nx * width + ny);
      }
    }
  }
  let placed = 0;
  for (const id of indices) {
    if (placed >= mines) break;
    if (safe.has(id)) continue;
    cells[id] |= CellBits.Mine;
    placed++;
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const i = x * width + y;
      if (cells[i] & CellBits.Mine) continue;
      let count = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (cells[nx * width + ny] & CellBits.Mine) count++;
          }
        }
      }
      cells[i] |= count << CellBits.AdjShift;
    }
  }
  return { width, height, mines, cells, revealedCount: 0 };
};

export const createPresetGame = (
  preset: PresetName,
  safeX: number,
  safeY: number,
): MinesweeperGame => {
  const p = PRESETS[preset];
  return createGame(p.width, p.height, p.mines, safeX, safeY);
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
  const i = index(g, x, y);
  const cell = g.cells[i];
  if (cell & (CellBits.Revealed | CellBits.Flagged)) return false;
  g.cells[i] |= CellBits.Revealed;
  g.revealedCount++;
  if (cell & CellBits.Mine) return true;
  if (adjacent(g, x, y) === 0) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < g.width && ny >= 0 && ny < g.height) {
          revealCell(g, nx, ny);
        }
      }
    }
  }
  return false;
};

export const reveal = (
  g: MinesweeperGame,
  x: number,
  y: number,
): boolean => {
  const hitMine = revealCell(g, x, y);
  if (!hitMine) applySolver(g);
  return hitMine;
};

export const chord = (
  g: MinesweeperGame,
  x: number,
  y: number,
): boolean => {
  if (!isRevealed(g, x, y)) return false;
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

export const serialize = (g: MinesweeperGame) =>
  JSON.stringify({
    width: g.width,
    height: g.height,
    mines: g.mines,
    revealedCount: g.revealedCount,
    cells: Array.from(g.cells),
  });

export const deserialize = (data: string): MinesweeperGame => {
  const obj = JSON.parse(data);
  return {
    width: obj.width,
    height: obj.height,
    mines: obj.mines,
    revealedCount: obj.revealedCount,
    cells: Uint8Array.from(obj.cells),
  };
};
