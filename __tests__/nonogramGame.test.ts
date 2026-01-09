import fs from 'fs';
import path from 'path';
import {
  analyzeLine,
  autoFill,
  checkContradictions,
  isSolved,
  propagate,
} from '../apps/games/nonogram/logic';
import { findLogicalHint, createHintSystem } from '../apps/games/nonogram/hints';
import {
  parsePack,
  loadPackFromJSON,
} from '../apps/games/nonogram/packs';
import { saveProgress, loadProgress } from '../apps/games/nonogram/progress';

describe('games/nonogram logic', () => {
  test('detects contradictions from cross marks', () => {
    const rows = [[1]];
    const cols = [[1]];
    const grid = [[-1]] as (-1 | 0 | 1)[][];
    const result = checkContradictions(grid, rows, cols);
    expect(result.rows[0]).toBe(true);
    expect(result.cols[0]).toBe(true);
  });

  test('analyzeLine reports forced cells', () => {
    const clue = [2];
    const line = [1, 0, 0] as (-1 | 0 | 1)[];
    const result = analyzeLine(clue, line);
    expect(result.contradiction).toBe(false);
    expect(result.forced[1]).toBe(1);
    expect(result.forced[2]).toBe(-1);
  });

  test('propagate cross-checks rows and columns', () => {
    const rows = [[1], [1]];
    const cols = [[1], [1]];
    const grid = [
      [1, 0],
      [0, 0],
    ] as (-1 | 0 | 1)[][];
    const result = propagate(grid, rows, cols);
    expect(result.grid[1][0]).toBe(-1);
    expect(result.grid[1][1]).toBe(1);
    expect(result.rowContradiction.every((v) => !v)).toBe(true);
    expect(result.colContradiction.every((v) => !v)).toBe(true);
  });

  test('hint system only returns logical moves', () => {
    const rows = [[1], [1]];
    const cols = [[1], [1]];
    const grid = [
      [1, 0],
      [0, 0],
    ] as (-1 | 0 | 1)[][];
    const hint = findLogicalHint(rows, cols, grid);
    expect(hint).not.toBeNull();
    if (!hint) return;
    expect(grid[hint.i][hint.j]).toBe(0);
    const applied = grid.map((row) => row.slice());
    applied[hint.i][hint.j] = hint.value;
    const post = propagate(applied, rows, cols);
    expect(post.rowContradiction.some(Boolean)).toBe(false);
    expect(post.colContradiction.some(Boolean)).toBe(false);
  });

  test('completion requires all cells resolved', () => {
    const rows = [[]];
    const cols = [[]];
    const grid = [[0]];
    expect(isSolved(grid, rows, cols)).toBe(false);
    const filled = [[-1]] as (-1 | 0 | 1)[][];
    expect(isSolved(filled, rows, cols)).toBe(true);
  });

  test('loads puzzles from packs', () => {
    const raw = `
#..
##.
...

.#.
###
.#.
`;
    const puzzles = parsePack(raw);
    expect(puzzles).toHaveLength(2);
    expect(puzzles[0].rows).toEqual([[1], [2], []]);
    expect(puzzles[0].cols).toEqual([[2], [1], []]);
  });

  test('autoFill solves determined cells', () => {
    const rows = [[1]];
    const cols = [[1]];
    const grid = [[0]];
    const result = autoFill(grid, rows, cols);
    expect(result[0][0]).toBe(1);
  });

  test('hint system enforces usage limit', () => {
    const rows = [[1]];
    const cols = [[1]];
    const grid = [[0]] as (0 | 1 | -1)[][];
    const hints = createHintSystem(1);
    expect(hints.useHint(grid, rows, cols)).toEqual({ i: 0, j: 0, value: 1 });
    expect(hints.useHint(grid, rows, cols)).toBeNull();
    expect(hints.remaining()).toBe(0);
  });

  test('loads puzzle packs from JSON files', () => {
    const file = path.join(__dirname, '../apps/games/nonogram/sample-pack.json');
    const raw = fs.readFileSync(file, 'utf8');
    const pack = loadPackFromJSON(raw);
    expect(pack.puzzles).toHaveLength(2);
    expect(pack.puzzles[0].rows).toEqual([[1], [2], []]);
    expect(pack.puzzles[0].cols).toEqual([[2], [1], []]);
  });

  test('persists progress per puzzle', () => {
    localStorage.clear();
    const state = { grid: [[1]], hintsUsed: 2 };
    saveProgress('p1', state);
    const loaded = loadProgress('p1');
    expect(loaded).toEqual(state);
  });
});
