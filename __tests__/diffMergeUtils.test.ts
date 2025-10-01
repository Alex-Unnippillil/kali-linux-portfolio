import {
  computeDiffHunks,
  mergeDiffHunks,
  summarizeSelections,
} from '../utils/diffMerge';

describe('diffMerge utilities', () => {
  test('computes hunks for changed lines', () => {
    const base = ['line one', 'line two', 'line three'].join('\n');
    const incoming = ['line one', 'line TWO', 'line three', 'added'].join('\n');

    const hunks = computeDiffHunks(base, incoming);

    expect(hunks).toHaveLength(1);
    expect(hunks[0].lines.some((line) => line.type === 'add')).toBe(true);

    const incomingMerged = mergeDiffHunks(base, incoming, hunks, {});
    expect(incomingMerged).toBe(incoming);

    const keepBase = mergeDiffHunks(base, incoming, hunks, {
      [hunks[0].id]: 'base',
    });
    expect(keepBase).toBe(base);

    const summary = summarizeSelections(hunks, {
      [hunks[0].id]: 'base',
    });
    expect(summary).toEqual({ totalHunks: 1, baseSelections: 1, incomingSelections: 0 });
  });
});

