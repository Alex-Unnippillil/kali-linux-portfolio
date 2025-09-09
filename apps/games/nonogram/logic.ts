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
  const first = clue[0];
  const rest = clue.slice(1);
  if (first === undefined) return [];
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
  const base = solutions[0];
  if (!base) return [];
  const forced: { index: number; value: Cell }[] = [];
  for (let i = 0; i < line.length; i++) {
    const val = base[i];
    if (
      val !== undefined &&
      solutions.every((s) => s[i] === val) &&
      line[i] === 0
    ) {
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
    const clue = rows[i];
    const row = grid[i];
    if (!clue || !row) continue;
    const forced = findForcedCellsInLine(clue, row).filter((f) => f.value === 1);
    const firstForced = forced[0];
    if (firstForced) return { i, j: firstForced.index, value: 1 };
  }
  for (let j = 0; j < cols.length; j++) {
    const clue = cols[j];
    if (!clue) continue;
    const col: Cell[] = grid
      .map((row) => row[j])
      .filter((v): v is Cell => v !== undefined);
    if (col.length !== grid.length) continue;
    const forced = findForcedCellsInLine(clue, col).filter((f) => f.value === 1);
    const firstForced = forced[0];
    if (firstForced) return { i: firstForced.index, j, value: 1 };
  }
  return null;
};

// Evaluate whether a line is solved or contradictory
export const evaluateLine = (line: Cell[], clue: Clue) => {
  const solved = JSON.stringify(lineToClues(line)) === JSON.stringify(clue);
  const contradiction = getPossibleLineSolutions(clue, line).length === 0;
  return { solved, contradiction };
};

// Check contradictions across all rows and columns
export const checkContradictions = (
  grid: Grid,
  rows: Clue[],
  cols: Clue[]
): { rows: boolean[]; cols: boolean[] } => {
  const rowContradictions = rows.map((clue, i) => {
    const row = grid[i];
    if (!row) return false;
    return evaluateLine(row, clue).contradiction;
  });
  const colContradictions = cols.map((clue, j) => {
    const column: Cell[] = grid
      .map((row) => row[j])
      .filter((v): v is Cell => v !== undefined);
    if (column.length !== grid.length) return false;
    return evaluateLine(column, clue).contradiction;
  });
  return { rows: rowContradictions, cols: colContradictions };
};

// Toggle a cross mark on the grid
export const toggleCross = (grid: Grid, r: number, c: number): Grid => {
  const g = grid.map((row) => row.slice());
  if (!g[r] || g[r][c] === undefined) return g;
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
      if (!line) return;
      const solutions = getPossibleLineSolutions(clue, line);
      if (solutions.length === 1) {
        const sol = solutions[0];
        if (sol)
          sol.forEach((val, j) => {
            const newVal = (val ? 1 : -1) as Cell;
            if (line[j] !== newVal) {
              line[j] = newVal;
              changed = true;
            }
          });
      }
    });
    cols.forEach((clue, j) => {
      const col: Cell[] = g
        .map((row) => row[j])
        .filter((v): v is Cell => v !== undefined);
      if (col.length !== g.length) return;
      const solutions = getPossibleLineSolutions(clue, col);
      if (solutions.length === 1) {
        const sol = solutions[0];
        if (sol)
          sol.forEach((val, i) => {
            const newVal = (val ? 1 : -1) as Cell;
            if (g[i] && g[i][j] !== newVal) {
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
  checkContradictions,
  toggleCross,
  autoFill,
};

export default logicApi;
