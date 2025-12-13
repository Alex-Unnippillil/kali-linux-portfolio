import { fisherYatesShuffle } from '../components/apps/memory_utils';

describe('fisherYatesShuffle determinism', () => {
  test('does not mutate input', () => {
    const arr = [1, 2, 3];
    const out = fisherYatesShuffle(arr, () => 0.5);
    expect(arr).toEqual([1, 2, 3]);
    expect(out).toHaveLength(3);
  });

  test('respects rng', () => {
    const arr = [1, 2, 3];
    const alwaysZero = () => 0;
    expect(fisherYatesShuffle(arr, alwaysZero)).toEqual([2, 3, 1]);

    const almostOne = () => 0.999999;
    expect(fisherYatesShuffle(arr, almostOne)).toEqual([1, 2, 3]);
  });

  test('returns permutation of original elements', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const shuffled = fisherYatesShuffle(arr, () => 0.25);
    expect(shuffled.sort()).toEqual(arr.sort());
  });
});
