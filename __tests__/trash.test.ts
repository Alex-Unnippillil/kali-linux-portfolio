import { trash, TrashItem } from '../utils/trash';

describe('trash utils', () => {
  beforeEach(() => {
    trash.empty();
  });

  it('restore returns item to source', () => {
    const item: TrashItem = { id: '1', type: 'file', payload: { data: 'a' } };
    trash.add(item);
    const restored = trash.restore('1');
    expect(restored).toEqual(item);
    expect(trash.size()).toBe(0);
  });

  it('empty clears state', () => {
    trash.add({ id: '1', type: 'file', payload: {} });
    trash.add({ id: '2', type: 'file', payload: {} });
    trash.empty();
    expect(trash.size()).toBe(0);
    expect(trash.list()).toEqual([]);
  });
});
