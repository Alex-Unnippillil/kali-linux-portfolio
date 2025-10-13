export interface Cell {
  /** Final value placed in the cell (0 when empty) */
  value: number;
  /** Candidate numbers penciled into the cell */
  candidates: number[];
}

/** Create a new cell optionally seeded with a value */
export const createCell = (value = 0): Cell => ({ value, candidates: [] });

/** Return a deep copy of a cell */
export const cloneCell = (cell: Cell): Cell => ({
  value: cell.value,
  candidates: cell.candidates.slice(),
});

/**
 * Toggle a candidate number within a cell. If the candidate exists it is
 * removed, otherwise it is added. Candidates are kept sorted.
 */
export const toggleCandidate = (cell: Cell, n: number): void => {
  const idx = cell.candidates.indexOf(n);
  if (idx === -1) cell.candidates.push(n);
  else cell.candidates.splice(idx, 1);
  cell.candidates.sort((a, b) => a - b);
};

/** Convert a board of cells into a simple number matrix */
export const cellsToBoard = (board: Cell[][]): number[][] =>
  board.map((row) => row.map((cell) => cell.value));
