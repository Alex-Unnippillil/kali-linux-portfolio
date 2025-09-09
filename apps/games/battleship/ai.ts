export const BOARD_SIZE = 10;
export const SHIPS = [5, 4, 3, 3, 2];

type Layout = { x: number; y: number; dir: 0 | 1; len: number; cells: number[] };

// Utility to pick random integer [0,n)
const rand = (n: number) => Math.floor(Math.random() * n);

// Fisher-Yates shuffle
  const shuffle = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    return arr;
  };

// Try to place all ships randomly respecting hits/misses.
// If noAdjacency is true, ships may not touch (even diagonally).
function randomLayout(
  hits: Set<number>,
  misses: Set<number>,
  noAdjacency = false,
): Layout[] | null {
  const grid = Array(BOARD_SIZE * BOARD_SIZE).fill(0);
  const hitSet = new Set(hits);
  misses.forEach((m) => (grid[m] = -1));
  hits.forEach((h) => (grid[h] = 2));

  const layout: Layout[] = [];

  const canPlace = (x: number, y: number, dir: 0 | 1, len: number) => {
    const cells: number[] = [];
    for (let i = 0; i < len; i++) {
      const cx = x + (dir === 0 ? i : 0);
      const cy = y + (dir === 1 ? i : 0);
      if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) return null;
      const idx = cy * BOARD_SIZE + cx;
      if (grid[idx] === -1 || grid[idx] === 1) return null;
      cells.push(idx);
    }
    if (noAdjacency) {
      for (const idx of cells) {
        const cx = idx % BOARD_SIZE;
        const cy = Math.floor(idx / BOARD_SIZE);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) continue;
            const nIdx = ny * BOARD_SIZE + nx;
            if (cells.includes(nIdx)) continue;
            if (grid[nIdx] === 1 || grid[nIdx] === 2) return null;
          }
        }
      }
    }
    return cells;
  };

  const shipLens = SHIPS.slice();
  shuffle(shipLens);

  const placeShip = (i: number): boolean => {
    if (i >= shipLens.length) return true;
      const len = shipLens[i]!;
    const options: Layout[] = [];
    for (let dir: 0 | 1 = 0; dir < 2; dir++) {
      const dir01 = dir as 0 | 1;
      const maxX = dir === 0 ? BOARD_SIZE - len : BOARD_SIZE - 1;
      const maxY = dir === 1 ? BOARD_SIZE - len : BOARD_SIZE - 1;
      for (let x = 0; x <= maxX; x++) {
        for (let y = 0; y <= maxY; y++) {
            const cells = canPlace(x, y, dir01, len);
            if (cells) options.push({ x, y, dir: dir01, len: len!, cells });
        }
      }
    }
    shuffle(options);
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

export class MonteCarloAI {
  hits: Set<number>;
  misses: Set<number>;
  noAdjacency: boolean;
  lastScores: number[];

  constructor(noAdjacency = false) {
    this.hits = new Set();
    this.misses = new Set();
    this.noAdjacency = noAdjacency;
    this.lastScores = new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
  }

  record(idx: number, hit: boolean) {
    (hit ? this.hits : this.misses).add(idx);
  }

  /** Returns the heat map from the last call to nextMove */
  getHeatmap() {
    return this.lastScores;
  }

  nextMove(simulations = 200): number | null {
    const scores = new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
    for (let s = 0; s < simulations; s++) {
      const layout = randomLayout(this.hits, this.misses, this.noAdjacency);
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

export function randomizePlacement(noAdjacency = false): Layout[] {
  // keep trying until a layout is generated
  while (true) {
    const layout = randomLayout(new Set(), new Set(), noAdjacency);
    if (layout) return layout;
  }
}

export class RandomSalvoAI {
  available: Set<number>;
  queue: number[];

  constructor() {
    this.available = new Set(
      Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i),
    );
    this.queue = [];
  }

  record(idx: number, hit: boolean) {
    this.available.delete(idx);
    if (hit) {
      const x = idx % BOARD_SIZE;
      const y = Math.floor(idx / BOARD_SIZE);
        const neighbors: Array<[number, number]> = [
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

  nextMove(): number | null {
    if (this.queue.length) {
      return this.queue.shift()!;
    }
    const choices = Array.from(this.available);
    if (!choices.length) return null;
    const idx = Math.floor(Math.random() * choices.length);
    const choice = choices[idx]!;
    this.available.delete(choice);
    return choice;
  }
}

export class RandomAI {
  available: Set<number>;

  constructor() {
    this.available = new Set(
      Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i),
    );
  }

  record(idx: number) {
    this.available.delete(idx);
  }

  nextMove(): number | null {
    const choices = Array.from(this.available);
    if (!choices.length) return null;
    const idx = Math.floor(Math.random() * choices.length);
    const choice = choices[idx]!;
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
