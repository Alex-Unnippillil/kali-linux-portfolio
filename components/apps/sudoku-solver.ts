const SIZE = 9;
const BOX = 3;
const DIGITS = [1,2,3,4,5,6,7,8,9];

const range = (n:number)=>Array.from({length:n},(_,i)=>i);

const units: number[][][] = Array(81).fill(0).map(()=>[]);
const peers: number[][] = Array(81).fill(0).map(()=>[]);

// Build units and peers
for(let r=0;r<SIZE;r++){
  const row = range(SIZE).map(c=>r*SIZE+c);
  for(const cell of row){
    units[cell].push(row);
  }
}
for(let c=0;c<SIZE;c++){
  const col = range(SIZE).map(r=>r*SIZE+c);
  for(const cell of col){
    units[cell].push(col);
  }
}
for(let br=0;br<BOX;br++){
  for(let bc=0;bc<BOX;bc++){
    const box:number[]=[];
    for(let r=0;r<BOX;r++){
      for(let c=0;c<BOX;c++){
        const cell=(br*BOX+r)*SIZE+(bc*BOX+c);
        box.push(cell);
      }
    }
    for(const cell of box){
      units[cell].push(box);
    }
  }
}
for(let i=0;i<81;i++){
  const set = new Set<number>();
  for(const unit of units[i]){
    for(const cell of unit){ if(cell!==i) set.add(cell); }
  }
  peers[i]=Array.from(set);
}

function clone(values: number[][]){
  return values.map(v=>v.slice());
}

function parseBoard(board: number[][]){
  const values: number[][] = Array(81).fill(0).map(()=>DIGITS.slice());
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      const n = board[r][c];
      if(n>=1 && n<=9){
        if(!assign(values, r*SIZE+c, n)) return null;
      }
    }
  }
  return values;
}

function assign(values:number[][], idx:number, val:number){
  const other = values[idx].filter(v=>v!==val);
  for(const v of other){ if(!eliminate(values, idx, v)) return false; }
  return true;
}

function eliminate(values:number[][], idx:number, val:number){
  const cellVals = values[idx];
  if(!cellVals.includes(val)) return true;
  values[idx] = cellVals.filter(v=>v!==val);
  if(values[idx].length===0) return false;
  if(values[idx].length===1){
    const v2 = values[idx][0];
    for(const peer of peers[idx]){
      if(!eliminate(values, peer, v2)) return false;
    }
  }
  for(const unit of units[idx]){
    const places = unit.filter(i=>values[i].includes(val));
    if(places.length===0) return false;
    if(places.length===1){
      if(!assign(values, places[0], val)) return false;
    }
  }
  return true;
}

function search(values:number[][], stats:{guesses:number}) : number[][] | null {
  // check complete
  let done = true;
  for(const v of values){ if(v.length!==1){ done=false; break; } }
  if(done) return values;
  // choose cell with fewest candidates >1
  let minLen=10, idx=-1;
  for(let i=0;i<81;i++){
    const len = values[i].length;
    if(len>1 && len<minLen){ minLen=len; idx=i; }
  }
  const cand = values[idx];
  for(const v of cand){
    const copy = clone(values);
    stats.guesses++;
    if(assign(copy, idx, v)){
      const res = search(copy, stats);
      if(res) return res;
    }
  }
  return null;
}

function valuesToBoard(values:number[][]){
  const board:number[][] = Array(SIZE).fill(0).map(()=>Array(SIZE).fill(0));
  for(let i=0;i<81;i++){
    const r=Math.floor(i/SIZE); const c=i%SIZE;
    board[r][c]=values[i][0];
  }
  return board;
}

export function solveBoard(board:number[][]){
  const values = parseBoard(board);
  if(!values) return { solution: null, stats: { guesses: 0 } };
  const stats = { guesses: 0 };
  const res = search(values, stats);
  if(!res) return { solution: null, stats };
  return { solution: valuesToBoard(res), stats };
}

export function getCandidates(board:number[][]){
  const values = parseBoard(board);
  if(!values) return null;
  const out:number[][][] = Array(SIZE).fill(0).map(()=>Array(SIZE).fill(0).map(()=>[]));
  for(let i=0;i<81;i++){
    const r=Math.floor(i/SIZE); const c=i%SIZE;
    out[r][c]=values[i].slice();
  }
  return out;
}

export function getHint(board:number[][]){
  const values = parseBoard(board);
  if(!values) return null;
  for(let i=0;i<81;i++){
    const r=Math.floor(i/SIZE); const c=i%SIZE;
    if(board[r][c]===0 && values[i].length===1){
      return { r, c, val: values[i][0], reason: 'single candidate' };
    }
  }
  const stats = { guesses: 0 };
  const solved = search(clone(values), stats);
  if(!solved) return null;
  for(let i=0;i<81;i++){
    const r=Math.floor(i/SIZE); const c=i%SIZE;
    if(board[r][c]===0){
      return { r, c, val: solved[i][0], reason: stats.guesses ? 'search' : 'deduction' };
    }
  }
  return null;
}

import { solveRandom, countSolutions } from './sudoku-dlx';

const rng = (seed:number)=>{ let t = seed>>>0; return ()=>{ t += 0x6D2B79F5; let r=Math.imul(t^(t>>>15),1|t); r^=r+Math.imul(r^(r>>>7),61|r); return ((r^(r>>>14))>>>0)/4294967296; }; };

const shuffle = <T>(arr:T[], rand:()=>number)=>{ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rand()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };

export function generatePuzzle(difficulty='easy', seed=Date.now()){
  const random = rng(seed);
  const empty = Array(SIZE).fill(0).map(()=>Array(SIZE).fill(0));
  const solution = solveRandom(empty, random);
  const puzzle = solution.map(r=>r.slice());
  const holesByDiff:Record<string,number>={easy:35,medium:45,hard:55};
  let holes = holesByDiff[difficulty] ?? holesByDiff.easy;
  const positions = shuffle(range(SIZE*SIZE), random);
  for(const pos of positions){
    if(holes===0) break;
    const r=Math.floor(pos/SIZE); const c=pos%SIZE;
    const backup=puzzle[r][c];
    puzzle[r][c]=0;
    const copy = puzzle.map(row=>row.slice());
    if(countSolutions(copy)!==1){
      puzzle[r][c]=backup;
    } else {
      holes--;
    }
  }
  const rating = ratePuzzle(puzzle);
  return { puzzle, solution, rating };
}

export function ratePuzzle(puzzle:number[][]){
  const { stats } = solveBoard(puzzle);
  const g = stats.guesses;
  if(g===0) return 'easy';
  if(g<=5) return 'medium';
  return 'hard';
}
