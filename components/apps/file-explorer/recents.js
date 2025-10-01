const DAY_MS = 24 * 60 * 60 * 1000;

export const RECENT_GROUPS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'older', label: 'Older' },
];

function startOfDay(timestamp) {
  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
    return NaN;
  }
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function getGroupIdForTimestamp(timestamp, now = Date.now()) {
  const entryStart = startOfDay(timestamp);
  if (!Number.isFinite(entryStart)) return 'older';

  const nowStart = startOfDay(now);
  if (entryStart === nowStart) return 'today';

  const yesterdayStart = startOfDay(now - DAY_MS);
  if (entryStart === yesterdayStart) return 'yesterday';

  return 'older';
}

export function groupRecentEntries(entries, now = Date.now()) {
  const pinned = [];
  const groups = RECENT_GROUPS.map((group) => ({ ...group, entries: [] }));
  const groupsById = new Map(groups.map((group) => [group.id, group]));

  const sorted = [...(entries || [])].sort((a, b) => {
    const aTime = typeof a?.lastAccessed === 'number' ? a.lastAccessed : 0;
    const bTime = typeof b?.lastAccessed === 'number' ? b.lastAccessed : 0;
    return bTime - aTime;
  });

  for (const entry of sorted) {
    if (!entry) continue;
    if (entry.pinned) {
      pinned.push(entry);
      continue;
    }
    const groupId = getGroupIdForTimestamp(entry.lastAccessed, now);
    const group = groupsById.get(groupId) || groupsById.get('older');
    group.entries.push(entry);
  }

  return { pinned, groups };
}
