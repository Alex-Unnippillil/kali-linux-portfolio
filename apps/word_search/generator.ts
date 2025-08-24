import type { Position, WordPlacement } from './types';
import Filter from 'bad-words';

// simple seeded RNG using xmur3 and mulberry32
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRNG(seed: string) {
  const seedFunc = xmur3(seed);
  return mulberry32(seedFunc());
}

const DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: 1 },
  { dx: -1, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },
];

const filter = new Filter();

export interface GenerateResult {
  grid: string[][];
  placements: WordPlacement[];
}

// English letter frequency weights
const LETTER_WEIGHTS: Record<string, number> = {
  A: 8.17,
  B: 1.49,
  C: 2.78,
  D: 4.25,
  E: 12.7,
  F: 2.23,
  G: 2.02,
  H: 6.09,
  I: 6.97,
  J: 0.15,
  K: 0.77,
  L: 4.03,
  M: 2.41,
  N: 6.75,
  O: 7.51,
  P: 1.93,
  Q: 0.1,
  R: 5.99,
  S: 6.33,
  T: 9.06,
  U: 2.76,
  V: 0.98,
  W: 2.36,
  X: 0.15,
  Y: 1.97,
  Z: 0.07,
};

const LETTERS = Object.keys(LETTER_WEIGHTS);
const CUM_WEIGHTS: number[] = [];
const TOTAL = LETTERS.reduce((sum, l) => {
  const w = LETTER_WEIGHTS[l];
  CUM_WEIGHTS.push(sum + w);
  return sum + w;
}, 0);

function randomLetter(rng: () => number) {
  const r = rng() * TOTAL;
  for (let i = 0; i < LETTERS.length; i += 1) {
    if (r < CUM_WEIGHTS[i]) return LETTERS[i];
  }
  return 'Z';
}

function hasObscene(grid: string[][]) {
  const size = grid.length;
  const lines: string[] = [];
  // rows and columns
  for (let r = 0; r < size; r += 1) {
    lines.push(grid[r].join(''));
    let col = '';
    for (let c = 0; c < size; c += 1) col += grid[c][r];
    lines.push(col);
  }
  // diagonals
  for (let r = 0; r < size; r += 1) {
    let d1 = '';
    let d2 = '';
    for (let c = 0; c < size; c += 1) {
      if (r + c < size) d1 += grid[r + c][c];
      if (r + c < size) d2 += grid[size - 1 - (r + c)][c];
    }
    if (d1.length > 1) lines.push(d1);
    if (d2.length > 1) lines.push(d2);
  }
  return lines.some((l) => {
    const lower = l.toLowerCase();
    return filter.isProfane(lower) || filter.isProfane(lower.split('').reverse().join(''));
  });
}

export function generateGrid(
  words: string[],
  size = 12,
  seed = 'seed'
): GenerateResult {
  const rng = createRNG(seed);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const placements: WordPlacement[] = [];

  const sortedWords = [...words].map((w) => w.toUpperCase()).sort((a, b) => b.length - a.length);

  function validPlacements(word: string) {
    const options: { positions: Position[]; overlap: number }[] = [];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        for (const dir of DIRECTIONS) {
          const endRow = r + dir.dy * (word.length - 1);
          const endCol = c + dir.dx * (word.length - 1);
          if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
          let overlap = 0;
          let ok = true;
          const positions: Position[] = [];
          for (let i = 0; i < word.length; i += 1) {
            const rr = r + dir.dy * i;
            const cc = c + dir.dx * i;
            const existing = grid[rr][cc];
            if (existing && existing !== word[i]) {
              ok = false;
              break;
            }
            if (existing === word[i]) overlap += 1;
            positions.push({ row: rr, col: cc });
          }
          if (ok) options.push({ positions, overlap });
        }
      }
    }
    // sort by overlap descending and randomize same overlaps
    options.sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      return rng() - 0.5;
    });
    return options;
  }

  function place(index: number): boolean {
    if (index === sortedWords.length) return true;
    const word = sortedWords[index];
    const options = validPlacements(word);
    for (const opt of options) {
      // place
      opt.positions.forEach((p, i) => {
        grid[p.row][p.col] = word[i];
      });
      placements.push({ word, positions: opt.positions });
      if (place(index + 1)) return true;
      // backtrack
      placements.pop();
      opt.positions.forEach((p) => {
        // clear only if it doesn't belong to previous placements
        let keep = false;
        for (const pl of placements) {
          if (pl.positions.some((pp) => pp.row === p.row && pp.col === p.col)) {
            keep = true;
            break;
          }
        }
        if (!keep) grid[p.row][p.col] = '';
      });
    }
    return false;
  }

  place(0);

  function fillRandom() {
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (!grid[r][c]) grid[r][c] = randomLetter(rng);
      }
    }
  }

  let attempts = 0;
  do {
    // clear previous filler letters
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (!placements.some((pl) => pl.positions.some((p) => p.row === r && p.col === c))) {
          grid[r][c] = '';
        }
      }
    }
    fillRandom();
    attempts += 1;
  } while (hasObscene(grid) && attempts < 5);

  return { grid, placements };
}
