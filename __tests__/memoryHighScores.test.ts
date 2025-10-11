import {
  clearMemoryScores,
  getMemoryScore,
  recordMemoryScore,
  type MemoryModeDescriptor,
} from '../apps/memory';

describe('memory high score utilities', () => {
  const mode: MemoryModeDescriptor = {
    variant: 'test',
    player: 1,
    size: 4,
    timerMode: 'countup',
    deckType: 'emoji',
  };

  beforeEach(() => {
    clearMemoryScores();
  });

  it('stores the first recorded score', () => {
    const saved = recordMemoryScore(mode, { moves: 10, time: 45 });
    expect(saved.moves).toBe(10);
    expect(saved.time).toBe(45);
  });

  it('keeps the best (lowest) stats', () => {
    recordMemoryScore(mode, { moves: 12, time: 60 });
    const improved = recordMemoryScore(mode, { moves: 8, time: 55 });
    expect(improved.moves).toBe(8);
    expect(improved.time).toBe(55);
    const stored = getMemoryScore(mode);
    expect(stored?.moves).toBe(8);
    expect(stored?.time).toBe(55);
  });
});

