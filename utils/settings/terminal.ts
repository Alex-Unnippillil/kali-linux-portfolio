import { safeLocalStorage } from '../safeStorage';

export type CommandRestoreBehavior = 'prompt' | 'always' | 'never';

export interface TerminalProfileSettings {
  persistSessions: boolean;
  restoreBehavior: CommandRestoreBehavior;
  snapshotIntervalMs: number;
}

const DEFAULT_SETTINGS: TerminalProfileSettings = {
  persistSessions: true,
  restoreBehavior: 'prompt',
  snapshotIntervalMs: 15000,
};

const STORAGE_PREFIX = 'terminal:settings:';

function storageKey(profileId: string) {
  return `${STORAGE_PREFIX}${profileId}`;
}

function mergeSettings(
  base: TerminalProfileSettings,
  overrides?: Partial<TerminalProfileSettings> | null,
): TerminalProfileSettings {
  if (!overrides) return base;
  const merged: TerminalProfileSettings = {
    persistSessions:
      typeof overrides.persistSessions === 'boolean'
        ? overrides.persistSessions
        : base.persistSessions,
    restoreBehavior:
      overrides.restoreBehavior === 'always' ||
      overrides.restoreBehavior === 'never' ||
      overrides.restoreBehavior === 'prompt'
        ? overrides.restoreBehavior
        : base.restoreBehavior,
    snapshotIntervalMs:
      typeof overrides.snapshotIntervalMs === 'number' &&
      Number.isFinite(overrides.snapshotIntervalMs) &&
      overrides.snapshotIntervalMs > 0
        ? overrides.snapshotIntervalMs
        : base.snapshotIntervalMs,
  };
  return merged;
}

export function getTerminalSettings(
  profileId = 'default',
): TerminalProfileSettings {
  if (!safeLocalStorage) return { ...DEFAULT_SETTINGS };
  try {
    const raw = safeLocalStorage.getItem(storageKey(profileId));
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return mergeSettings({ ...DEFAULT_SETTINGS }, parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function updateTerminalSettings(
  profileId: string,
  patch: Partial<TerminalProfileSettings>,
): TerminalProfileSettings {
  const next = mergeSettings(getTerminalSettings(profileId), patch);
  if (safeLocalStorage) {
    try {
      safeLocalStorage.setItem(storageKey(profileId), JSON.stringify(next));
    } catch {
      // ignore storage write failures
    }
  }
  return next;
}

export function setTerminalPersistence(
  profileId: string,
  enabled: boolean,
): TerminalProfileSettings {
  return updateTerminalSettings(profileId, { persistSessions: enabled });
}

export function isTerminalPersistenceEnabled(profileId = 'default') {
  return getTerminalSettings(profileId).persistSessions;
}

export function getRestoreBehavior(
  profileId = 'default',
): CommandRestoreBehavior {
  return getTerminalSettings(profileId).restoreBehavior;
}

export function setRestoreBehavior(
  profileId: string,
  behavior: CommandRestoreBehavior,
) {
  return updateTerminalSettings(profileId, { restoreBehavior: behavior });
}

export function getSnapshotInterval(profileId = 'default') {
  return getTerminalSettings(profileId).snapshotIntervalMs;
}

export function setSnapshotInterval(
  profileId: string,
  intervalMs: number,
) {
  return updateTerminalSettings(profileId, { snapshotIntervalMs: intervalMs });
}

export function resetTerminalSettings(profileId = 'default') {
  if (safeLocalStorage) {
    try {
      safeLocalStorage.removeItem(storageKey(profileId));
    } catch {
      // ignore
    }
  }
  return { ...DEFAULT_SETTINGS };
}

export { DEFAULT_SETTINGS as DEFAULT_TERMINAL_SETTINGS };
