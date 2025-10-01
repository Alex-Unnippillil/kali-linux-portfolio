import { getGroupIdForTimestamp, groupRecentEntries, RECENT_GROUPS } from '../components/apps/file-explorer/recents';

describe('file explorer recents grouping', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  it('categorizes timestamps into today, yesterday, and older', () => {
    const now = Date.UTC(2024, 5, 10, 12, 0, 0);
    const entries = [
      { id: 1, name: 'today', lastAccessed: now - 1_000 },
      { id: 2, name: 'yesterday', lastAccessed: now - DAY_MS },
      { id: 3, name: 'older', lastAccessed: now - 3 * DAY_MS },
      { id: 4, name: 'unknown', lastAccessed: undefined as unknown as number },
    ];

    const result = groupRecentEntries(entries, now);
    const todayGroup = result.groups.find((group) => group.id === 'today');
    const yesterdayGroup = result.groups.find((group) => group.id === 'yesterday');
    const olderGroup = result.groups.find((group) => group.id === 'older');

    expect(todayGroup?.entries.map((entry) => entry.id)).toEqual([1]);
    expect(yesterdayGroup?.entries.map((entry) => entry.id)).toEqual([2]);
    expect(olderGroup?.entries.map((entry) => entry.id)).toEqual([3, 4]);
  });

  it('sorts pinned entries above recency groups', () => {
    const now = Date.UTC(2024, 5, 10, 12, 0, 0);
    const entries = [
      { id: 1, name: 'older pinned', lastAccessed: now - 5 * DAY_MS, pinned: true },
      { id: 2, name: 'recent pinned', lastAccessed: now - 500, pinned: true },
      { id: 3, name: 'recent', lastAccessed: now - 100 },
      { id: 4, name: 'older', lastAccessed: now - 10 * DAY_MS },
    ];

    const result = groupRecentEntries(entries, now);
    expect(result.pinned.map((entry) => entry.id)).toEqual([2, 1]);
    const todayGroup = result.groups.find((group) => group.id === 'today');
    const olderGroup = result.groups.find((group) => group.id === 'older');
    expect(todayGroup?.entries.map((entry) => entry.id)).toEqual([3]);
    expect(olderGroup?.entries.map((entry) => entry.id)).toContain(4);
  });

  it('provides a fallback group for invalid timestamps', () => {
    const now = Date.UTC(2024, 5, 10, 12, 0, 0);
    expect(getGroupIdForTimestamp(NaN, now)).toBe('older');
    expect(getGroupIdForTimestamp(undefined as unknown as number, now)).toBe('older');
    const { groups } = groupRecentEntries([{ id: 1, name: 'x', lastAccessed: NaN } as any], now);
    const olderGroup = groups.find((group) => group.id === 'older');
    expect(olderGroup?.entries.map((entry) => entry.id)).toEqual([1]);
  });

  it('returns every configured group even if empty', () => {
    const now = Date.UTC(2024, 5, 10, 12, 0, 0);
    const { groups } = groupRecentEntries([], now);
    expect(groups.map((group) => group.id)).toEqual(RECENT_GROUPS.map((group) => group.id));
  });
});
