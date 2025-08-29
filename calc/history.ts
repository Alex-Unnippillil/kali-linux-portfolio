import usePersistentState from '../hooks/usePersistentState';

export interface HistoryEntry {
  expr: string;
  result: string;
}

export const HISTORY_KEY = 'calc-history';

export function useHistory() {
  return usePersistentState<HistoryEntry[]>(
    HISTORY_KEY,
    () => [],
    (v): v is HistoryEntry[] =>
      Array.isArray(v) &&
      v.every((item) => typeof item?.expr === 'string' && typeof item?.result === 'string'),
  );
}

