import { buildTagIndex } from '../lib/load-table-data';

describe('buildTagIndex', () => {
  it('indexes rows by tag', () => {
    const rows = [
      { name: 'a', tags: ['t1', 't2'] },
      { name: 'b', tags: ['t2'] },
      { name: 'c', tags: [] },
    ];
    const index = buildTagIndex(rows);
    expect(index.t1).toEqual([0]);
    expect(index.t2).toEqual([0, 1]);
    expect(index.t3).toBeUndefined();
  });
});
