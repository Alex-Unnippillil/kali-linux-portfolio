import { cellsForShip, getRing, validatePlacement, Placement } from './rules';
import { createRng, RNG } from './rng';

export const BOARD_SIZE = 10;
export const SHIPS = [5, 4, 3, 3, 2];

export type Layout = Placement;

const rand = (n: number, rng: RNG) => Math.floor(rng() * n);

const shuffle = <T>(arr: T[], rng: RNG): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(i + 1, rng);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Try to place all ships randomly respecting hits/misses.
// If noAdjacency is true, ships may not touch (even diagonally).
function randomLayout(
  hits: Set<number>,
  misses: Set<number>,
  noAdjacency = false,
  rng: RNG = createRng(),
): Layout[] | null {
  const grid = Array(BOARD_SIZE * BOARD_SIZE).fill(0);
  const hitSet = new Set<number>();
  misses.forEach((m) => {
    if (m >= 0 && m < grid.length) grid[m] = -1;
  });
  hits.forEach((h) => {
    if (h >= 0 && h < grid.length) {
      grid[h] = 2;
      hitSet.add(h);
    }
  });

  const layout: Layout[] = [];

  const canPlace = (x: number, y: number, dir: 0 | 1, len: number) => {
    const cells = cellsForShip(x, y, dir, len, BOARD_SIZE);
    if (!cells) return null;
    for (const idx of cells) {
      if (grid[idx] === -1 || grid[idx] === 1) return null;
    }
    if (noAdjacency) {
      const ring = getRing(cells, BOARD_SIZE);
      for (const idx of ring) {
        if (grid[idx] === 1 || grid[idx] === 2) return null;
      }
    }
    return cells;
  };

  const shipLens = shuffle(SHIPS.slice(), rng);

  const placeShip = (i: number): boolean => {
    if (i >= shipLens.length) return true;
    const len = shipLens[i];
    const options: Layout[] = [];
    for (let dir: 0 | 1 = 0; dir < 2; dir++) {
      const dir01 = dir as 0 | 1;
      const maxX = dir === 0 ? BOARD_SIZE - len : BOARD_SIZE - 1;
      const maxY = dir === 1 ? BOARD_SIZE - len : BOARD_SIZE - 1;
      for (let x = 0; x <= maxX; x++) {
        for (let y = 0; y <= maxY; y++) {
          const cells = canPlace(x, y, dir01, len);
          if (cells) options.push({ x, y, dir: dir01, len, cells });
        }
      }
    }
    shuffle(options, rng);
    for (const opt of options) {
      opt.cells.forEach((c) => (grid[c] = 1));
      layout.push(opt);
      if (placeShip(i + 1)) return true;
      layout.pop();
      opt.cells.forEach((c) => (grid[c] = hitSet.has(c) ? 2 : 0));
    }
    return false;
  };

  if (!placeShip(0)) return null;

  const allCells = new Set<number>();
  layout.forEach((sh) => sh.cells.forEach((c) => allCells.add(c)));
  for (const h of hits) {
    if (!allCells.has(h)) return null;
  }

  return layout;
}

const fallbackLayout = (noAdjacency: boolean): Layout[] => {
  const base: Layout[] = [
    { x: 0, y: 0, dir: 0, len: 5, cells: [] },
    { x: 2, y: 2, dir: 0, len: 4, cells: [] },
    { x: 1, y: 4, dir: 0, len: 3, cells: [] },
    { x: 5, y: 6, dir: 1, len: 3, cells: [] },
    { x: 7, y: 1, dir: 1, len: 2, cells: [] },
  ];

  const withCells = base
    .map((ship) => ({ ...ship, cells: cellsForShip(ship.x, ship.y, ship.dir, ship.len, BOARD_SIZE) || [] }))
    .filter((ship): ship is Layout => Boolean(ship.cells.length));

  const validation = validatePlacement(withCells, { size: BOARD_SIZE, noTouch: noAdjacency });
  if (validation.ok) return withCells;
  throw new Error('Failed to generate fallback layout');
};

export function randomizePlacement(
  noAdjacency = false,
  options: { seed?: number; maxAttempts?: number } = {},
): Layout[] {
  const rng = createRng(options.seed);
  const maxAttempts = options.maxAttempts ?? 50;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const layout = randomLayout(new Set(), new Set(), noAdjacency, rng);
    if (layout) return layout;
  }
  return fallbackLayout(noAdjacency);
}

export class MonteCarloAI {
  hits: Set<number>;
  misses: Set<number>;
  noAdjacency: boolean;
  lastScores: number[];
  rng: RNG;

  constructor({ noAdjacency = false, rng }: { noAdjacency?: boolean; rng?: RNG } = {}) {
    this.hits = new Set();
    this.misses = new Set();
    this.noAdjacency = noAdjacency;
    this.lastScores = new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
    this.rng = rng ?? createRng();
  }

  record(idx: number, hit: boolean) {
    (hit ? this.hits : this.misses).add(idx);
  }

  markBlocked(indices: number[]) {
    indices.forEach((idx) => this.misses.add(idx));
  }

  /** Returns the heat map from the last call to nextMove */
  getHeatmap() {
    return this.lastScores;
  }

  nextMove(simulations = 200): number | null {
    const scores = new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
    for (let s = 0; s < simulations; s++) {
      const layout = randomLayout(this.hits, this.misses, this.noAdjacency, this.rng);
      if (!layout) continue;
      const occ = new Set<number>();
      layout.forEach((sh) => sh.cells.forEach((c) => occ.add(c)));
      for (let i = 0; i < scores.length; i++) {
        if (this.hits.has(i) || this.misses.has(i)) continue;
        if (occ.has(i)) scores[i]++;
      }
    }
    this.lastScores = scores;
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < scores.length; i++) {
      if (this.hits.has(i) || this.misses.has(i)) continue;
      if (scores[i] > bestScore) {
        bestScore = scores[i];
        best = i;
      }
    }
    return best >= 0 ? best : null;
  }
}

export class RandomSalvoAI {
  available: Set<number>;
  queue: number[];
  rng: RNG;

  constructor({ rng }: { rng?: RNG } = {}) {
    this.available = new Set(
      Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i),
    );
    this.queue = [];
    this.rng = rng ?? createRng();
  }

  record(idx: number, hit: boolean) {
    this.available.delete(idx);
    if (hit) {
      const x = idx % BOARD_SIZE;
      const y = Math.floor(idx / BOARD_SIZE);
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      neighbors.forEach(([nx, ny]) => {
        if (nx >= 0 && ny >= 0 && nx < BOARD_SIZE && ny < BOARD_SIZE) {
          const nIdx = ny * BOARD_SIZE + nx;
          if (this.available.has(nIdx) && !this.queue.includes(nIdx)) {
            this.queue.push(nIdx);
          }
        }
      });
    }
  }

  markBlocked(indices: number[]) {
    indices.forEach((idx) => {
      this.available.delete(idx);
      this.queue = this.queue.filter((q) => q !== idx);
    });
  }

  nextMove(): number | null {
    if (this.queue.length) {
      return this.queue.shift()!;
    }
    const choices = Array.from(this.available);
    if (!choices.length) return null;
    const choice = choices[rand(choices.length, this.rng)];
    this.available.delete(choice);
    return choice;
  }
}

export class RandomAI {
  available: Set<number>;
  rng: RNG;

  constructor({ rng }: { rng?: RNG } = {}) {
    this.available = new Set(
      Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i),
    );
    this.rng = rng ?? createRng();
  }

  record(idx: number) {
    this.available.delete(idx);
  }

  markBlocked(indices: number[]) {
    indices.forEach((idx) => this.available.delete(idx));
  }

  nextMove(): number | null {
    const choices = Array.from(this.available);
    if (!choices.length) return null;
    const choice = choices[rand(choices.length, this.rng)];
    this.available.delete(choice);
    return choice;
  }
}

const battleshipAI = {
  BOARD_SIZE,
  SHIPS,
  MonteCarloAI,
  RandomSalvoAI,
  RandomAI,
  randomizePlacement,
};

export default battleshipAI;
