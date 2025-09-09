import { loadFromStorage, saveToStorage } from '../utils/persistent';

describe('persistent storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads values', () => {
    saveToStorage('foo', { bar: 1 });
    const val = loadFromStorage('foo', { bar: 0 });
    expect(val).toEqual({ bar: 1 });
  });

  it('returns fallback when validator fails', () => {
    localStorage.setItem('foo', JSON.stringify('nope'));
    const val = loadFromStorage('foo', 42, (v): v is number => typeof v === 'number');
    expect(val).toBe(42);
  });
});
