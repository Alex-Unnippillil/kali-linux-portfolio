import type { DBSchema, IDBPDatabase } from 'idb';
import shortcuts from '../../data/pwa-shortcuts.json';
import { getDb } from '../../utils/safeIDB';
import { isBrowser } from '../../utils/isBrowser';

const DB_NAME = 'kali-shortcuts';
const STORE_NAME = 'shortcuts';
const MAX_MANIFEST_SHORTCUTS = 4;

type ShortcutDefinition = {
  id: string;
  name: string;
  shortName?: string;
  url: string;
  description?: string;
  icons?: Array<{ src: string; sizes: string; type: string }>;
  defaultPinned?: boolean;
  mruScore?: number;
};

type ManifestShortcut = {
  name: string;
  short_name: string;
  url: string;
  description?: string;
  icons?: Array<{ src: string; sizes: string; type: string }>;
};

export type ShortcutRecord = {
  id: string;
  pinned: boolean;
  lastUsed: number;
  manifest: ManifestShortcut;
  integrity: string;
};

interface ShortcutDB extends DBSchema {
  shortcuts: {
    key: string;
    value: ShortcutRecord;
    indexes: {
      'by-last-used': number;
      'by-pinned': boolean;
    };
  };
}

const definitions: ShortcutDefinition[] = (shortcuts as ShortcutDefinition[]).map((definition) => ({
  ...definition,
  defaultPinned: Boolean(definition.defaultPinned),
  mruScore: typeof definition.mruScore === 'number' ? definition.mruScore : 0,
}));

const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));

let dbPromise: Promise<IDBPDatabase<ShortcutDB> | null> | null = null;

const openShortcutDb = async (): Promise<IDBPDatabase<ShortcutDB> | null> => {
  if (!dbPromise) {
    const raw = getDb<ShortcutDB>(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          });
          store.createIndex('by-last-used', 'lastUsed');
          store.createIndex('by-pinned', 'pinned');
        }
      },
    });
    if (!raw) {
      dbPromise = Promise.resolve(null);
    } else {
      dbPromise = raw.then(async (db) => {
        if (!db) return null;
        await seedDefaultPinned(db);
        return db;
      });
    }
  }

  return dbPromise;
};

const toManifestShortcut = (definition: ShortcutDefinition): ManifestShortcut => ({
  name: definition.name,
  short_name: definition.shortName ?? definition.name,
  url: definition.url,
  description: definition.description,
  icons: definition.icons,
});

const bytesToBase64 = (bytes: Uint8Array): string => {
  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
};

export const computeShortcutIntegrity = async (manifest: ManifestShortcut): Promise<string> => {
  const encoder = new TextEncoder();
  const raw = `${manifest.url}|${manifest.name}|${manifest.short_name}`;
  const payload = encoder.encode(raw);
  const webCrypto: Crypto | undefined =
    (typeof globalThis !== 'undefined' && (globalThis as { crypto?: Crypto }).crypto) || undefined;
  if (webCrypto?.subtle?.digest) {
    const digest = await webCrypto.subtle.digest('SHA-256', payload);
    return `sha256-${bytesToBase64(new Uint8Array(digest))}`;
  }
  return '';
};

const ensureRecord = async (
  db: IDBPDatabase<ShortcutDB>,
  id: string,
  overrides?: Partial<ShortcutRecord>,
): Promise<ShortcutRecord | null> => {
  const existing = await db.transaction(STORE_NAME).store.get(id);
  if (existing) {
    if (overrides) {
      const next = { ...existing, ...overrides };
      const tx = db.transaction(STORE_NAME, 'readwrite');
      await tx.store.put(next);
      await tx.done;
      return next;
    }
    return existing;
  }

  const definition = definitionById.get(id);
  if (!definition) {
    return null;
  }

  const manifest = toManifestShortcut(definition);
  const integrity = await computeShortcutIntegrity(manifest);
  const record: ShortcutRecord = {
    id,
    pinned: overrides?.pinned ?? definition.defaultPinned ?? false,
    lastUsed: overrides?.lastUsed ?? 0,
    manifest,
    integrity,
  };
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.store.put(record);
  await tx.done;
  return record;
};

const seedDefaultPinned = async (db: IDBPDatabase<ShortcutDB>): Promise<void> => {
  const defaults = definitions.filter((definition) => definition.defaultPinned);
  if (!defaults.length) return;

  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const definition of defaults) {
    const existing = await tx.store.get(definition.id);
    if (existing) continue;
    const manifest = toManifestShortcut(definition);
    const integrity = await computeShortcutIntegrity(manifest);
    await tx.store.put({
      id: definition.id,
      pinned: true,
      lastUsed: 0,
      manifest,
      integrity,
    });
  }
  await tx.done;
};

const notifyServiceWorker = () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const sendMessage = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const target = registration?.active ?? navigator.serviceWorker.controller;
      target?.postMessage({ type: 'shortcuts:refresh' });
    } catch {
      // Ignore notification failures
    }
  };

  void sendMessage();
};

const definitionScore = (id: string): number => definitionById.get(id)?.mruScore ?? 0;

const sortShortcuts = (records: ShortcutRecord[]): ShortcutRecord[] =>
  [...records].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    const aScore = a.lastUsed || definitionScore(a.id);
    const bScore = b.lastUsed || definitionScore(b.id);
    return bScore - aScore;
  });

export const recordShortcutUsage = async (id: string): Promise<void> => {
  if (!isBrowser) return;
  const db = await openShortcutDb();
  if (!db) return;
  const existing = await ensureRecord(db, id);
  if (!existing) return;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.store.put({
    ...existing,
    lastUsed: Date.now(),
  });
  await tx.done;
  notifyServiceWorker();
};

export const setShortcutPinned = async (id: string, pinned: boolean): Promise<void> => {
  if (!isBrowser) return;
  const db = await openShortcutDb();
  if (!db) return;
  const record = await ensureRecord(db, id);
  if (!record) return;
  if (record.pinned === pinned) {
    notifyServiceWorker();
    return;
  }
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.store.put({
    ...record,
    pinned,
  });
  await tx.done;
  notifyServiceWorker();
};

export const getShortcutCandidates = async (): Promise<ShortcutRecord[]> => {
  const db = await openShortcutDb();
  if (!db) {
    const fallbacks: ShortcutRecord[] = [];
    for (const definition of definitions) {
      const manifest = toManifestShortcut(definition);
      const integrity = await computeShortcutIntegrity(manifest);
      fallbacks.push({
        id: definition.id,
        pinned: definition.defaultPinned ?? false,
        lastUsed: 0,
        manifest,
        integrity,
      });
    }
    return sortShortcuts(fallbacks);
  }

  const tx = db.transaction(STORE_NAME, 'readonly');
  const stored = await tx.store.getAll();
  await tx.done;

  const mapped = new Map(stored.map((record) => [record.id, record]));
  const merged: ShortcutRecord[] = [];
  for (const definition of definitions) {
    const existing = mapped.get(definition.id);
    if (existing) {
      merged.push(existing);
    } else {
      const manifest = toManifestShortcut(definition);
      const integrity = await computeShortcutIntegrity(manifest);
      merged.push({
        id: definition.id,
        pinned: definition.defaultPinned ?? false,
        lastUsed: 0,
        manifest,
        integrity,
      });
    }
  }
  return sortShortcuts(merged);
};

export const getTopShortcuts = async (
  limit = MAX_MANIFEST_SHORTCUTS,
): Promise<ShortcutRecord[]> => {
  const candidates = await getShortcutCandidates();
  return candidates.slice(0, limit);
};

export const clearShortcutDataForTests = async (): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      dbPromise = null;
      resolve();
    };
    request.onerror = () => {
      dbPromise = null;
      resolve();
    };
    request.onblocked = () => {
      resolve();
    };
  });
};
