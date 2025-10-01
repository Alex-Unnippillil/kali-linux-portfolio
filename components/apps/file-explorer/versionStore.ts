import { getDb } from '../../../utils/safeIDB';

export interface RetentionPolicy {
  maxVersions: number;
  maxDays: number;
}

export interface FileVersionRecord {
  id: string;
  fileKey: string;
  timestamp: number;
  size: number;
  name?: string;
  path?: string;
  storagePath?: string | null;
}

const VERSION_DB = 'file-explorer-history';
const VERSION_STORE = 'versions';
const SETTINGS_STORE = 'settings';
const RETENTION_KEY = 'retention-policy';
const VERSION_DIR = '__versions';
const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = Object.freeze({
  maxVersions: 5,
  maxDays: 30,
});

type MemoryMap = Map<string, FileVersionRecord[]>;
type MemoryContentMap = Map<string, Map<string, string>>;

const memoryVersions: MemoryMap = new Map();
const memoryContents: MemoryContentMap = new Map();
let memoryRetention: RetentionPolicy = { ...DEFAULT_RETENTION_POLICY };

const dbPromise = getDb(VERSION_DB, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(VERSION_STORE)) {
      const store = db.createObjectStore(VERSION_STORE, { keyPath: 'id' });
      store.createIndex('by-file', 'fileKey');
    }
    if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
      db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
    }
  },
});

let versionDirPromise: Promise<FileSystemDirectoryHandle | null> | null = null;

function clonePolicy(policy?: RetentionPolicy | null): RetentionPolicy {
  const base = policy ?? DEFAULT_RETENTION_POLICY;
  const maxVersions = Math.max(1, Math.floor(Number(base.maxVersions) || DEFAULT_RETENTION_POLICY.maxVersions));
  const maxDays = Math.max(0, Math.floor(Number(base.maxDays) ?? DEFAULT_RETENTION_POLICY.maxDays));
  return { maxVersions, maxDays };
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint32Array(4);
    crypto.getRandomValues(arr);
    return Array.from(arr, (n) => n.toString(16).padStart(8, '0')).join('-');
  }
  return `v-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function encodeKey(value: string): string {
  try {
    if (typeof btoa === 'function') return btoa(value).replace(/\//g, '_');
  } catch {}
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64').replace(/\//g, '_');
  }
  return value.replace(/[^a-z0-9_-]+/gi, '_');
}

async function getVersionDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (versionDirPromise) return versionDirPromise;
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
    versionDirPromise = Promise.resolve(null);
    return versionDirPromise;
  }
  versionDirPromise = navigator.storage
    .getDirectory()
    .then((root) => root.getDirectoryHandle(VERSION_DIR, { create: true }))
    .catch(() => null);
  return versionDirPromise;
}

function getMemoryContent(fileKey: string): Map<string, string> {
  if (!memoryContents.has(fileKey)) {
    memoryContents.set(fileKey, new Map());
  }
  return memoryContents.get(fileKey)!;
}

async function writeContent(fileKey: string, versionId: string, data: string): Promise<string | null> {
  const dir = await getVersionDirectory();
  if (!dir) {
    getMemoryContent(fileKey).set(versionId, data);
    return null;
  }
  try {
    const encoded = encodeKey(fileKey);
    const container = await dir.getDirectoryHandle(encoded, { create: true });
    const handle = await container.getFileHandle(`${versionId}.txt`, { create: true });
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
    return `${encoded}/${versionId}.txt`;
  } catch {
    return null;
  }
}

async function removeContent(fileKey: string, versionId: string): Promise<void> {
  const dir = await getVersionDirectory();
  if (!dir) {
    getMemoryContent(fileKey).delete(versionId);
    return;
  }
  try {
    const encoded = encodeKey(fileKey);
    const container = await dir.getDirectoryHandle(encoded);
    await container.removeEntry(`${versionId}.txt`);
  } catch {}
}

async function readContent(fileKey: string, versionId: string): Promise<string | null> {
  const dir = await getVersionDirectory();
  if (!dir) {
    return getMemoryContent(fileKey).get(versionId) ?? null;
  }
  try {
    const encoded = encodeKey(fileKey);
    const container = await dir.getDirectoryHandle(encoded);
    const handle = await container.getFileHandle(`${versionId}.txt`);
    const file = await handle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

async function putRecord(record: FileVersionRecord): Promise<void> {
  const db = await dbPromise;
  if (!db) {
    const list = memoryVersions.get(record.fileKey) ?? [];
    const filtered = list.filter((item) => item.id !== record.id);
    filtered.push(record);
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    memoryVersions.set(record.fileKey, filtered);
    return;
  }
  await db.put(VERSION_STORE, record);
}

export async function recordVersion(
  fileKey: string,
  data: string,
  metadata: { name?: string; path?: string; timestamp?: number } = {},
): Promise<FileVersionRecord> {
  const timestamp = metadata.timestamp ?? Date.now();
  const id = makeId();
  const blob = new Blob([data]);
  const storagePath = await writeContent(fileKey, id, data);
  const record: FileVersionRecord = {
    id,
    fileKey,
    timestamp,
    size: blob.size,
    name: metadata.name,
    path: metadata.path,
    storagePath,
  };
  await putRecord(record);
  return record;
}

export async function listVersions(fileKey: string): Promise<FileVersionRecord[]> {
  const db = await dbPromise;
  if (!db) {
    const list = memoryVersions.get(fileKey) ?? [];
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }
  const tx = db.transaction(VERSION_STORE, 'readonly');
  const index = tx.store.index('by-file');
  const records = (await index.getAll(fileKey)) as FileVersionRecord[];
  records.sort((a, b) => b.timestamp - a.timestamp);
  await tx.done;
  return records;
}

export async function loadVersionContent(record: FileVersionRecord): Promise<string | null> {
  return await readContent(record.fileKey, record.id);
}

export async function deleteVersion(record: FileVersionRecord): Promise<void> {
  const db = await dbPromise;
  if (!db) {
    const list = memoryVersions.get(record.fileKey) ?? [];
    memoryVersions.set(
      record.fileKey,
      list.filter((item) => item.id !== record.id),
    );
  } else {
    await db.delete(VERSION_STORE, record.id);
  }
  await removeContent(record.fileKey, record.id);
}

export async function loadRetentionPolicy(): Promise<RetentionPolicy> {
  const db = await dbPromise;
  if (!db) {
    return clonePolicy(memoryRetention);
  }
  const entry = await db.get(SETTINGS_STORE, RETENTION_KEY);
  return clonePolicy((entry as { value?: RetentionPolicy } | undefined)?.value ?? DEFAULT_RETENTION_POLICY);
}

export async function saveRetentionPolicy(policy: RetentionPolicy): Promise<void> {
  const normalized = clonePolicy(policy);
  const db = await dbPromise;
  if (!db) {
    memoryRetention = normalized;
    return;
  }
  await db.put(SETTINGS_STORE, { key: RETENTION_KEY, value: normalized });
}

export async function enforceRetentionForFile(
  fileKey: string,
  policy: RetentionPolicy = DEFAULT_RETENTION_POLICY,
): Promise<FileVersionRecord[]> {
  const normalized = clonePolicy(policy);
  const history = await listVersions(fileKey);
  const cutoff = normalized.maxDays > 0 ? Date.now() - normalized.maxDays * DAY_MS : 0;
  const toDelete: FileVersionRecord[] = [];
  history.forEach((version, index) => {
    const tooOld = cutoff > 0 && version.timestamp < cutoff;
    if (index >= normalized.maxVersions || tooOld) {
      toDelete.push(version);
    }
  });
  for (const record of toDelete) {
    await deleteVersion(record);
  }
  return await listVersions(fileKey);
}

export async function runGlobalGarbageCollection(policy: RetentionPolicy): Promise<void> {
  const normalized = clonePolicy(policy);
  const db = await dbPromise;
  if (!db) {
    for (const key of memoryVersions.keys()) {
      await enforceRetentionForFile(key, normalized);
    }
    return;
  }
  const all = (await db.getAll(VERSION_STORE)) as FileVersionRecord[];
  const uniqueKeys = new Set(all.map((record) => record.fileKey));
  for (const key of uniqueKeys) {
    await enforceRetentionForFile(key, normalized);
  }
}

export async function resetVersionStoreForTests(): Promise<void> {
  memoryVersions.clear();
  memoryContents.clear();
  memoryRetention = { ...DEFAULT_RETENTION_POLICY };
  versionDirPromise = null;
  const db = await dbPromise;
  if (!db) return;
  const tx = db.transaction([VERSION_STORE, SETTINGS_STORE], 'readwrite');
  await Promise.all([
    tx.objectStore(VERSION_STORE).clear(),
    tx.objectStore(SETTINGS_STORE).clear(),
  ]);
  await tx.done;
}
