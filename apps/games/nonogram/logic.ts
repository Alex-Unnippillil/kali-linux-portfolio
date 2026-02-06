export type Cell = -1 | 0 | 1;
export type Grid = Cell[][];
export type Clue = number[];

// Convert a line of cells into Nonogram clues
export const lineToClues = (line: Cell[]): number[] => {
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
export const generateLinePatterns = (clue: Clue, length: number): Cell[][] => {
  if (clue.length === 0) return [Array(length).fill(0)];
  const [first, ...rest] = clue;
  const patterns: Cell[][] = [];
  for (let offset = 0; offset <= length - first; offset++) {
    const head: Cell[] = Array(offset).fill(0).concat(Array(first).fill(1));
    if (rest.length) {
      const tails = generateLinePatterns(rest, length - offset - first - 1);
      tails.forEach((t) => patterns.push(head.concat([0], t)));
    } else if (head.length < length) {
      patterns.push(head.concat(Array(length - head.length).fill(0)));
    } else patterns.push(head);
  }
  return patterns;
};

// Filter patterns based on current line state
export const getPossibleLineSolutions = (clue: Clue, line: Cell[]): Cell[][] => {
  const patterns = generateLinePatterns(clue, line.length);
  return patterns.filter((p) =>
    line.every((cell, i) =>
      cell === 1 ? p[i] === 1 : cell === -1 ? p[i] === 0 : true
    )
  );
};

// Find forced cells in a line based on all possible solutions
export const findForcedCellsInLine = (
  clue: Clue,
  line: Cell[]
): { index: number; value: Cell }[] => {
  const solutions = getPossibleLineSolutions(clue, line);
  if (!solutions.length) return [];
  const forced: { index: number; value: Cell }[] = [];
  for (let i = 0; i < line.length; i++) {
    const val = solutions[0][i];
    if (solutions.every((s) => s[i] === val) && line[i] === 0) {
      forced.push({ index: i, value: (val ? 1 : -1) as Cell });
    }
  }
  return forced;
};

// Locate a hint by finding a forced filled cell
export const findHint = (
  rows: Clue[],
  cols: Clue[],
  grid: Grid
): { i: number; j: number; value: 1 } | null => {
  for (let i = 0; i < rows.length; i++) {
    const forced = findForcedCellsInLine(rows[i], grid[i]).filter(
      (f) => f.value === 1
    );
    if (forced.length) return { i, j: forced[0].index, value: 1 };
  }
  for (let j = 0; j < cols.length; j++) {
    const col = grid.map((row) => row[j]);
    const forced = findForcedCellsInLine(cols[j], col).filter(
      (f) => f.value === 1
    );
    if (forced.length) return { i: forced[0].index, j, value: 1 };
  }
  return null;
};

// Evaluate whether a line is solved or contradictory
export const evaluateLine = (line: Cell[], clue: Clue) => {
  const solved = JSON.stringify(lineToClues(line)) === JSON.stringify(clue);
  const contradiction = getPossibleLineSolutions(clue, line).length === 0;
  return { solved, contradiction };
};

// Confirm that the grid satisfies every row and column clue
export const validateSolution = (grid: Grid, rows: Clue[], cols: Clue[]) => {
  const rowsValid = grid.every(
    (row, i) => JSON.stringify(lineToClues(row)) === JSON.stringify(rows[i])
  );
  const colsValid = cols.every((clue, j) => {
    const column = grid.map((row) => row[j]);
    return JSON.stringify(lineToClues(column)) === JSON.stringify(clue);
  });
  return rowsValid && colsValid;
};

// Check contradictions across all rows and columns
export const checkContradictions = (
  grid: Grid,
  rows: Clue[],
  cols: Clue[]
): { rows: boolean[]; cols: boolean[] } => {
  const rowContradictions = rows.map((clue, i) =>
    evaluateLine(grid[i], clue).contradiction
  );
  const colContradictions = cols.map((clue, j) => {
    const column = grid.map((row) => row[j]);
    return evaluateLine(column, clue).contradiction;
  });
  return { rows: rowContradictions, cols: colContradictions };
};

// Toggle a cross mark on the grid
export const toggleCross = (grid: Grid, r: number, c: number): Grid => {
  const g = grid.map((row) => row.slice());
  g[r][c] = g[r][c] === -1 ? 0 : -1;
  return g;
};

// Autofill any rows or columns that have only one possible solution
export const autoFill = (grid: Grid, rows: Clue[], cols: Clue[]): Grid => {
  const g = grid.map((row) => row.slice());
  let changed = true;
  while (changed) {
    changed = false;
    rows.forEach((clue, i) => {
      const line = g[i];
      const solutions = getPossibleLineSolutions(clue, line);
      if (solutions.length === 1) {
        solutions[0].forEach((val, j) => {
          const newVal = (val ? 1 : -1) as Cell;
          if (g[i][j] !== newVal) {
            g[i][j] = newVal;
            changed = true;
          }
        });
      }
    });
    cols.forEach((clue, j) => {
      const col = g.map((row) => row[j]);
      const solutions = getPossibleLineSolutions(clue, col);
      if (solutions.length === 1) {
        solutions[0].forEach((val, i) => {
          const newVal = (val ? 1 : -1) as Cell;
          if (g[i][j] !== newVal) {
            g[i][j] = newVal;
            changed = true;
          }
        });
      }
    });
  }
  return g;
};

const logicApi = {
  lineToClues,
  generateLinePatterns,
  getPossibleLineSolutions,
  findForcedCellsInLine,
  findHint,
  evaluateLine,
  validateSolution,
  checkContradictions,
  toggleCross,
  autoFill,
};

export default logicApi;
