import { processGuess } from '../components/apps/simon';

describe('processGuess', () => {
  test('correct sequence advances round', () => {
    const rand = jest.fn().mockReturnValue(0.5); // produces 2
    const result = processGuess([1], 0, 1, false, rand);
    expect(result.status).toBe('advance');
    expect(result.sequence).toEqual([1, 2]);
    expect(result.step).toBe(0);
  });

  test('strict mode restarts on first error', () => {
    const result = processGuess([0], 0, 1, true);
    expect(result.status).toBe('restart');
    expect(result.sequence).toEqual([]);
    expect(result.step).toBe(0);
  });
});
