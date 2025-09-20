import seedHistory from '../data/settings/history.json';
import {
  cloneSnapshot,
  diffSettings,
  type SettingsSnapshot,
} from '../utils/settings';

export interface SettingsHistoryEntry {
  id: string;
  timestamp: string;
  summary: string;
  source: string;
  before: SettingsSnapshot;
  after: SettingsSnapshot;
  changes: Partial<SettingsSnapshot>;
  undone?: boolean;
  undoneAt?: string;
}

export interface RecordSettingsMutationParams {
  before: SettingsSnapshot;
  after: SettingsSnapshot;
  summary: string;
  source: string;
  history?: SettingsHistoryEntry[];
}

const HISTORY_STORAGE_KEY = 'settings:history';
export const MAX_HISTORY_ENTRIES = 50;

const fallbackHistory: SettingsHistoryEntry[] = Array.isArray(seedHistory)
  ? (seedHistory as SettingsHistoryEntry[])
  : [];

const normaliseHistory = (
  history: unknown,
): SettingsHistoryEntry[] => {
  if (!Array.isArray(history)) return [...fallbackHistory];
  return history
    .filter((entry): entry is SettingsHistoryEntry =>
      typeof entry === 'object' &&
      entry !== null &&
      'id' in entry &&
      'timestamp' in entry &&
      'before' in entry &&
      'after' in entry,
    )
    .map((entry) => ({
      ...entry,
      before: { ...entry.before },
      after: { ...entry.after },
      changes: { ...entry.changes },
    }));
};

export const loadSettingsHistory = async (): Promise<SettingsHistoryEntry[]> => {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return [...fallbackHistory];
      const parsed = JSON.parse(raw);
      return normaliseHistory(parsed);
    } catch (error) {
      console.warn('Failed to load settings history from storage', error);
      return [...fallbackHistory];
    }
  }

  try {
    const [fs, path] = await Promise.all([
      import('fs/promises'),
      import('path'),
    ]);
    const filePath = path.join(process.cwd(), 'data/settings/history.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    return normaliseHistory(parsed);
  } catch {
    return [...fallbackHistory];
  }
};

export const persistSettingsHistory = async (
  history: SettingsHistoryEntry[],
): Promise<void> => {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(history),
      );
    } catch (error) {
      console.warn('Failed to persist settings history', error);
    }
    return;
  }

  try {
    const [fs, path] = await Promise.all([
      import('fs/promises'),
      import('path'),
    ]);
    const filePath = path.join(process.cwd(), 'data/settings/history.json');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(history, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Failed to write settings history file', error);
  }
};

const createHistoryEntry = (
  params: RecordSettingsMutationParams,
  changes: Partial<SettingsSnapshot>,
): SettingsHistoryEntry => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
  timestamp: new Date().toISOString(),
  summary: params.summary,
  source: params.source,
  before: cloneSnapshot(params.before),
  after: cloneSnapshot(params.after),
  changes: { ...changes },
});

export const recordSettingsMutation = async (
  params: RecordSettingsMutationParams,
): Promise<{ entry: SettingsHistoryEntry | null; history: SettingsHistoryEntry[] }> => {
  const changes = diffSettings(params.before, params.after);
  if (Object.keys(changes).length === 0) {
    const history = params.history ?? (await loadSettingsHistory());
    return { entry: null, history };
  }

  const entry = createHistoryEntry(params, changes);
  const history = params.history ?? (await loadSettingsHistory());
  const updated = [entry, ...history].slice(0, MAX_HISTORY_ENTRIES);
  await persistSettingsHistory(updated);
  return { entry, history: updated };
};
