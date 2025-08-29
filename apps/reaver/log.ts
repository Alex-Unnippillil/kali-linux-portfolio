export interface ReaverLogEntry {
  time: number;
  attempts: number;
  rate: number;
}

const LOG_KEY = 'reaver/log';

export const appendLog = (entry: ReaverLogEntry): void => {
  try {
    const current = JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]') as ReaverLogEntry[];
    current.push(entry);
    window.localStorage.setItem(LOG_KEY, JSON.stringify(current));
  } catch {
    // ignore storage errors
  }
};

export const clearLog = (): void => {
  try {
    window.localStorage.removeItem(LOG_KEY);
  } catch {
    // ignore storage errors
  }
};

export const getLog = (): ReaverLogEntry[] => {
  try {
    return JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]') as ReaverLogEntry[];
  } catch {
    return [];
  }
};

export default LOG_KEY;
