import type { Position, WordPlacement } from './types';

type RNG = () => number;

// simple seeded RNG using xmur3 and mulberry32
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function (): number {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number): RNG {
  return function (): number {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRNG(seed: string): RNG {
  const seedFunc = xmur3(seed);
  return mulberry32(seedFunc());
}

interface Direction {
  readonly dx: number;
  readonly dy: number;
}

export interface GenerateOptions {
  readonly allowBackwards?: boolean;
  readonly allowDiagonal?: boolean;
}

function getDirections(options: GenerateOptions = {}): Direction[] {
  const { allowBackwards = true, allowDiagonal = true } = options;
  const dirs: Direction[] = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
  ];
  if (allowBackwards) {
    dirs.push({ dx: -1, dy: 0 }, { dx: 0, dy: -1 });
  }
  if (allowDiagonal) {
    dirs.push({ dx: 1, dy: 1 });
    if (allowBackwards) {
      dirs.push({ dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 });
    }
  }
  return dirs;
}

export interface GenerateResult {
  grid: string[][];
  placements: WordPlacement[];
}

export function generateGrid(
  words: string[],
  size = 12,
  seed = 'seed',
  options: GenerateOptions = {}
): GenerateResult {
  const rng = createRNG(seed);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const placements: WordPlacement[] = [];
  const directions = getDirections(options);
  words.forEach((w) => {
    const word = w.toUpperCase();
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const dir = directions[Math.floor(rng() * directions.length)];
      const maxRow = dir.dy > 0 ? size - word.length : dir.dy < 0 ? word.length - 1 : size - 1;
      const maxCol = dir.dx > 0 ? size - word.length : dir.dx < 0 ? word.length - 1 : size - 1;
      const startRow = Math.floor(rng() * (maxRow + 1));
      const startCol = Math.floor(rng() * (maxCol + 1));
      let ok = true;
      const positions: Position[] = [];
      for (let i = 0; i < word.length; i += 1) {
        const r = startRow + dir.dy * i;
        const c = startCol + dir.dx * i;
        const existing = grid[r][c];
        if (existing && existing !== word[i]) {
          ok = false;
          break;
        }
        positions.push({ row: r, col: c });
      }
      if (!ok) continue;
      positions.forEach((p, i) => {
        grid[p.row][p.col] = word[i];
      });
      placements.push({ word, positions });
      return;
    }
  });
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!grid[r][c]) {
        grid[r][c] = letters[Math.floor(rng() * letters.length)];
      }
    }
  }
  return { grid, placements };
}
