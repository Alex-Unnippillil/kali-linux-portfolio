import 'fake-indexeddb/auto';

// Provide a lightweight structuredClone polyfill for fake-indexeddb environments.
// @ts-ignore
if (typeof globalThis.structuredClone !== 'function') {
  // @ts-ignore
  globalThis.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

import { deleteDB } from 'idb';
import { del, get, set } from 'idb-keyval';
import {
  KEYBINDS_PRIMARY_KEY,
  LEGACY_KEYBINDS_KEY,
  LEGACY_PROGRESS_KEY,
  LEGACY_REPLAYS_KEY,
  PROGRESS_PRIMARY_KEY,
  STORAGE_DB_NAME,
  STORE_KEYBINDS,
  STORE_PROGRESS,
  STORE_REPLAYS,
  createStorageDatabase,
  storageDb,
} from '@/lib/storage/storageDb';
import { getKeybinds, getProgress, getReplays } from '@/utils/storage';
import type { Keybinds, ProgressData, Replay } from '@/types/storage';

const resetDatabases = async () => {
  await storageDb.close();
  await deleteDB(STORAGE_DB_NAME).catch(() => undefined);
  await Promise.all([
    del(LEGACY_PROGRESS_KEY).catch(() => undefined),
    del(LEGACY_KEYBINDS_KEY).catch(() => undefined),
    del(LEGACY_REPLAYS_KEY).catch(() => undefined),
  ]);
};

const seedLegacyStore = async (
  progress: ProgressData | null,
  keybinds: Keybinds | null,
  replays: Replay[] | null,
) => {
  const tasks: Promise<unknown>[] = [];
  if (progress) tasks.push(set(LEGACY_PROGRESS_KEY, progress));
  if (keybinds) tasks.push(set(LEGACY_KEYBINDS_KEY, keybinds));
  if (replays) tasks.push(set(LEGACY_REPLAYS_KEY, replays));
  await Promise.all(tasks);
};

describe('storage migrations', () => {
  beforeEach(async () => {
    await resetDatabases();
  });

  afterEach(async () => {
    await resetDatabases();
  });

  test('migrates legacy keyval-store data into typed stores', async () => {
    await seedLegacyStore(
      { mission: 'alpha' },
      { jump: 'Space' },
      [
        { id: 'r1', data: { score: 10 } },
        { id: 'r2', data: { score: 25 }, createdAt: 5 },
      ],
    );

    expect(await get(LEGACY_PROGRESS_KEY)).toEqual({ mission: 'alpha' });

    const progress = await getProgress();
    expect(progress).toEqual({ mission: 'alpha' });

    const db = await storageDb.getDbInstance();
    if (!db) throw new Error('storage database unavailable');
    const tx = db.transaction(STORE_PROGRESS, 'readonly');
    const storedProgress = await tx.store.get(PROGRESS_PRIMARY_KEY);
    expect(storedProgress).toEqual({ mission: 'alpha' });

    const keybinds = await getKeybinds();
    expect(keybinds).toEqual({ jump: 'Space' });

    const replays = await getReplays();
    expect(replays).toHaveLength(2);
    expect(replays.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
    expect(replays.every((r) => typeof r.createdAt === 'number')).toBe(true);

    expect(await get(LEGACY_PROGRESS_KEY)).toBeUndefined();
    expect(await get(LEGACY_KEYBINDS_KEY)).toBeUndefined();
    expect(await get(LEGACY_REPLAYS_KEY)).toBeUndefined();
  });

  test('preserves existing data when upgrading the storage schema', async () => {
    const versionOneDb = createStorageDatabase(1);
    await versionOneDb.put(STORE_PROGRESS, { stage: 4 }, PROGRESS_PRIMARY_KEY);
    await versionOneDb.put(STORE_KEYBINDS, { fire: 'F' }, KEYBINDS_PRIMARY_KEY);
    await versionOneDb.put(STORE_REPLAYS, { id: 'r-one', data: { moves: 12 }, createdAt: 1234 });
    await versionOneDb.close();

    const progress = await getProgress();
    expect(progress).toEqual({ stage: 4 });

    const keybinds = await getKeybinds();
    expect(keybinds).toEqual({ fire: 'F' });

    const replays = await getReplays();
    expect(replays).toEqual([
      { id: 'r-one', data: { moves: 12 }, createdAt: 1234 },
    ]);
  });
});
