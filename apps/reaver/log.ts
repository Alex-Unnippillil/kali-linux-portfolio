export interface LogEntry {
  timestamp: number;
  attempts: number;
  rate: number;
}

const STORAGE_KEY = 'reaver-log';

export const logAttempt = (attempts: number, rate: number) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const entries: LogEntry[] = raw ? JSON.parse(raw) : [];
    entries.push({ timestamp: Date.now(), attempts, rate });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore logging errors
  }
};

export const readLog = (): LogEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch {
    return [];
  }
};

export const clearLog = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};
