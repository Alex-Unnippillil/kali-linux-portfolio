import { DAY_MS, purgeArtifacts, restoreArtifacts, retentionDefaults } from '../utils/dataRetention';

describe('data retention utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('purgeArtifacts removes expired trash items', () => {
    const now = Date.now();
    const oldItem = { id: 'one', title: 'Old', closedAt: now - 40 * DAY_MS };
    const freshItem = { id: 'two', title: 'New', closedAt: now - 5 * DAY_MS };
    localStorage.setItem('window-trash', JSON.stringify([oldItem, freshItem]));

    const settings = {
      ...retentionDefaults,
      trash: 30 * DAY_MS,
      trashHistory: 0,
      scheduledTweets: 0,
      networkHistory: 0,
    };

    const results = purgeArtifacts(settings, now);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ type: 'trash', removed: 1 });

    const remaining = JSON.parse(localStorage.getItem('window-trash') || '[]');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('two');
  });

  test('restoreArtifacts reinstates purged trash', () => {
    const now = Date.now();
    const oldItem = { id: 'one', title: 'Old', closedAt: now - 40 * DAY_MS };
    const freshItem = { id: 'two', title: 'New', closedAt: now - 5 * DAY_MS };
    localStorage.setItem('window-trash', JSON.stringify([oldItem, freshItem]));

    const settings = {
      ...retentionDefaults,
      trash: 30 * DAY_MS,
      trashHistory: 0,
      scheduledTweets: 0,
      networkHistory: 0,
    };

    const results = purgeArtifacts(settings, now);
    expect(JSON.parse(localStorage.getItem('window-trash') || '[]')).toHaveLength(1);

    restoreArtifacts({ trash: results[0]?.removedItems ?? [] });
    const restored = JSON.parse(localStorage.getItem('window-trash') || '[]');
    expect(restored).toHaveLength(2);
    expect(restored.find((item: any) => item.id === 'one')).toBeTruthy();
  });
});
