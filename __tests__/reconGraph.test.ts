import { aggregateRelationships } from '../recon/graph';

describe('aggregateRelationships', () => {
  it('deduplicates nodes and counts links', () => {
    const input = [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c', type: 'knows' },
    ];
    const result = aggregateRelationships(input);
    expect(result.nodes).toEqual(
      expect.arrayContaining([{ id: 'a' }, { id: 'b' }, { id: 'c' }]),
    );
    const ab = result.links.find(
      (l) => l.source === 'a' && l.target === 'b' && !l.type,
    );
    expect(ab?.count).toBe(2);
    const bc = result.links.find(
      (l) => l.source === 'b' && l.target === 'c' && l.type === 'knows',
    );
    expect(bc?.count).toBe(1);
  });
});
