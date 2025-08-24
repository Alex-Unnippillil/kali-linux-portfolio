import { generateGrid } from './generator';

describe('word search generator', () => {
  it('is deterministic for a given seed', () => {
    const words = ['ONE', 'TWO', 'THREE'];
    const a = generateGrid(words, 12, 'seed');
    const b = generateGrid(words, 12, 'seed');
    expect(a.grid).toEqual(b.grid);
    expect(a.placements).toEqual(b.placements);
  });

  it('generates 12x12 grid quickly', () => {
    const words = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'EPSILON'];
    const start = Date.now();
    const result = generateGrid(words, 12, 'speed');
    const elapsed = Date.now() - start;
    expect(result.placements.length).toBe(words.length);
    expect(elapsed).toBeLessThan(200);
  });
});
