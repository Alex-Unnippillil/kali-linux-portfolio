export const BOARD_SIZE = 10;
export const SHIPS = [5,4,3,3,2];

// Utility to pick random integer [0, n)
const rand = (n) => Math.floor(Math.random() * n);

// Try to place all ships randomly respecting hits/misses.
// When noTouch is true, ships may not touch even diagonally.
function randomLayout(hits, misses, noTouch=false) {
  const grid = Array(BOARD_SIZE * BOARD_SIZE).fill(0);
  // mark misses as blocked, hits as occupied
  misses.forEach((m) => grid[m] = -1);
  hits.forEach((h) => grid[h] = 1);

  const layout = [];
  for (const len of SHIPS) {
    let placed = false;
    for (let attempts = 0; attempts < 50 && !placed; attempts++) {
      const dir = rand(2); // 0 horiz,1 vert
      const maxX = dir === 0 ? BOARD_SIZE - len : BOARD_SIZE - 1;
      const maxY = dir === 1 ? BOARD_SIZE - len : BOARD_SIZE - 1;
      const x = rand(maxX + 1);
      const y = rand(maxY + 1);
      let ok = true;
      const cells = [];
      for (let i = 0; i < len; i++) {
        const cx = x + (dir === 0 ? i : 0);
        const cy = y + (dir === 1 ? i : 0);
        const idx = cy * BOARD_SIZE + cx;
        if (grid[idx] !== 0 && grid[idx] !== 1) {
          ok = false;
          break;
        }
        if (noTouch) {
          for (let dy = -1; dy <= 1 && ok; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= 0 && ny >= 0 && nx < BOARD_SIZE && ny < BOARD_SIZE) {
                const nidx = ny * BOARD_SIZE + nx;
                if (grid[nidx] === 1) { ok = false; break; }
              }
            }
          }
        }
        cells.push(idx);
      }
      if (ok) {
        cells.forEach((c) => (grid[c] = 1));
        layout.push({ x, y, dir, len, cells });
        placed = true;
      }
    }
    if (!placed) return null; // failed
  }

  // ensure all hits are covered by some ship
  const allCells = new Set();
  layout.forEach((sh) => sh.cells.forEach((c) => allCells.add(c)));
  for (const h of hits) {
    if (!allCells.has(h)) return null;
  }

  return layout;
}

export class MonteCarloAI {
  constructor(noTouch=false) {
    this.hits=new Set();
    this.misses=new Set();
    this.noTouch = noTouch;
  }
  record(idx, hit) {
    (hit?this.hits:this.misses).add(idx);
  }
  nextMove(simulations=200) {
    const scores=new Array(BOARD_SIZE*BOARD_SIZE).fill(0);
    for(let s=0;s<simulations;s++){
      const layout=randomLayout(this.hits,this.misses,this.noTouch);
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
export function randomizePlacement(noTouch=false) {
  while(true){
    const layout=randomLayout(new Set(), new Set(), noTouch);
    if(layout) return layout;
  }
}

