import { FetchEntry } from '../../../lib/fetchProxy';

export const HISTORY_KEY = 'network-insights-history';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export interface HistoryEntry extends FetchEntry {
  timestamp: number;
}

const deriveTimestamp = (entry: FetchEntry): number => {
  if (isFiniteNumber((entry as { timestamp?: unknown }).timestamp)) {
    return (entry as { timestamp: number }).timestamp;
  }
  if (isFiniteNumber(entry.startTime) && typeof performance !== 'undefined') {
    const origin = (performance as Performance & { timeOrigin?: number }).timeOrigin;
    if (isFiniteNumber(origin)) {
      return Math.round(origin + (entry.startTime as number));
    }
  }
  return Date.now();
};

export const ensureHistoryEntry = (entry: FetchEntry): HistoryEntry => {
  if (isFiniteNumber((entry as { timestamp?: unknown }).timestamp)) {
    return entry as HistoryEntry;
  }
  return {
    ...entry,
    timestamp: deriveTimestamp(entry),
  } as HistoryEntry;
};

export const normalizeHistory = (entries: FetchEntry[]): HistoryEntry[] => {
  let mutated = false;
  const normalized = entries.map((entry) => {
    if (isFiniteNumber((entry as { timestamp?: unknown }).timestamp)) {
      return entry as HistoryEntry;
    }
    mutated = true;
    return ensureHistoryEntry(entry);
  });
  return mutated ? normalized : (entries as HistoryEntry[]);
};

export const readHistory = (): HistoryEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeHistory(parsed as FetchEntry[]);
  } catch {
    return [];
  }
};
