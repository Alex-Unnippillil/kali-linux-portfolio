import { generateGrid } from '@apps/word_search/generator';

describe('word search generator', () => {
  it('places words without conflicts', () => {
    const words = ['CAT', 'DOG'];
    const { grid, placements } = generateGrid(words, 8, 'seed');
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
});
