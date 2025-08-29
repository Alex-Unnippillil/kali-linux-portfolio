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

export default {
  lineToClues,
  generateLinePatterns,
  getPossibleLineSolutions,
  evaluateLine,
  checkContradictions,
  toggleCross,
};
