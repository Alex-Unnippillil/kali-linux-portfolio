import { defaults } from './settingsStore';

export type SettingsDensity = 'regular' | 'compact';

export type SettingsPayload = {
  accent: string;
  wallpaper: string;
  density: SettingsDensity;
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
  theme: string;
};

export type SettingsSnapshot = {
  data: SettingsPayload;
  version: number;
  updatedAt: number;
};

export type SyncStrategy = 'last-write-wins' | 'manual';

export type SettingsMergeOptionId = 'keep-local' | 'use-remote' | 'merge';

export type SettingsMergeOption = {
  id: SettingsMergeOptionId;
  label: string;
  description: string;
  data: SettingsPayload;
};

export type SettingsConflict = {
  type: 'version-mismatch';
  local: SettingsPayload;
  remote: SettingsSnapshot;
  base: SettingsSnapshot;
  conflictingKeys: (keyof SettingsPayload)[];
  options: SettingsMergeOption[];
};

export type SaveOptions = {
  strategy: SyncStrategy;
  baseSnapshot: SettingsSnapshot;
};

export type SaveResult =
  | {
      ok: true;
      snapshot: SettingsSnapshot;
      overwritten: boolean;
      previousVersion: number;
    }
  | {
      ok: false;
      conflict: SettingsConflict;
    };

type RemoteRecord = SettingsSnapshot;

const DEFAULT_REMOTE_STATE: SettingsPayload = {
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  density: defaults.density as SettingsDensity,
  reducedMotion: defaults.reducedMotion,
  fontScale: defaults.fontScale,
  highContrast: defaults.highContrast,
  largeHitAreas: defaults.largeHitAreas,
  pongSpin: defaults.pongSpin,
  allowNetwork: defaults.allowNetwork,
  haptics: defaults.haptics,
  theme: 'default',
};

let remoteState: RemoteRecord = {
  data: { ...DEFAULT_REMOTE_STATE },
  version: 0,
  updatedAt: Date.now(),
};

const listeners = new Set<(snapshot: SettingsSnapshot) => void>();

const cloneSnapshot = (snapshot: SettingsSnapshot): SettingsSnapshot => ({
  data: { ...snapshot.data },
  version: snapshot.version,
  updatedAt: snapshot.updatedAt,
});

const notify = (): void => {
  const snapshot = cloneSnapshot(remoteState);
  listeners.forEach((listener) => listener(snapshot));
};

const simulateLatency = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 5));
};

const diffKeys = (
  base: SettingsPayload,
  next: SettingsPayload,
): (keyof SettingsPayload)[] => {
  const keys = Object.keys(base) as (keyof SettingsPayload)[];
  return keys.filter((key) => base[key] !== next[key]);
};

const buildMergedPayload = (
  base: SettingsPayload,
  remote: SettingsPayload,
  local: SettingsPayload,
): {
  merged: SettingsPayload;
  conflictingKeys: (keyof SettingsPayload)[];
} => {
  const localChanges = diffKeys(base, local);
  const remoteChanges = diffKeys(base, remote);
  const conflictingKeys = Array.from(
    new Set(
      localChanges.filter(
        (key) =>
          remoteChanges.includes(key) &&
          remote[key] !== local[key],
      ),
    ),
  );

  const merged: SettingsPayload = { ...remote };

  localChanges.forEach((key) => {
    if (!remoteChanges.includes(key)) {
      merged[key] = local[key];
    }
  });

  return { merged, conflictingKeys };
};

const createConflict = (
  local: SettingsPayload,
  remote: SettingsSnapshot,
  base: SettingsSnapshot,
): SettingsConflict => {
  const { merged, conflictingKeys } = buildMergedPayload(
    base.data,
    remote.data,
    local,
  );

  const options: SettingsMergeOption[] = [
    {
      id: 'keep-local',
      label: 'Use local changes',
      description: 'Overwrite remote settings with your version.',
      data: { ...local },
    },
    {
      id: 'use-remote',
      label: 'Keep remote version',
      description: 'Discard local edits and keep the remote settings.',
      data: { ...remote.data },
    },
  ];

  options.push({
    id: 'merge',
    label: 'Merge safely',
    description:
      conflictingKeys.length > 0
        ? 'Keep remote values for conflicting settings and apply the rest of your edits.'
        : 'Apply your changes on top of the remote settings.',
    data: merged,
  });

  return {
    type: 'version-mismatch',
    local: { ...local },
    remote: cloneSnapshot(remote),
    base: cloneSnapshot(base),
    conflictingKeys,
    options,
  };
};

export const loadSettings = async (): Promise<SettingsSnapshot> => {
  await simulateLatency();
  return cloneSnapshot(remoteState);
};

export const saveSettings = async (
  data: SettingsPayload,
  options: SaveOptions,
): Promise<SaveResult> => {
  await simulateLatency();
  const { baseSnapshot, strategy } = options;
  const versionsMatch = baseSnapshot.version === remoteState.version;

  if (versionsMatch || strategy === 'last-write-wins') {
    const previousVersion = remoteState.version;
    const nextVersion = previousVersion + 1;
    remoteState = {
      data: { ...data },
      version: nextVersion,
      updatedAt: Date.now(),
    };
    notify();
    return {
      ok: true,
      snapshot: cloneSnapshot(remoteState),
      overwritten: !versionsMatch,
      previousVersion,
    };
  }

  const conflict = createConflict(data, remoteState, baseSnapshot);
  return { ok: false, conflict };
};

export const subscribeToRemote = (
  listener: (snapshot: SettingsSnapshot) => void,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const resolveConflictSelection = (
  conflict: SettingsConflict,
  optionId: SettingsMergeOptionId,
  overrides?: Partial<SettingsPayload>,
): SettingsPayload => {
  const option = conflict.options.find((candidate) => candidate.id === optionId);
  if (!option) {
    throw new Error(`Unknown merge option: ${optionId}`);
  }
  return {
    ...option.data,
    ...overrides,
  };
};

export const resetRemoteState = (snapshot?: SettingsSnapshot): void => {
  remoteState = snapshot
    ? {
        data: { ...snapshot.data },
        version: snapshot.version,
        updatedAt: snapshot.updatedAt,
      }
    : {
        data: { ...DEFAULT_REMOTE_STATE },
        version: 0,
        updatedAt: Date.now(),
      };
};

const settingsSync = {
  load: loadSettings,
  save: saveSettings,
  subscribe: subscribeToRemote,
  resolve: resolveConflictSelection,
  reset: resetRemoteState,
};

export type SettingsSyncAdapter = typeof settingsSync;

export default settingsSync;
