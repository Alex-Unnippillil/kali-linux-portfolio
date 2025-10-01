import { pruneSelection, replaceSelection, selectRange, toggleSelection } from '../utils/selectionState';

describe('selectionState utilities', () => {
  test('toggleSelection adds and removes values', () => {
    const initial = new Set<number>();
    const added = toggleSelection(initial, 1);
    expect(Array.from(added)).toEqual([1]);
    const removed = toggleSelection(added, 1);
    expect(Array.from(removed)).toEqual([]);
  });

  test('replaceSelection normalizes to a single value', () => {
    const replaced = replaceSelection(5);
    expect(Array.from(replaced)).toEqual([5]);
    const empty = replaceSelection<number>(undefined);
    expect(Array.from(empty)).toEqual([]);
  });

  test('selectRange returns inclusive range and can extend selection', () => {
    const order = [1, 2, 3, 4, 5];
    const range = selectRange(new Set<number>(), order, 1, 3);
    expect(Array.from(range)).toEqual([2, 3, 4]);

    const additive = selectRange(new Set<number>([1]), order, 4, 2, { additive: true });
    expect(Array.from(additive).sort()).toEqual([1, 3, 4, 5]);
  });

  test('pruneSelection removes values not in the valid set', () => {
    const current = new Set<number>([1, 2, 3]);
    const pruned = pruneSelection(current, [1, 3, 4]);
    expect(Array.from(pruned).sort()).toEqual([1, 3]);

    const unchanged = pruneSelection(pruned, [1, 3, 4]);
    expect(unchanged).toBe(pruned);
  });
});
