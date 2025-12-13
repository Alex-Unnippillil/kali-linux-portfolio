import type { Cell } from './save';

export type Coord = [number, number];
export type Board = Cell[][];

const mulberry32 = (a: number): (() => number) => {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export function validateConfig(
  size: number,
  mines: number,
  options: { safeRadius?: number; start?: Coord } = {},
): { size: number; mines: number } {
  const normalizedSize = Math.max(2, Math.floor(size || 0));
  const normalizedMines = Math.max(0, Math.floor(mines || 0));
  const { safeRadius = 1, start } = options;
  const startCoord: Coord = start ?? [Math.floor(normalizedSize / 2), Math.floor(normalizedSize / 2)];
  const safeZone = getSafeZone(normalizedSize, startCoord, safeRadius);
  const safeZoneCount = safeZone.size;
  const maxMines = normalizedSize * normalizedSize - safeZoneCount;
  return {
    size: normalizedSize,
    mines: Math.min(normalizedMines, Math.max(0, maxMines)),
  };
}

export function getSafeZone(
  size: number,
  start: Coord,
  safeRadius = 1,
): Set<number> {
  const [sx, sy] = start;
  const safe = new Set<number>();
  for (let dx = -safeRadius; dx <= safeRadius; dx++) {
    for (let dy = -safeRadius; dy <= safeRadius; dy++) {
      const nx = sx + dx;
      const ny = sy + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        safe.add(nx * size + ny);
      }
    }
  }
  return safe;
}

export function recomputeAdjacents(board: Board): void {
  const size = board.length;
  const dirs = [-1, 0, 1];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (board[x][y].mine) continue;
      let count = 0;
      for (const dx of dirs) {
        for (const dy of dirs) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[nx][ny].mine) {
            count++;
          }
        }
      }
      board[x][y].adjacent = count;
    }
  }
}

export function ensureFirstClickSafe(board: Board, start: Coord, seed: number): Board {
  const size = board.length;
  const safeSet = getSafeZone(size, start, 1);
  const clone = board.map((row) => row.map((cell) => ({ ...cell })));
  const minesInSafe: Coord[] = [];
  const destinations: Coord[] = [];

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const idx = x * size + y;
      if (clone[x][y].mine) {
        if (safeSet.has(idx)) {
          minesInSafe.push([x, y]);
        }
      } else if (!safeSet.has(idx)) {
        destinations.push([x, y]);
      }
    }
  }

  if (!minesInSafe.length) return clone;

  const rng = mulberry32(seed ^ (start[0] << 16) ^ start[1]);
  for (let i = destinations.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [destinations[i], destinations[j]] = [destinations[j], destinations[i]];
  }

  let destIndex = 0;
  for (const [mx, my] of minesInSafe) {
    while (destIndex < destinations.length && clone[destinations[destIndex][0]][destinations[destIndex][1]].mine) {
      destIndex++;
    }
    const destination = destinations[destIndex];
    if (!destination) break;
    const [dx, dy] = destination;
    clone[mx][my].mine = false;
    clone[dx][dy].mine = true;
    destIndex++;
  }

  recomputeAdjacents(clone);
  return clone;
}

export function computeReveal(board: Board, starts: Coord[]): { cells: Coord[]; hit: boolean } {
  const size = board.length;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const queue: Coord[] = [];
  (starts || []).forEach(([sx, sy]) => {
    if (sx >= 0 && sx < size && sy >= 0 && sy < size && !visited[sx][sy]) {
      visited[sx][sy] = true;
      queue.push([sx, sy]);
    }
  });
  const cells: Coord[] = [];
  let hit = false;
  let head = 0;
  while (head < queue.length) {
    const [x, y] = queue[head++];
    const cell = board[x][y];
    if (cell.revealed || cell.flagged) continue;
    cells.push([x, y]);
    if (cell.mine) {
      hit = true;
      continue;
    }
    if (cell.adjacent === 0) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited[nx][ny]) {
            visited[nx][ny] = true;
            queue.push([nx, ny]);
          }
        }
      }
    }
  }
  return { cells, hit };
}

export function applyReveal(board: Board, cells: Coord[]): Board {
  const clone = board.map((row) => row.map((cell) => ({ ...cell })));
  cells.forEach(([x, y]) => {
    const cell = clone[x][y];
    if (!cell.flagged) {
      cell.revealed = true;
      cell.question = false;
    }
  });
  return clone;
}

export function countAdjacentFlags(board: Board, x: number, y: number): number {
  let flags = 0;
  const neighbors = getNeighbors(board.length, x, y);
  neighbors.forEach(([nx, ny]) => {
    if (board[nx][ny].flagged) flags++;
  });
  return flags;
}

export function getNeighbors(size: number, x: number, y: number): Coord[] {
  const coords: Coord[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        coords.push([nx, ny]);
      }
    }
  }
  return coords;
}

export function computeChord(board: Board, x: number, y: number): { cells: Coord[]; hit: boolean } | null {
  const cell = board[x]?.[y];
  if (!cell || !cell.revealed || cell.adjacent === 0) return null;
  const flags = countAdjacentFlags(board, x, y);
  if (flags !== cell.adjacent) return null;
  const neighbors = getNeighbors(board.length, x, y).filter(([nx, ny]) => {
    const neighbor = board[nx][ny];
    return !neighbor.revealed && !neighbor.flagged;
  });
  if (!neighbors.length) return { cells: [], hit: false };
  return computeReveal(board, neighbors);
}

export function checkWin(board: Board): boolean {
  return board.flat().every((cell) => cell.revealed || cell.mine);
}
