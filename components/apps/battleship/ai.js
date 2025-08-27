export const BOARD_SIZE = 10;
export const SHIPS = [5,4,3,3,2];

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
function randomLayout(hits, misses, noAdjacency = false) {
  const grid = Array(BOARD_SIZE * BOARD_SIZE).fill(0);
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
  shuffle(shipLens); // randomize order for fairness

  const placeShip = (i) => {
    if (i >= shipLens.length) return true;
    const len = shipLens[i];
    const options = [];
    for (let dir = 0; dir < 2; dir++) {
      const maxX = dir === 0 ? BOARD_SIZE - len : BOARD_SIZE - 1;
      const maxY = dir === 1 ? BOARD_SIZE - len : BOARD_SIZE - 1;
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

export class MonteCarloAI {
  constructor(noAdjacency = false) {
    this.hits = new Set();
    this.misses = new Set();
    this.noAdjacency = noAdjacency;
  }
  record(idx, hit) {
    (hit?this.hits:this.misses).add(idx);
  }
  nextMove(simulations=200) {
    const scores=new Array(BOARD_SIZE*BOARD_SIZE).fill(0);
    for(let s=0;s<simulations;s++){
      const layout = randomLayout(this.hits, this.misses, this.noAdjacency);
      if(!layout) continue;
      const occ=new Set();
      layout.forEach(sh=>sh.cells.forEach(c=>occ.add(c)));
      for(let i=0;i<scores.length;i++){
        if(this.hits.has(i)||this.misses.has(i)) continue;
        if(occ.has(i)) scores[i]++;
      }
    }
    let best=-1, bestScore=-1; const avail=[];
    for(let i=0;i<scores.length;i++){
      if(this.hits.has(i)||this.misses.has(i)) continue;
      if(scores[i]>bestScore){bestScore=scores[i];best=i;}
    }
    return best>=0?best:null;
  }
}

// randomize player layout used by UI
export function randomizePlacement(noAdjacency = false) {
  while (true) {
    const layout = randomLayout(new Set(), new Set(), noAdjacency);
    if (layout) return layout;
  }
}

// Generate a layout that minimizes the provided heat map values.
// `heat` is an array of length BOARD_SIZE*BOARD_SIZE representing
// how often the opponent has targeted each cell.  We sample a number
// of random layouts and keep the one occupying the coolest cells.
export function optimalPlacement(heat = [], attempts = 500) {
  let best = null;
  let bestScore = Infinity;
  for (let i = 0; i < attempts; i++) {
    const layout = randomLayout(new Set(), new Set(), true);
    if (!layout) continue;
    const score = layout.reduce(
      (sum, sh) =>
        sum + sh.cells.reduce((s, c) => s + (heat[c] || 0), 0),
      0
    );
    if (score < bestScore) {
      bestScore = score;
      best = layout;
    }
  }
  return best || randomizePlacement(true);
}

// Hunt then target AI using probability heat map
export class HuntTargetAI {
  constructor() {
    this.hits = new Set();
    this.misses = new Set();
    this.queue = [];
  }

  record(idx, hit) {
    if (hit) {
      this.hits.add(idx);
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
          if (!this.hits.has(nIdx) && !this.misses.has(nIdx) && !this.queue.includes(nIdx)) {
            this.queue.push(nIdx);
          }
        }
      });
      // if two hits align, keep only cells in that line
      const hitArr = Array.from(this.hits);
      if (hitArr.length >= 2) {
        for (let i = 0; i < hitArr.length; i++) {
          for (let j = i + 1; j < hitArr.length; j++) {
            const a = hitArr[i];
            const b = hitArr[j];
            if (Math.floor(a / BOARD_SIZE) === Math.floor(b / BOARD_SIZE)) {
              this.queue = this.queue.filter(
                (q) => Math.floor(q / BOARD_SIZE) === Math.floor(a / BOARD_SIZE)
              );
            } else if (a % BOARD_SIZE === b % BOARD_SIZE) {
              this.queue = this.queue.filter((q) => q % BOARD_SIZE === a % BOARD_SIZE);
            }
          }
        }
      }
    } else {
      this.misses.add(idx);
    }
  }

  // Compute probability heat map based on remaining possibilities
  getHeatMap() {
    const scores = new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
    const guessed = new Set([...this.hits, ...this.misses]);
    for (const len of SHIPS) {
      for (let dir = 0; dir < 2; dir++) {
        const maxX = dir === 0 ? BOARD_SIZE - len : BOARD_SIZE - 1;
        const maxY = dir === 1 ? BOARD_SIZE - len : BOARD_SIZE - 1;
        for (let x = 0; x <= maxX; x++) {
          for (let y = 0; y <= maxY; y++) {
            const cells = [];
            let ok = true;
            for (let i = 0; i < len; i++) {
              const cx = x + (dir === 0 ? i : 0);
              const cy = y + (dir === 1 ? i : 0);
              const idx = cy * BOARD_SIZE + cx;
              if (this.misses.has(idx)) {
                ok = false;
                break;
              }
              cells.push(idx);
            }
            if (!ok) continue;
            // must cover all hits if they intersect this line
            for (const h of this.hits) {
              if (!cells.includes(h)) ok = false;
            }
            if (!ok) continue;
            cells.forEach((c) => {
              if (!guessed.has(c)) scores[c]++;
            });
          }
        }
      }
    }
    return scores;
  }

  nextMove() {
    const heat = this.getHeatMap();
    if (this.queue.length) {
      let bestQ = -1;
      let bestScore = -1;
      for (const q of this.queue) {
        if (heat[q] > bestScore) {
          bestScore = heat[q];
          bestQ = q;
        }
      }
      if (bestQ >= 0) {
        this.queue = this.queue.filter((q) => q !== bestQ);
        return bestQ;
      }
    }
    let best = -1;
    let bestScore = -1;
    let avail = [];
    for (let i = 0; i < heat.length; i++) {
      if (this.hits.has(i) || this.misses.has(i)) continue;
      const x = i % BOARD_SIZE;
      const y = Math.floor(i / BOARD_SIZE);
      if (!this.queue.length && (x + y) % 2 === 1) continue;
      avail.push(i);
      if (heat[i] > bestScore) {
        bestScore = heat[i];
        best = i;
      }
    }
    if (best >= 0) return best;
    if (!avail.length) {
      for (let i = 0; i < heat.length; i++) {
        if (this.hits.has(i) || this.misses.has(i)) continue;
        avail.push(i);
      }
    }
    if (avail.length) return avail[Math.floor(Math.random() * avail.length)];
    return null;
  }
}

export class RandomSalvoAI {
  constructor() {
    this.available = new Set(Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i));
    this.queue = [];
  }

  record(idx, hit) {
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
