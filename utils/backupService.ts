import { exportSettings, importSettings } from './settingsStore';
import {
  getProgress,
  setProgress,
  getKeybinds,
  setKeybinds,
  getReplays,
  setReplays,
  ProgressData,
  Keybinds,
  Replay,
} from './storage';
import { BackupBuckets } from './backupMerge';

const clone = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = clone(nested);
    }
    return result as T;
  }
  return value;
};

const normalizeSettings = (json: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

export const getLocalBackupBuckets = async (): Promise<BackupBuckets> => {
  const [settingsJson, progress, keybinds, replays] = await Promise.all([
    exportSettings(),
    getProgress(),
    getKeybinds(),
    getReplays(),
  ]);

  return {
    settings: normalizeSettings(settingsJson),
    progress: clone(progress) as ProgressData,
    keybinds: clone(keybinds) as Keybinds,
    replays: clone(replays) as Replay[],
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const applyBackupBuckets = async (buckets: BackupBuckets): Promise<void> => {
  const tasks: Promise<void>[] = [];

  if ('settings' in buckets && isRecord(buckets.settings)) {
    tasks.push(importSettings(JSON.stringify(buckets.settings)));
  }

  if ('progress' in buckets && isRecord(buckets.progress)) {
    tasks.push(setProgress(buckets.progress as ProgressData));
  }

  if ('keybinds' in buckets && isRecord(buckets.keybinds)) {
    tasks.push(setKeybinds(buckets.keybinds as Keybinds));
  }

  if ('replays' in buckets && Array.isArray(buckets.replays)) {
    tasks.push(setReplays(buckets.replays as Replay[]));
  }

  await Promise.all(tasks);
};

