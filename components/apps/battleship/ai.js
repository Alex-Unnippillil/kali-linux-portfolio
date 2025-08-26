export const SHIPS = [5, 4, 3, 3, 2];

// Utility to pick random integer [0, n)
const rand = (n) => Math.floor(Math.random() * n);

// Fisher-Yates shuffle
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Try to place all ships randomly respecting hits/misses.
// If noAdjacency is true, ships may not touch (even diagonally).
export function randomLayout(boardSize, hits, misses, noAdjacency = false) {
  const grid = Array(boardSize * boardSize).fill(0);
  const hitSet = new Set(hits);
  // mark misses as blocked, hits as special value 2
  misses.forEach((m) => (grid[m] = -1));
  hits.forEach((h) => (grid[h] = 2));

  const layout = [];

  const canPlace = (x, y, dir, len) => {
    const cells = [];
    for (let i = 0; i < len; i++) {
      const cx = x + (dir === 0 ? i : 0);
      const cy = y + (dir === 1 ? i : 0);
      if (cx < 0 || cy < 0 || cx >= boardSize || cy >= boardSize) return null;
      const idx = cy * boardSize + cx;
      if (grid[idx] === -1 || grid[idx] === 1) return null;
      cells.push(idx);
    }
    if (noAdjacency) {
      for (const idx of cells) {
        const cx = idx % boardSize;
        const cy = Math.floor(idx / boardSize);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= boardSize || ny >= boardSize) continue;
            const nIdx = ny * boardSize + nx;
            if (cells.includes(nIdx)) continue;
            if (grid[nIdx] === 1 || grid[nIdx] === 2) return null;
          }
        }
      }
    }
    return cells;
  };

  const shipLens = SHIPS.slice();
  shuffle(shipLens); // randomize order for fairness

  const placeShip = (i) => {
    if (i >= shipLens.length) return true;
    const len = shipLens[i];
    const options = [];
    for (let dir = 0; dir < 2; dir++) {
      const maxX = dir === 0 ? boardSize - len : boardSize - 1;
      const maxY = dir === 1 ? boardSize - len : boardSize - 1;
      for (let x = 0; x <= maxX; x++) {
        for (let y = 0; y <= maxY; y++) {
          const cells = canPlace(x, y, dir, len);
          if (cells) options.push({ x, y, dir, len, cells });
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

  // ensure all hits are covered by some ship
  const allCells = new Set();
  layout.forEach((sh) => sh.cells.forEach((c) => allCells.add(c)));
  for (const h of hits) {
    if (!allCells.has(h)) return null;
  }

  return layout;
}

// randomize player layout used by UI
export function randomizePlacement(boardSize, noAdjacency = false) {
  while (true) {
    const layout = randomLayout(boardSize, new Set(), new Set(), noAdjacency);
    if (layout) return layout;
  }
}


export class RandomSalvoAI {
  constructor(boardSize) {
    this.boardSize = boardSize;
    this.available = new Set(Array.from({ length: boardSize * boardSize }, (_, i) => i));
    this.queue = [];
  }

  record(idx, hit) {
    this.available.delete(idx);
    if (hit) {
      const x = idx % this.boardSize;
      const y = Math.floor(idx / this.boardSize);
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      neighbors.forEach(([nx, ny]) => {
        if (nx >= 0 && ny >= 0 && nx < this.boardSize && ny < this.boardSize) {
          const nIdx = ny * this.boardSize + nx;
          if (this.available.has(nIdx) && !this.queue.includes(nIdx)) {
            this.queue.push(nIdx);
          }
        }
      });
    }
  }

  nextMove() {
    if (this.queue.length) {
      return this.queue.shift();
    }
    const choices = Array.from(this.available);
    if (!choices.length) return null;
    const choice = choices[Math.floor(Math.random() * choices.length)];
    this.available.delete(choice);
    return choice;
  }
}
