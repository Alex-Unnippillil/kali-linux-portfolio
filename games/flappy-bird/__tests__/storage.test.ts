import { clearHighScores, loadHighScores, recordScore } from '../storage';

const createMemoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  } as Storage;
};

describe('flappy-bird high score storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it('returns default scores when storage is empty', () => {
    expect(loadHighScores(storage)).toEqual({
      easy: 0,
      normal: 0,
      hard: 0,
    });
  });

  it('records a new personal best and persists it', () => {
    const result = recordScore('normal', 12, storage);
    expect(result.normal).toBe(12);
    expect(loadHighScores(storage).normal).toBe(12);
  });

  it('does not overwrite a higher existing score', () => {
    recordScore('normal', 10, storage);
    const result = recordScore('normal', 5, storage);
    expect(result.normal).toBe(10);
    expect(loadHighScores(storage).normal).toBe(10);
  });

  it('clears stored scores', () => {
    recordScore('easy', 3, storage);
    clearHighScores(storage);
    expect(loadHighScores(storage)).toEqual({ easy: 0, normal: 0, hard: 0 });
  });
});
