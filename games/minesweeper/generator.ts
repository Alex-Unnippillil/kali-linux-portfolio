import type { Cell } from './save';
import { calculate3BV } from './metrics';

interface GenerateOptions {
  size?: number;
  mines?: number;
  startX?: number;
  startY?: number;
}

// simple seeded pseudo random generator
function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateBoard(
  seed: number,
  { size = 8, mines = 10, startX = 0, startY = 0 }: GenerateOptions = {},
): Cell[][] {
  const board: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      question: false,
      adjacent: 0,
    })),
  );

  const rng = mulberry32(seed);
  const indices = Array.from({ length: size * size }, (_, i) => i);

  // Fisher-Yates shuffle using seeded rng
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const safe = new Set<number>();
  const SAFE_RADIUS = 2;
  for (let dx = -SAFE_RADIUS; dx <= SAFE_RADIUS; dx++) {
    for (let dy = -SAFE_RADIUS; dy <= SAFE_RADIUS; dy++) {
      const nx = startX + dx;
      const ny = startY + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        safe.add(nx * size + ny);
      }
    }
  }

  let placed = 0;
  for (const idx of indices) {
    if (placed >= mines) break;
    if (safe.has(idx)) continue;
    const x = Math.floor(idx / size);
    const y = idx % size;
    board[x][y].mine = true;
    placed++;
  }

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

  return board;
}

export function generateBoardWith3BV(
  seed: number,
  options?: GenerateOptions,
): { board: Cell[][]; bv: number } {
  const board = generateBoard(seed, options);
  return { board, bv: calculate3BV(board) };
}

export default generateBoard;
