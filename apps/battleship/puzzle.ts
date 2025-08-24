// Yubotu puzzle generator and solver
// Generates a fleet placement puzzle with row/column counts and no-touch constraint

export type Cell = 'unknown' | 'water' | 'ship';

interface Puzzle {
  puzzle: Cell[][];
  solution: Cell[][];
  rowCounts: number[];
  colCounts: number[];
}

const FLEET = [3, 2, 2, 1, 1]; // small fleet for 6x6 board

const dirs = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

// Ensure no adjacent ships including diagonals
const canPlace = (board: Cell[][], r: number, c: number, len: number, vertical: boolean): boolean => {
  const size = board.length;
  for (let k = 0; k < len; k++) {
    const nr = r + (vertical ? k : 0);
    const nc = c + (vertical ? 0 : k);
    if (nr < 0 || nc < 0 || nr >= size || nc >= size) return false;
    if (board[nr][nc] !== 'water' && board[nr][nc] !== 'unknown') return false;
    for (const [dr, dc] of dirs) {
      const ar = nr + dr;
      const ac = nc + dc;
      if (ar >= 0 && ac >= 0 && ar < size && ac < size) {
        if (board[ar][ac] === 'ship') return false;
      }
    }
  }
  return true;
};

const placeShip = (
  board: Cell[][],
  r: number,
  c: number,
  len: number,
  vertical: boolean,
  val: Cell,
) => {
  for (let k = 0; k < len; k++) {
    const nr = r + (vertical ? k : 0);
    const nc = c + (vertical ? 0 : k);
    board[nr][nc] = val;
  }
};

// Generate a full solution by placing ships randomly with backtracking
export const generateSolution = (size = 6): Cell[][] => {
  const board: Cell[][] = Array.from({ length: size }, () => Array(size).fill('water'));
  const ships = FLEET.slice();

  const backtrack = (idx: number): boolean => {
    if (idx === ships.length) return true;
    const len = ships[idx];
    const cells: [number, number, boolean][] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        for (const vertical of [true, false]) {
          if (canPlace(board, r, c, len, vertical)) cells.push([r, c, vertical]);
        }
      }
    }
    while (cells.length) {
      const i = Math.floor(Math.random() * cells.length);
      const [r, c, v] = cells.splice(i, 1)[0];
      placeShip(board, r, c, len, v, 'ship');
      if (backtrack(idx + 1)) return true;
      placeShip(board, r, c, len, v, 'water');
    }
    return false;
  };

  backtrack(0);
  return board;
};

const counts = (board: Cell[][]): { row: number[]; col: number[] } => {
  const size = board.length;
  const row = Array(size).fill(0);
  const col = Array(size).fill(0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 'ship') {
        row[r]++;
        col[c]++;
      }
    }
  }
  return { row, col };
};

// Solver counting number of valid solutions using backtracking with constraints
export const countSolutions = (
  puzzle: Cell[][],
  rowCounts: number[],
  colCounts: number[],
  r = 0,
  c = 0,
): number => {
  const size = puzzle.length;
  if (r === size) return 1;
  const nr = c === size - 1 ? r + 1 : r;
  const nc = c === size - 1 ? 0 : c + 1;
  const cell = puzzle[r][c];
  if (cell !== 'unknown') return countSolutions(puzzle, rowCounts, colCounts, nr, nc);

  let total = 0;
  // try water
  puzzle[r][c] = 'water';
  if (rowCounts[r] >= 0 && colCounts[c] >= 0) {
    total += countSolutions(puzzle, rowCounts, colCounts, nr, nc);
  }
  // try ship if no-touch respected and counts allow
  let ok = true;
  for (const [dr, dc] of dirs) {
    const ar = r + dr;
    const ac = c + dc;
    if (ar >= 0 && ac >= 0 && ar < size && ac < size) {
      if (puzzle[ar][ac] === 'ship') ok = false;
    }
  }
  if (ok && rowCounts[r] > 0 && colCounts[c] > 0) {
    puzzle[r][c] = 'ship';
    rowCounts[r]--;
    colCounts[c]--;
    total += countSolutions(puzzle, rowCounts, colCounts, nr, nc);
    rowCounts[r]++;
    colCounts[c]++;
  }
  puzzle[r][c] = 'unknown';
  return total;
};

export const generatePuzzle = (size = 6): Puzzle => {
  const solution = generateSolution(size);
  const { row, col } = counts(solution);
  const puzzle: Cell[][] = Array.from({ length: size }, () => Array(size).fill('unknown'));

  // Reveal random cells until unique solution
  const reveal = (r: number, c: number) => {
    puzzle[r][c] = solution[r][c];
  };
  const cells = Array.from({ length: size * size }, (_, i) => [Math.floor(i / size), i % size]);
  while (countSolutions(puzzle.map((r) => r.slice()), row.slice(), col.slice()) !== 1 && cells.length) {
    const [r, c] = cells.splice(Math.floor(Math.random() * cells.length), 1)[0];
    reveal(r, c);
  }

  return { puzzle, solution, rowCounts: row, colCounts: col };
};

export default generatePuzzle;
