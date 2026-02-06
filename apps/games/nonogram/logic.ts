export type Cell = -1 | 0 | 1; // -1 empty (cross), 0 unknown, 1 filled
export type PatternCell = 0 | 1; // 0 empty, 1 filled
export type Grid = Cell[][];
export type Clue = number[];

export interface AnalyzeResult {
  contradiction: boolean;
  solved: boolean;
  forced: (Cell | null)[];
  canBeFilled: boolean[];
  canBeEmpty: boolean[];
}

export interface PropagationResult {
  grid: Grid;
  rowContradiction: boolean[];
  colContradiction: boolean[];
  rowSolved: boolean[];
  colSolved: boolean[];
  rowCanBeFilled: boolean[][];
  rowCanBeEmpty: boolean[][];
  colCanBeFilled: boolean[][];
  colCanBeEmpty: boolean[][];
}

export const cloneGrid = (grid: Grid): Grid => grid.map((row) => row.slice());

// Convert a line of cells into Nonogram clues
export const lineToClues = (line: Array<Cell | PatternCell>): number[] => {
  const clues: number[] = [];
  let count = 0;
  line.forEach((cell) => {
    if (cell === 1) count += 1;
    else if (count) {
      clues.push(count);
      count = 0;
    }
  });
  if (count) clues.push(count);
  return clues.length ? clues : [];
};

// Generate all patterns for a clue in a line of given length
export const generateLinePatterns = (
  clue: Clue,
  length: number,
): PatternCell[][] => {
  if (clue.length === 0) return [Array(length).fill(0)];
  const [first, ...rest] = clue;
  const patterns: PatternCell[][] = [];
  for (let offset = 0; offset <= length - first; offset++) {
    const head: PatternCell[] = Array(offset).fill(0).concat(Array(first).fill(1));
    if (rest.length) {
      const tails = generateLinePatterns(rest, length - offset - first - 1);
      tails.forEach((t) => patterns.push(head.concat([0], t)));
    } else if (head.length < length) {
      patterns.push(head.concat(Array(length - head.length).fill(0)));
    } else patterns.push(head);
  }
  return patterns;
};

export const patternMatchesLine = (pattern: PatternCell[], line: Cell[]): boolean =>
  line.every((cell, i) =>
    cell === 1 ? pattern[i] === 1 : cell === -1 ? pattern[i] === 0 : true,
  );

// Filter patterns based on current line state
export const getPossibleLineSolutions = (clue: Clue, line: Cell[]): PatternCell[][] => {
  const patterns = generateLinePatterns(clue, line.length);
  return patterns.filter((p) => patternMatchesLine(p, line));
};

// Analyze a line to find contradictions and forced moves
export const analyzeLine = (clue: Clue, line: Cell[]): AnalyzeResult => {
  const patterns = generateLinePatterns(clue, line.length);
  const matches = patterns.filter((p) => patternMatchesLine(p, line));

  if (!matches.length) {
    return {
      contradiction: true,
      solved: false,
      forced: Array(line.length).fill(null),
      canBeFilled: Array(line.length).fill(false),
      canBeEmpty: Array(line.length).fill(false),
    };
  }

  const forced: (Cell | null)[] = Array(line.length).fill(null);
  const canBeFilled = Array(line.length).fill(false);
  const canBeEmpty = Array(line.length).fill(false);

  for (let i = 0; i < line.length; i++) {
    for (const p of matches) {
      if (p[i] === 1) canBeFilled[i] = true;
      else canBeEmpty[i] = true;
    }
    if (line[i] === 0) {
      if (canBeFilled[i] && !canBeEmpty[i]) forced[i] = 1;
      if (!canBeFilled[i] && canBeEmpty[i]) forced[i] = -1;
    }
  }

  const solved =
    line.every((c) => c !== 0) &&
    JSON.stringify(lineToClues(line)) === JSON.stringify(clue);

  return { contradiction: false, solved, forced, canBeFilled, canBeEmpty };
};

// Locate a hint by finding a forced cell
export const findForcedCellsInLine = (
  clue: Clue,
  line: Cell[],
): { index: number; value: Cell }[] => {
  const result = analyzeLine(clue, line);
  const forced: { index: number; value: Cell }[] = [];
  result.forced.forEach((value, index) => {
    if (value !== null) forced.push({ index, value });
  });
  return forced;
};

// Evaluate whether a line is solved or contradictory
export const evaluateLine = (line: Cell[], clue: Clue) => {
  const analyzed = analyzeLine(clue, line);
  return { solved: analyzed.solved, contradiction: analyzed.contradiction };
};

// Check contradictions across all rows and columns
export const checkContradictions = (
  grid: Grid,
  rows: Clue[],
  cols: Clue[],
): { rows: boolean[]; cols: boolean[] } => {
  const rowContradictions = rows.map((clue, i) => analyzeLine(clue, grid[i]).contradiction);
  const colContradictions = cols.map((clue, j) => {
    const column = grid.map((row) => row[j]);
    return analyzeLine(clue, column).contradiction;
  });
  return { rows: rowContradictions, cols: colContradictions };
};

// Propagate constraints across rows and columns until stable
export const propagate = (grid: Grid, rows: Clue[], cols: Clue[]): PropagationResult => {
  const g = cloneGrid(grid);
  const rq = new Set<number>();
  const cq = new Set<number>();
  const height = rows.length;
  const width = cols.length;

  const rowContradiction = Array(height).fill(false);
  const colContradiction = Array(width).fill(false);
  const rowSolved = Array(height).fill(false);
  const colSolved = Array(width).fill(false);
  const rowCanBeFilled: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));
  const rowCanBeEmpty: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));
  const colCanBeFilled: boolean[][] = Array(width)
    .fill(null)
    .map(() => Array(height).fill(false));
  const colCanBeEmpty: boolean[][] = Array(width)
    .fill(null)
    .map(() => Array(height).fill(false));

  for (let i = 0; i < height; i++) rq.add(i);
  for (let j = 0; j < width; j++) cq.add(j);

  while (rq.size || cq.size) {
    if (rq.size) {
      const [i] = rq;
      rq.delete(i);
      const res = analyzeLine(rows[i], g[i]);
      rowContradiction[i] = res.contradiction;
      rowSolved[i] = res.solved;
      rowCanBeFilled[i] = res.canBeFilled.slice();
      rowCanBeEmpty[i] = res.canBeEmpty.slice();
      res.forced.forEach((val, j) => {
        if (val !== null && g[i][j] === 0) {
          g[i][j] = val;
          cq.add(j);
        }
      });
    } else if (cq.size) {
      const [j] = cq;
      cq.delete(j);
      const col = g.map((row) => row[j]);
      const res = analyzeLine(cols[j], col);
      colContradiction[j] = res.contradiction;
      colSolved[j] = res.solved;
      colCanBeFilled[j] = res.canBeFilled.slice();
      colCanBeEmpty[j] = res.canBeEmpty.slice();
      res.forced.forEach((val, i) => {
        if (val !== null && g[i][j] === 0) {
          g[i][j] = val;
          rq.add(i);
        }
      });
    }
  }

  return {
    grid: g,
    rowContradiction,
    colContradiction,
    rowSolved,
    colSolved,
    rowCanBeFilled,
    rowCanBeEmpty,
    colCanBeFilled,
    colCanBeEmpty,
  };
};

// Toggle a cross mark on the grid
export const toggleCross = (grid: Grid, r: number, c: number): Grid => {
  const g = cloneGrid(grid);
  g[r][c] = g[r][c] === -1 ? 0 : -1;
  return g;
};

// Autofill any rows or columns by applying constraint propagation
export const autoFill = (grid: Grid, rows: Clue[], cols: Clue[]): Grid => {
  const { grid: filled } = propagate(grid, rows, cols);
  return filled;
};

// Determine if puzzle solved: no unknowns, all lines match clues
export const isSolved = (grid: Grid, rows: Clue[], cols: Clue[]): boolean => {
  if (grid.some((row) => row.some((c) => c === 0))) return false;
  const rowsOk = rows.every((clue, i) => {
    const res = analyzeLine(clue, grid[i]);
    return !res.contradiction && res.solved;
  });
  const colsOk = cols.every((clue, j) => {
    const col = grid.map((row) => row[j]);
    const res = analyzeLine(clue, col);
    return !res.contradiction && res.solved;
  });
  return rowsOk && colsOk;
};

// Generate clues for a rectangular solution grid
export const gridToClues = (grid: PatternCell[][]): { rows: Clue[]; cols: Clue[] } => {
  const rows = grid.map((line) => lineToClues(line));
  const width = grid[0]?.length || 0;
  const cols: Clue[] = [];
  for (let c = 0; c < width; c++) {
    const col = grid.map((row) => row[c]);
    cols.push(lineToClues(col));
  }
  return { rows, cols };
};

const logicApi = {
  autoFill,
  analyzeLine,
  checkContradictions,
  cloneGrid,
  evaluateLine,
  findForcedCellsInLine,
  generateLinePatterns,
  getPossibleLineSolutions,
  gridToClues,
  isSolved,
  lineToClues,
  patternMatchesLine,
  propagate,
  toggleCross,
};

export default logicApi;
