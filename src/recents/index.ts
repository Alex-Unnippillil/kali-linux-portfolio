export interface RecentVisit {
  url: string;
  title: string;
  timestamp: number;
}

export interface RecordRecentVisitOptions {
  url: string;
  title?: string;
  timestamp?: number;
  incognito?: boolean;
}

const STORAGE_KEY = 'browser:recent-visits';
const MAX_RECENTS = 50;

const readRecents = (): RecentVisit[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is RecentVisit =>
          entry && typeof entry.url === 'string' && typeof entry.timestamp === 'number',
      )
      .map((entry) => ({
        url: entry.url,
        title: typeof entry.title === 'string' && entry.title ? entry.title : entry.url,
        timestamp: entry.timestamp,
      }));
  } catch {
    return [];
  }
};

const writeRecents = (entries: RecentVisit[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore quota errors */
  }
};

export const getRecentVisits = (): RecentVisit[] => readRecents();

export const recordRecentVisit = ({
  url,
  title,
  timestamp,
  incognito,
}: RecordRecentVisitOptions) => {
  const trimmed = url.trim();
  if (!trimmed || incognito || typeof window === 'undefined') {
    return;
  }

  const visits = readRecents();
  const entry: RecentVisit = {
    url: trimmed,
    title: title?.trim() || trimmed,
    timestamp: timestamp ?? Date.now(),
  };

  const filtered = visits.filter((visit) => visit.url !== trimmed);
  const next = [entry, ...filtered].slice(0, MAX_RECENTS);
  writeRecents(next);
};

export const clearRecentVisits = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};
