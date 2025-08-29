import fs from 'fs';
import path from 'path';
import {
  checkContradictions,
  autoFill,
  createHintSystem,
} from '../apps/games/nonogram/logic';
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
    const grid = [[0]];
    const hints = createHintSystem(1);
    expect(hints.useHint(rows, cols, grid)).toEqual({ i: 0, j: 0, value: 1 });
    expect(hints.useHint(rows, cols, grid)).toBeNull();
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
