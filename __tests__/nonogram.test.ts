import {
  validateSolution,
  findHint,
  generateLinePatterns,
  lineToClues,
  autoFill,
} from '../apps/games/nonogram/logic';
import {
  loadPackFromJSON,
  selectPuzzleBySeed,
} from '../apps/games/nonogram/packs';
import samplePack from '../apps/games/nonogram/sample-pack.json';

const pack = loadPackFromJSON(samplePack);
const puzzles = pack.puzzles;

describe('nonogram utilities', () => {
  test('validateSolution confirms grid matches clues', () => {
    const puzzle = selectPuzzleBySeed('0', puzzles);
    const { rows, cols, grid } = puzzle;
    const solved = grid.map((row) => row.slice());
    expect(validateSolution(solved, rows, cols)).toBe(true);
    const unsolved = solved.map((row) => row.slice());
    unsolved[0][0] = unsolved[0][0] === 1 ? 0 : 1;
    expect(validateSolution(unsolved, rows, cols)).toBe(false);
  });

  test('hint fills only logical squares', () => {
    const { rows, cols } = selectPuzzleBySeed('0', puzzles);
    const grid = Array(rows.length)
      .fill(null)
      .map(() => Array(cols.length).fill(0));
    const hint = findHint(rows, cols, grid);
    expect(hint).not.toBeNull();
    if (!hint) return;
    const { i, j } = hint;
    const rowPatterns = rows.map((clue) => generateLinePatterns(clue, cols.length));
    const g = Array(rows.length)
      .fill(null)
      .map(() => Array(cols.length).fill(0));
    const solutions: number[][][] = [];
    const backtrack = (r: number) => {
      if (r === rows.length) {
        const colsValid = cols.every(
          (clue, cIdx) =>
            JSON.stringify(lineToClues(g.map((row) => row[cIdx]))) ===
            JSON.stringify(clue),
        );
        if (colsValid) solutions.push(g.map((row) => row.slice()));
        return;
      }
      rowPatterns[r].forEach((pattern) => {
        g[r] = pattern;
        backtrack(r + 1);
      });
    };
    backtrack(0);
    expect(solutions.length).toBeGreaterThan(0);
    solutions.forEach((sol) => expect(sol[i][j]).toBe(1));
  });

  test('autoFill solves uniquely determined lines', () => {
    const rows = [[1]];
    const cols = [[1]];
    const grid = [[0]];
    const result = autoFill(grid, rows, cols);
    expect(result[0][0]).toBe(1);
  });

  test('autoFill marks blanks for empty clues', () => {
    const rows: number[][] = [[]];
    const cols: number[][] = [[]];
    const grid = [[0]];
    const result = autoFill(grid, rows, cols);
    expect(result[0][0]).toBe(-1);
  });

  test('daily seed deterministic', () => {
    const a = selectPuzzleBySeed('2024-01-01', puzzles);
    const b = selectPuzzleBySeed('2024-01-01', puzzles);
    expect(a).toEqual(b);
  });

  test('loadPackFromJSON converts sample data', () => {
    expect(pack.name).toBe(samplePack.name);
    expect(pack.puzzles).toHaveLength(samplePack.puzzles.length);
    expect(pack.puzzles[0].rows.length).toBeGreaterThan(0);
  });
});
