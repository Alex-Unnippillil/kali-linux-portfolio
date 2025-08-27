import { add, restore, empty, list, size, purge, stopScheduler } from '../components/apps/trash/api';

describe('trash api', () => {
  beforeEach(() => {
    stopScheduler();
    empty(true);
  });

  afterAll(() => {
    stopScheduler();
  });

  test('restore returns item to source list', () => {
    const source = ['alpha'];
    const item = source.pop();
    add({ id: '1', type: 'text', payload: item });
    expect(source).toHaveLength(0);
    const restored = restore('1');
    if (restored) source.push(restored as string);
    expect(source).toEqual(['alpha']);
    expect(size()).toBe(0);
  });

  test('empty clears state', () => {
    add({ id: '1', type: 'file', payload: 'a' });
    add({ id: '2', type: 'file', payload: 'b' });
    expect(size()).toBe(2);
    empty(true);
    expect(size()).toBe(0);
  });

  test('purge removes expired items only', () => {
    const now = Date.now();
    const old = now - 31 * 24 * 60 * 60 * 1000;
    const recent = now - 29 * 24 * 60 * 60 * 1000;
    add({ id: '1', type: 'file', payload: 'old', deletedAt: old });
    add({ id: '2', type: 'file', payload: 'recent', deletedAt: recent });
    expect(size()).toBe(2);
    purge(now);
    const items = list();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('2');
  });
});
