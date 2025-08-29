import { checkContradictions } from '../apps/games/nonogram/logic';
import { parsePack } from '../apps/games/nonogram/packs';

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
});
