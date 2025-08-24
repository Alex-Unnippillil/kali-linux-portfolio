import { generateSequence } from '@components/apps/simon';

describe('generateSequence', () => {
  test('adds a random pad without mutating the original sequence', () => {
    const original = [0, 1];
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.75);
    const next = generateSequence(original);
    expect(next).toEqual([0, 1, 3]);
    expect(original).toEqual([0, 1]);
    spy.mockRestore();
  });
});

