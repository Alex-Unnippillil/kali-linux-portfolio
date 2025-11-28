import {
  SCORE_BASE,
  makeLevelKey,
  serializeState,
  deserializeState,
  updateProgressSnapshot,
  removeProgressSnapshot,
  readProgressSnapshot,
  encodeScore,
  shouldUpdateBest,
  loadBestFromStorage,
  saveBestToStorage,
  sanitizeSnapshot,
  type ProgressSnapshot,
} from '../components/apps/sokobanState';

describe('sokoban persistence helpers', () => {
  const sampleLevel = ['#####', '#@$.#', '#####'];
  const sampleState = {
    board: sampleLevel.map((row) => row.split('')),
    player: { x: 1, y: 1 },
    moves: 3,
    pushes: 1,
  };

  const makeStorage = () => {
    const data = new Map<string, string>();
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
      removeItem: (key: string) => {
        data.delete(key);
      },
    };
  };

  test('serializes and restores board state', () => {
    const serialized = serializeState(sampleState);
    const restored = deserializeState(serialized);
    expect(restored.board).toEqual(sampleState.board);
    expect(restored.player).toEqual(sampleState.player);
    expect(restored.moves).toBe(sampleState.moves);
    expect(restored.pushes).toBe(sampleState.pushes);
  });

  test('progress snapshot stores unique entries', () => {
    const key = makeLevelKey(sampleLevel);
    const serialized = serializeState(sampleState);
    const snapshot: ProgressSnapshot = {};
    const updated = updateProgressSnapshot(snapshot, key, serialized);
    expect(updated).not.toBe(snapshot);
    expect(updated[key]).toEqual(serialized);
    const deduped = updateProgressSnapshot(updated, key, serialized);
    expect(deduped).toBe(updated);
  });

  test('progress snapshot removal clears saved state', () => {
    const key = makeLevelKey(sampleLevel);
    const serialized = serializeState(sampleState);
    const snapshot = updateProgressSnapshot({}, key, serialized);
    const cleared = removeProgressSnapshot(snapshot, key);
    expect(cleared[key]).toBeUndefined();
    expect(Object.keys(cleared)).toHaveLength(0);
  });

  test('progress snapshot read validates shape', () => {
    const key = makeLevelKey(sampleLevel);
    const serialized = serializeState(sampleState);
    const snapshot = updateProgressSnapshot({}, key, serialized);
    expect(readProgressSnapshot(snapshot, key)).toEqual(serialized);
    expect(readProgressSnapshot(snapshot, 'missing')).toBeNull();
  });

  test('score encoding rewards lower move counts', () => {
    const best = { moves: 5, pushes: 2 };
    const worse = { moves: 8, pushes: 0 };
    expect(encodeScore(best)).toBe(SCORE_BASE - 5000 - 2);
    expect(encodeScore(best)).toBeGreaterThan(encodeScore(worse));
  });

  test('best comparison prefers fewer moves then pushes', () => {
    expect(shouldUpdateBest(null, { moves: 10, pushes: 4 })).toBe(true);
    expect(
      shouldUpdateBest({ moves: 10, pushes: 4 }, { moves: 9, pushes: 5 }),
    ).toBe(true);
    expect(
      shouldUpdateBest({ moves: 10, pushes: 4 }, { moves: 10, pushes: 3 }),
    ).toBe(true);
    expect(
      shouldUpdateBest({ moves: 8, pushes: 3 }, { moves: 9, pushes: 0 }),
    ).toBe(false);
  });

  test('best stats persist improvements', () => {
    const storage = makeStorage();
    const key = `sokoban-best:${makeLevelKey(sampleLevel)}`;
    const first = saveBestToStorage(storage, key, { moves: 12, pushes: 6 });
    expect(first).toEqual({ moves: 12, pushes: 6 });
    expect(JSON.parse(storage.getItem(key) as string)).toEqual(first);

    const second = saveBestToStorage(storage, key, { moves: 12, pushes: 5 });
    expect(second).toEqual({ moves: 12, pushes: 5 });
    expect(JSON.parse(storage.getItem(key) as string)).toEqual(second);

    const regression = saveBestToStorage(storage, key, {
      moves: 14,
      pushes: 2,
    });
    expect(regression).toEqual(second);
    expect(JSON.parse(storage.getItem(key) as string)).toEqual(second);
  });

  test('loading best stats handles malformed payloads', () => {
    const storage = makeStorage();
    const key = 'sokoban-best:bad';
    storage.setItem(key, '{"moves":"oops"}');
    expect(loadBestFromStorage(storage, key)).toBeNull();
  });

  test('sanitize snapshot filters invalid entries', () => {
    const valid = serializeState(sampleState);
    const dirty = {
      ok: { ...valid },
      bad: { board: [1, 2, 3], player: { x: 'a', y: 'b' } },
    } as unknown;
    const cleaned = sanitizeSnapshot(dirty);
    expect(cleaned.ok).toEqual(valid);
    expect(cleaned.bad).toBeUndefined();
  });
});
