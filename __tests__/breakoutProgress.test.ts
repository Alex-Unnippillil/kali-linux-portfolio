import {
  advanceStage,
  createDefaultProgress,
  loadProgress,
  resetProgress,
  saveProgress,
  sanitizeProgress,
} from '../games/breakout/progress';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key) ?? null : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

describe('breakout progress helpers', () => {
  it('loads default progress when storage is empty', () => {
    const storage = new MemoryStorage();
    expect(loadProgress(storage)).toEqual(createDefaultProgress());
  });

  it('persists progress and loads it back', () => {
    const storage = new MemoryStorage();
    const progress = createDefaultProgress(2);
    const withScore = { ...progress, score: 150, lives: 2 };
    saveProgress(withScore, storage);
    expect(loadProgress(storage)).toEqual(withScore);
  });

  it('advances stage and clamps lives/score', () => {
    const progress = { stage: 1, lives: 1, score: 90 };
    const advanced = advanceStage(progress, { scoreBonus: 50, lives: 5 });
    expect(advanced).toEqual({ stage: 2, lives: 3, score: 140 });
  });

  it('resets stored progress and returns defaults', () => {
    const storage = new MemoryStorage();
    const progress = { stage: 3, lives: 1, score: 250 };
    saveProgress(progress, storage);
    const reset = resetProgress(storage);
    expect(reset).toEqual(createDefaultProgress());
    expect(loadProgress(storage)).toEqual(createDefaultProgress());
  });

  it('sanitizes malformed progress objects', () => {
    const malformed = sanitizeProgress({ stage: -4, lives: -2, score: -10 });
    expect(malformed).toEqual({ stage: 1, lives: 3, score: 0 });
  });
});
