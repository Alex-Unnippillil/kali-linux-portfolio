import { initializeGame } from '../components/apps/solitaire/engine';
import {
  prepareForStorage,
  reviveSnapshot,
  SNAPSHOT_VERSION,
  isPersistedSnapshot,
} from '../components/apps/solitaire/persistence';
import { createDefaultStats } from '../components/apps/solitaire/types';

describe('solitaire persistence helpers', () => {
  const baseStats = createDefaultStats();

  test('prepareForStorage normalises unlimited redeals', () => {
    const game = initializeGame(1, undefined, 42, Infinity);
    const snapshot = {
      version: SNAPSHOT_VERSION,
      variant: 'klondike' as const,
      drawMode: 1 as const,
      passLimit: Infinity,
      game,
      moves: 5,
      time: 12,
      bankroll: 120,
      stats: { ...baseStats, gamesPlayed: 3 },
      isDaily: false,
      won: false,
      winnableOnly: false,
      timestamp: 1700000000000,
    };

    const stored = prepareForStorage(snapshot);
    expect(stored.passLimit).toBe('unlimited');
    expect(stored.game.redeals).toBe('unlimited');
    expect(stored.game).not.toBe(snapshot.game);
    expect(stored.game.tableau[0]).not.toBe(snapshot.game.tableau[0]);

    const revived = reviveSnapshot(stored);
    expect(revived).not.toBeNull();
    expect(revived?.passLimit).toBe(Infinity);
    expect(revived?.game.redeals).toBe(Infinity);
    expect(revived?.stats).toEqual(snapshot.stats);
    expect(revived?.game.tableau).not.toBe(snapshot.game.tableau);
  });

  test('reviveSnapshot rejects malformed payloads', () => {
    const invalid = { foo: 'bar' };
    expect(reviveSnapshot(invalid)).toBeNull();

    const badVersion = {
      version: SNAPSHOT_VERSION + 1,
      variant: 'klondike' as const,
      drawMode: 1 as const,
      passLimit: 3,
      game: prepareForStorage({
        version: SNAPSHOT_VERSION,
        variant: 'klondike',
        drawMode: 1,
        passLimit: 3,
        game: initializeGame(1),
        moves: 0,
        time: 0,
        bankroll: 0,
        stats: baseStats,
        isDaily: false,
        won: false,
        winnableOnly: false,
        timestamp: Date.now(),
      }).game,
      moves: 0,
      time: 0,
      bankroll: 0,
      stats: baseStats,
      isDaily: false,
      won: false,
      winnableOnly: false,
      timestamp: Date.now(),
    };

    expect(isPersistedSnapshot(badVersion)).toBe(true);
    expect(reviveSnapshot(badVersion)).toBeNull();
  });
});
