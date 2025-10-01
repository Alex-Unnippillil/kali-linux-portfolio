import { hasStorage } from '../env';

export type StoreName = 'settings' | 'history';

export const MIGRATION_TARGETS: Record<StoreName, number> = {
  settings: 1,
  history: 0,
};

export const VERSION_STORAGE_KEYS: Record<StoreName, string> = {
  settings: 'settings-schema-version',
  history: 'history-schema-version',
};

export const BACKUP_STORAGE_KEYS: Record<StoreName, string> = {
  settings: 'settings-backup',
  history: 'history-backup',
};

export interface BackupPayload<TSnapshot> {
  version: number;
  createdAt: number;
  data: TSnapshot;
}

export interface MigrationContext<TSnapshot> {
  store: StoreName;
  dryRun: boolean;
  fromVersion: number;
  toVersion: number;
  createSnapshot: () => Promise<TSnapshot>;
  applySnapshot: (snapshot: TSnapshot) => Promise<void>;
}

export interface MigrationStep<TSnapshot> {
  version: number;
  description?: string;
  migrate: (context: MigrationContext<TSnapshot>) => Promise<void> | void;
}

export interface RunMigrationOptions<TSnapshot> {
  store: StoreName;
  currentVersion: number;
  targetVersion: number;
  steps: MigrationStep<TSnapshot>[];
  createSnapshot: () => Promise<TSnapshot>;
  applySnapshot: (snapshot: TSnapshot) => Promise<void>;
  dryRun?: boolean;
  onStepStart?: (step: MigrationStep<TSnapshot>) => Promise<void> | void;
  onStepComplete?: (step: MigrationStep<TSnapshot>) => Promise<void> | void;
}

const isBrowserEnvironment = (): boolean => typeof window !== 'undefined' && hasStorage;

export const DEFAULT_START_VERSION = 0;

export function getSchemaVersion(store: StoreName): number {
  if (!isBrowserEnvironment()) return MIGRATION_TARGETS[store];
  const raw = window.localStorage.getItem(VERSION_STORAGE_KEYS[store]);
  if (raw === null) return DEFAULT_START_VERSION;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid schema version for ${store}`);
  }
  return parsed;
}

export function setSchemaVersion(store: StoreName, version: number): void {
  if (!isBrowserEnvironment()) return;
  window.localStorage.setItem(
    VERSION_STORAGE_KEYS[store],
    Number.isFinite(version) ? String(version) : String(MIGRATION_TARGETS[store]),
  );
}

export function clearSchemaVersion(store: StoreName): void {
  if (!isBrowserEnvironment()) return;
  window.localStorage.removeItem(VERSION_STORAGE_KEYS[store]);
}

export async function saveBackupSnapshot<TSnapshot>(
  store: StoreName,
  payload: BackupPayload<TSnapshot>,
): Promise<void> {
  if (!isBrowserEnvironment()) return;
  window.localStorage.setItem(
    BACKUP_STORAGE_KEYS[store],
    JSON.stringify(payload),
  );
}

export function readBackupSnapshot<TSnapshot>(
  store: StoreName,
): BackupPayload<TSnapshot> | null {
  if (!isBrowserEnvironment()) return null;
  const raw = window.localStorage.getItem(BACKUP_STORAGE_KEYS[store]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BackupPayload<TSnapshot>;
  } catch (error) {
    console.warn(`Failed to parse backup for ${store}`, error);
    return null;
  }
}

export function clearBackup(store: StoreName): void {
  if (!isBrowserEnvironment()) return;
  window.localStorage.removeItem(BACKUP_STORAGE_KEYS[store]);
}

export async function restoreBackup<TSnapshot>(
  store: StoreName,
  applySnapshot: (snapshot: TSnapshot) => Promise<void>,
): Promise<BackupPayload<TSnapshot> | null> {
  const payload = readBackupSnapshot<TSnapshot>(store);
  if (!payload) return null;
  await applySnapshot(payload.data);
  return payload;
}

export async function runMigrations<TSnapshot>({
  store,
  currentVersion,
  targetVersion,
  steps,
  createSnapshot,
  applySnapshot,
  dryRun = false,
  onStepStart,
  onStepComplete,
}: RunMigrationOptions<TSnapshot>): Promise<number> {
  if (currentVersion >= targetVersion) return currentVersion;

  const queue = steps
    .filter((step) => step.version > currentVersion && step.version <= targetVersion)
    .sort((a, b) => a.version - b.version);

  if (!dryRun && isBrowserEnvironment()) {
    const initialSnapshot = await createSnapshot();
    await saveBackupSnapshot(store, {
      version: currentVersion,
      createdAt: Date.now(),
      data: initialSnapshot,
    });
  }

  let workingVersion = currentVersion;
  for (const step of queue) {
    await onStepStart?.(step);
    await step.migrate({
      store,
      dryRun,
      fromVersion: workingVersion,
      toVersion: step.version,
      createSnapshot,
      applySnapshot,
    });
    workingVersion = step.version;
    await onStepComplete?.(step);
  }

  if (!dryRun && isBrowserEnvironment()) {
    const snapshot = await createSnapshot();
    await saveBackupSnapshot(store, {
      version: targetVersion,
      createdAt: Date.now(),
      data: snapshot,
    });
    setSchemaVersion(store, targetVersion);
  }

  return queue.length ? queue[queue.length - 1].version : targetVersion;
}

export interface DryRunResult<TSnapshot> {
  finalVersion: number;
  snapshot: TSnapshot;
}

export async function simulateMigrations<TSnapshot>({
  store,
  currentVersion,
  targetVersion,
  steps,
  createSnapshot,
  applySnapshot,
}: RunMigrationOptions<TSnapshot>): Promise<DryRunResult<TSnapshot>> {
  const snapshot = await createSnapshot();
  const clone = JSON.parse(JSON.stringify(snapshot)) as TSnapshot;
  let version = currentVersion;

  const queue = steps
    .filter((step) => step.version > currentVersion && step.version <= targetVersion)
    .sort((a, b) => a.version - b.version);

  for (const step of queue) {
    await step.migrate({
      store,
      dryRun: true,
      fromVersion: version,
      toVersion: step.version,
      createSnapshot: async () => clone,
      applySnapshot: async (snapshotUpdate) => {
        const base = clone as Record<string, unknown>;
        const updates = snapshotUpdate as Record<string, unknown>;
        Object.keys(updates).forEach((key) => {
          base[key] = updates[key];
        });
      },
    });
    version = step.version;
  }

  return {
    finalVersion: queue.length ? queue[queue.length - 1].version : currentVersion,
    snapshot: clone,
  };
}
