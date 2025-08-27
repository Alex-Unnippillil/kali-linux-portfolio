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

const DIRECTIONS: readonly Direction[] = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: 1 },
  { dx: -1, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },
];

export interface GenerateResult {
  grid: string[][];
  placements: WordPlacement[];
}

export function generateGrid(
  words: string[],
  size = 12,
  seed = 'seed',
  { unique = false }: { unique?: boolean } = {},
): GenerateResult {
  const rng = createRNG(seed);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const placements: WordPlacement[] = [];

  // place longer words first for better success rate
  const sorted = words
    .map((w) => w.toUpperCase())
    .sort((a, b) => b.length - a.length);

  function shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function getOptions(word: string) {
    const opts: { positions: Position[]; overlap: number }[] = [];
    DIRECTIONS.forEach((dir) => {
      const rowStart = dir.dy === 1 ? 0 : dir.dy === -1 ? word.length - 1 : 0;
      const rowEnd = dir.dy === 1 ? size - word.length : dir.dy === -1 ? size - 1 : size - 1;
      const colStart = dir.dx === 1 ? 0 : dir.dx === -1 ? word.length - 1 : 0;
      const colEnd = dir.dx === 1 ? size - word.length : dir.dx === -1 ? size - 1 : size - 1;
      for (let r = rowStart; r <= rowEnd; r += 1) {
        for (let c = colStart; c <= colEnd; c += 1) {
          let ok = true;
          let overlap = 0;
          const pos: Position[] = [];
          for (let i = 0; i < word.length; i += 1) {
            const rr = r + dir.dy * i;
            const cc = c + dir.dx * i;
            const existing = grid[rr][cc];
            if (existing && existing !== word[i]) {
              ok = false;
              break;
            }
            if (existing === word[i]) overlap += 1;
            pos.push({ row: rr, col: cc });
          }
          if (ok) opts.push({ positions: pos, overlap });
        }
      }
    });
    shuffle(opts);
    opts.sort((a, b) => b.overlap - a.overlap);
    return opts;
  }

  function placeWord(index: number): boolean {
    if (index >= sorted.length) return true;
    const word = sorted[index];
    const options = getOptions(word);
    for (const opt of options) {
      const overwritten: Position[] = [];
      opt.positions.forEach((p, i) => {
        if (!grid[p.row][p.col]) {
          grid[p.row][p.col] = word[i];
          overwritten.push(p);
        }
      });
      placements.push({ word, positions: opt.positions });
      if (placeWord(index + 1)) return true;
      placements.pop();
      overwritten.forEach((p) => {
        grid[p.row][p.col] = '';
      });
    }
    return false;
  }

  if (!placeWord(0)) {
    throw new Error('Unable to place all words');
  }

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!grid[r][c]) {
        grid[r][c] = letters[Math.floor(rng() * letters.length)];
      }
    }
  }

  if (unique && !validateGrid(sorted, grid, true)) {
    throw new Error('Puzzle does not have a unique solution');
  }

  return { grid, placements };
}

export function validateGrid(
  words: string[],
  grid: string[][],
  unique = false,
): boolean {
  const upper = words.map((w) => w.toUpperCase());
  const size = grid.length;
  const countWord = (word: string) => {
    let count = 0;
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        for (const dir of DIRECTIONS) {
          let ok = true;
          for (let i = 0; i < word.length; i += 1) {
            const rr = r + dir.dy * i;
            const cc = c + dir.dx * i;
            if (rr < 0 || rr >= size || cc < 0 || cc >= size) {
              ok = false;
              break;
            }
            if (grid[rr][cc] !== word[i]) {
              ok = false;
              break;
            }
          }
          if (ok) count += 1;
        }
      }
    }
    return count;
  };

  return upper.every((w) => {
    const cnt = countWord(w);
    return cnt > 0 && (!unique || cnt === 1);
  });
}
