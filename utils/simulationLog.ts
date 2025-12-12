import type { SimulationLogEntry } from '../types/simulationLog';

const STORAGE_KEY = 'simulation-report-log';
const BASE_TIME = Date.parse('2024-01-01T00:00:00Z');
const MAX_ENTRIES = 50;

const safeParse = (): SimulationLogEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persist = (entries: SimulationLogEntry[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
    window.dispatchEvent(new Event('simulation-log-updated'));
  } catch {
    // Swallow storage errors for demo safety
  }
};

export const recordSimulation = (
  entry: Omit<SimulationLogEntry, 'timestamp'>
): SimulationLogEntry | null => {
  if (typeof window === 'undefined') return null;
  const log = safeParse();
  const timestamp = new Date(BASE_TIME + log.length * 60_000).toISOString();
  const withTimestamp: SimulationLogEntry = { ...entry, timestamp };
  persist([...log, withTimestamp]);
  return withTimestamp;
};

export const getSimulationLog = (): SimulationLogEntry[] => safeParse();

export const clearSimulationLog = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('simulation-log-updated'));
  } catch {
    // ignore
  }
};
