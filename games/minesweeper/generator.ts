import type { Cell } from './save';
import { calculate3BV } from './metrics';
import { getSafeZone, validateConfig, recomputeAdjacents } from './logic';

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
  const validated = validateConfig(size, mines, {
    start: [startX, startY],
  });
  const board: Cell[][] = Array.from({ length: validated.size }, () =>
    Array.from({ length: validated.size }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      question: false,
      adjacent: 0,
    })),
  );

  const rng = mulberry32(seed);
  const indices = Array.from({ length: validated.size * validated.size }, (_, i) => i);

  // Fisher-Yates shuffle using seeded rng
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const safe = getSafeZone(validated.size, [startX, startY]);

  let placed = 0;
  for (const idx of indices) {
    if (placed >= validated.mines) break;
    if (safe.has(idx)) continue;
    const x = Math.floor(idx / validated.size);
    const y = idx % validated.size;
    board[x][y].mine = true;
    placed++;
  }

  recomputeAdjacents(board);

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
