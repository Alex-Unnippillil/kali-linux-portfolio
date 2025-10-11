import {
  loadTimerState,
  persistTimerState,
  clearTimerState,
  TIMER_STORAGE_KEY,
} from '../games/word-search/timer';

describe('word search timer persistence', () => {
  const createStorage = () => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      snapshot: () => store,
    };
  };

  it('returns defaults when nothing stored', () => {
    const storage = createStorage();
    const defaults = { initialValue: 90, mode: 'countdown' as const, limit: 90 };
    const snapshot = loadTimerState(storage, 'seed', 'easy', defaults);
    expect(snapshot).toEqual({ value: 90, paused: false });
  });

  it('persists and restores timer state for matching puzzle', () => {
    const storage = createStorage();
    persistTimerState(storage, {
      seed: 'abc',
      difficulty: 'hard',
      mode: 'countdown',
      value: 42,
      paused: true,
      limit: 240,
    });
    const restored = loadTimerState(
      storage,
      'abc',
      'hard',
      { initialValue: 240, mode: 'countdown', limit: 240 },
    );
    expect(restored).toEqual({ value: 42, paused: true });
  });

  it('ignores mismatched entries and clears storage', () => {
    const storage = createStorage();
    storage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({ seed: 'old', difficulty: 'easy', mode: 'countup', value: 12, paused: false }),
    );
    const defaults = { initialValue: 0, mode: 'countup' as const };
    const snapshot = loadTimerState(storage, 'new', 'easy', defaults);
    expect(snapshot).toEqual({ value: 0, paused: false });
    clearTimerState(storage);
    expect(storage.snapshot()).toEqual({});
  });
});
