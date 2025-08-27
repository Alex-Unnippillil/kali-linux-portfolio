import { generateGrid } from '../apps/word_search/generator';
import { computePath } from '../apps/word_search/utils';

describe('word search generator', () => {
  it('places words without conflicts', () => {
    const words = ['CAT', 'DOG'];
    const { grid, placements } = generateGrid(words, 8, 'seed');
    expect(placements).toHaveLength(words.length);
    placements.forEach(({ word, positions }) => {
      const placed = positions.map((p) => grid[p.row][p.col]).join('');
      const reversed = placed.split('').reverse().join('');
      expect([placed, reversed]).toContain(word);
    });
  });

  it('is deterministic with the same seed', () => {
    const words = ['ALPHA', 'BETA'];
    const a = generateGrid(words, 10, 'same');
    const b = generateGrid(words, 10, 'same');
    expect(a.grid).toEqual(b.grid);
  });

  it('computes straight paths correctly', () => {
    const path = computePath({ row: 0, col: 0 }, { row: 2, col: 2 });
    expect(path).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 2 },
    ]);
    const invalid = computePath({ row: 0, col: 0 }, { row: 2, col: 1 });
    expect(invalid).toEqual([{ row: 0, col: 0 }]);
  });
});
