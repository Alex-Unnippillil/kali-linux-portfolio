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

export const reveal = (
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
          reveal(g, nx, ny);
        }
      }
    }
  }
  return false;
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
