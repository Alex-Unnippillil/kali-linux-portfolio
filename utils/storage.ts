"use client";

import {
  KEYBINDS_PRIMARY_KEY,
  LEGACY_KEYBINDS_KEY,
  LEGACY_PROGRESS_KEY,
  LEGACY_REPLAYS_KEY,
  PROGRESS_PRIMARY_KEY,
  STORE_KEYBINDS,
  STORE_PROGRESS,
  STORE_REPLAYS,
  storageDb,
} from '@/lib/storage/storageDb';
import type { Keybinds, ProgressData, Replay } from '@/types/storage';
import { del as keyvalDel, get as keyvalGet } from 'idb-keyval';

export type { Keybinds, ProgressData, Replay } from '@/types/storage';

const sortReplays = (replays: Replay[]): Replay[] =>
  replays
    .map((entry) => ({ ...entry, createdAt: entry.createdAt ?? 0 }))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

const withTimestamp = (replay: Replay): Replay => ({
  ...replay,
  createdAt: replay.createdAt ?? Date.now(),
});

let legacyMigration: Promise<void> | null = null;

type LegacySnapshot = {
  progress?: ProgressData;
  keybinds?: Keybinds;
  replays?: Replay[];
};

type MigrationNeeds = {
  needsProgress: boolean;
  needsKeybinds: boolean;
  needsReplays: boolean;
};

const loadLegacySnapshot = async (): Promise<LegacySnapshot> => {
  const [legacyProgress, legacyKeybinds, legacyReplays] = await Promise.all([
    keyvalGet<ProgressData | undefined>(LEGACY_PROGRESS_KEY).catch(() => undefined),
    keyvalGet<Keybinds | undefined>(LEGACY_KEYBINDS_KEY).catch(() => undefined),
    keyvalGet<Replay[] | undefined>(LEGACY_REPLAYS_KEY).catch(() => undefined),
  ]);

  return {
    progress: legacyProgress ?? undefined,
    keybinds: legacyKeybinds ?? undefined,
    replays: Array.isArray(legacyReplays) ? legacyReplays : undefined,
  };
};

const hasLegacyData = (snapshot: LegacySnapshot): boolean =>
  Boolean(snapshot.progress) ||
  Boolean(snapshot.keybinds) ||
  (Array.isArray(snapshot.replays) && snapshot.replays.length > 0);

const clearLegacyEntries = async (): Promise<void> => {
  await Promise.all([
    keyvalDel(LEGACY_PROGRESS_KEY).catch(() => undefined),
    keyvalDel(LEGACY_KEYBINDS_KEY).catch(() => undefined),
    keyvalDel(LEGACY_REPLAYS_KEY).catch(() => undefined),
  ]);
};

const getMigrationNeeds = async (): Promise<MigrationNeeds | undefined> =>
  storageDb.transaction(
    [STORE_PROGRESS, STORE_KEYBINDS, STORE_REPLAYS],
    'readonly',
    async (tx) => {
      const progressStore = tx.objectStore(STORE_PROGRESS);
      const keybindsStore = tx.objectStore(STORE_KEYBINDS);
      const replaysStore = tx.objectStore(STORE_REPLAYS);
      const [existingProgress, existingKeybinds, existingReplayCount] = await Promise.all([
        progressStore.get(PROGRESS_PRIMARY_KEY),
        keybindsStore.get(KEYBINDS_PRIMARY_KEY),
        replaysStore.count(),
      ]);

      return {
        needsProgress: !existingProgress,
        needsKeybinds: !existingKeybinds,
        needsReplays: existingReplayCount === 0,
      };
    },
  );

const runLegacyMigration = async (): Promise<void> => {
  if (!storageDb.isSupported()) return;

  const needs = await getMigrationNeeds();
  if (!needs) return;

  if (!needs.needsProgress && !needs.needsKeybinds && !needs.needsReplays) {
    await clearLegacyEntries();
    return;
  }

  const snapshot = await loadLegacySnapshot();
  if (!hasLegacyData(snapshot)) {
    await clearLegacyEntries();
    return;
  }

  await storageDb.transaction(
    [STORE_PROGRESS, STORE_KEYBINDS, STORE_REPLAYS],
    'readwrite',
    async (tx) => {
      const progressStore = tx.objectStore(STORE_PROGRESS);
      if (snapshot.progress && !(await progressStore.get(PROGRESS_PRIMARY_KEY))) {
        await progressStore.put(snapshot.progress, PROGRESS_PRIMARY_KEY);
      }

      const keybindsStore = tx.objectStore(STORE_KEYBINDS);
      if (snapshot.keybinds && !(await keybindsStore.get(KEYBINDS_PRIMARY_KEY))) {
        await keybindsStore.put(snapshot.keybinds, KEYBINDS_PRIMARY_KEY);
      }

      const replaysStore = tx.objectStore(STORE_REPLAYS);
      const hasExistingReplays = (await replaysStore.count()) > 0;
      if (Array.isArray(snapshot.replays) && !hasExistingReplays) {
        let timestamp = Date.now();
        for (const replay of snapshot.replays) {
          if (!replay || typeof replay.id !== 'string') continue;
          const entry: Replay = {
            ...replay,
            createdAt: replay.createdAt ?? timestamp++,
          };
          await replaysStore.put(entry);
        }
      }
    },
  );

  await clearLegacyEntries();
};

const ensureLegacyMigrated = async (): Promise<void> => {
  if (!legacyMigration) {
    const pending = runLegacyMigration();
    legacyMigration = pending.catch((error) => {
      legacyMigration = null;
      throw error;
    });
  }

  try {
    await legacyMigration;
  } catch {
    // Ignore migration failures and allow callers to proceed with best-effort storage.
  }
};

export const getProgress = async (): Promise<ProgressData> => {
  await ensureLegacyMigrated();
  const progress = await storageDb.get(STORE_PROGRESS, PROGRESS_PRIMARY_KEY);
  return progress ?? {};
};

export const setProgress = async (progress: ProgressData): Promise<void> => {
  await storageDb.put(STORE_PROGRESS, progress, PROGRESS_PRIMARY_KEY);
};

export const getKeybinds = async (): Promise<Keybinds> => {
  await ensureLegacyMigrated();
  const keybinds = await storageDb.get(STORE_KEYBINDS, KEYBINDS_PRIMARY_KEY);
  return keybinds ?? {};
};

export const setKeybinds = async (keybinds: Keybinds): Promise<void> => {
  await storageDb.put(STORE_KEYBINDS, keybinds, KEYBINDS_PRIMARY_KEY);
};

export const getReplays = async (): Promise<Replay[]> => {
  await ensureLegacyMigrated();
  const replays = await storageDb.getAll(STORE_REPLAYS);
  return sortReplays(replays);
};

export const saveReplay = async (replay: Replay): Promise<void> => {
  const entry = withTimestamp(replay);
  await storageDb.transaction([STORE_REPLAYS], 'readwrite', async (tx) => {
    const store = tx.objectStore(STORE_REPLAYS);
    await store.put(entry);
  });
};

export const clearReplays = async (): Promise<void> => {
  await storageDb.clear(STORE_REPLAYS);
};

const storage = {
  getProgress,
  setProgress,
  getKeybinds,
  setKeybinds,
  getReplays,
  saveReplay,
  clearReplays,
};

export default storage;
