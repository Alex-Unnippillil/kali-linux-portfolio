import { openDB, type IDBPDatabase } from 'idb';
import { hasIndexedDB, isBrowser } from './isBrowser';

export const CACHE_DB_NAME = 'kali-cache-store';
export const CACHE_DB_VERSION = 1;
const STORE_ENTRIES = 'entries';
const STORE_ALIASES = 'aliases';
export const CACHE_DATA_STORE = 'data';
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

type ValueType = 'json' | 'text' | 'blob';
export type CacheEvictionReason = 'capacity' | 'ttl' | 'manual' | 'corruption';

export interface CacheEntryRecord {
  hash: string;
  size: number;
  storedAt: number;
  accessedAt: number;
  expiresAt: number | null;
  type: ValueType;
  contentType?: string;
  storage: 'opfs' | 'idb';
}

interface AliasRecord {
  alias: string;
  hash: string;
  updatedAt: number;
}

interface PreparedValue {
  type: ValueType;
  rawData: Blob | string;
  bytes: ArrayBuffer;
  size: number;
  contentType?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  corruptions: number;
  hitRatio: number;
  entries: number;
  totalBytes: number;
  maxBytes: number;
}

export interface CacheRememberResult<T> {
  data: T;
  hash: string;
  meta: CacheEntryRecord;
  status: 'hit' | 'miss';
}

export type CacheEvent =
  | { type: 'stats'; stats: CacheStats }
  | { type: 'evict'; record: CacheEntryRecord; reason: CacheEvictionReason };

export interface CacheRememberOptions {
  ttlMs?: number;
  signal?: AbortSignal;
}

interface CacheStoreOptions {
  maxBytes: number;
  defaultTtlMs: number;
}

const textEncoder = () => {
  if (encoder) return encoder;
  throw new Error('TextEncoder is not available in this environment');
};

async function computeHash(bytes: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  if (typeof process !== 'undefined' && process.versions?.node) {
    const { createHash } = await import('crypto');
    return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
  }
  // Fallback: simple non-cryptographic hash
  let hash = 0;
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) {
    hash = (hash * 31 + view[i]) >>> 0;
  }
  return hash.toString(16);
}

const now = () => Date.now();

class Mutex {
  private current: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.current;
    let release: () => void;
    this.current = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

class CacheStore {
  private options: CacheStoreOptions = {
    maxBytes: DEFAULT_MAX_BYTES,
    defaultTtlMs: DEFAULT_TTL_MS,
  };

  private hits = 0;

  private misses = 0;

  private evictions = 0;

  private corruptions = 0;

  private totalBytes = 0;

  private entries = new Map<string, CacheEntryRecord>();

  private aliases = new Map<string, string>();

  private refCounts = new Map<string, number>();

  private listeners = new Set<(event: CacheEvent) => void>();

  private dbPromise: Promise<IDBPDatabase> | null = null;

  private initPromise: Promise<void> | null = null;

  private opfsDirPromise: Promise<FileSystemDirectoryHandle | null> | null = null;

  private useOpfs = false;

  private mutex = new Mutex();

  private lastStatsSignature = '';

  private memoryOnly = !hasIndexedDB;

  private memoryEntries = new Map<string, {
    alias: string;
    value: unknown;
    meta: CacheEntryRecord;
  }>();

  private memoryOrder: string[] = [];

  private throwIfAborted(signal?: AbortSignal) {
    if (!signal?.aborted) return;
    if (typeof DOMException !== 'undefined') {
      throw new DOMException('Aborted', 'AbortError');
    }
    const err = new Error('Aborted');
    (err as any).name = 'AbortError';
    throw err;
  }

  private canPersist() {
    return !this.memoryOnly;
  }

  private async getDb(): Promise<IDBPDatabase | null> {
    if (!this.canPersist()) return null;
    if (!this.dbPromise) {
      this.dbPromise = openDB(CACHE_DB_NAME, CACHE_DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
            db.createObjectStore(STORE_ENTRIES, { keyPath: 'hash' });
          }
          if (!db.objectStoreNames.contains(STORE_ALIASES)) {
            const store = db.createObjectStore(STORE_ALIASES, { keyPath: 'alias' });
            store.createIndex('hash', 'hash', { unique: false });
          }
          if (!db.objectStoreNames.contains(CACHE_DATA_STORE)) {
            db.createObjectStore(CACHE_DATA_STORE, { keyPath: 'hash' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  private async ensureInitialized() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      if (!this.canPersist()) return;
      const db = await this.getDb();
      if (!db) return;
      const tx = db.transaction([STORE_ENTRIES, STORE_ALIASES], 'readonly');
      const entryStore = tx.objectStore(STORE_ENTRIES);
      const aliasStore = tx.objectStore(STORE_ALIASES);
      const [storedEntries, storedAliases] = await Promise.all([
        entryStore.getAll(),
        aliasStore.getAll(),
      ]);
      this.entries.clear();
      this.aliases.clear();
      this.refCounts.clear();
      this.totalBytes = 0;
      storedEntries.forEach((entry) => {
        this.entries.set(entry.hash, entry);
        this.totalBytes += entry.size;
      });
      storedAliases.forEach((alias: AliasRecord) => {
        this.aliases.set(alias.alias, alias.hash);
        this.refCounts.set(
          alias.hash,
          (this.refCounts.get(alias.hash) ?? 0) + 1,
        );
      });
      await this.ensureOpfs();
    })();
    return this.initPromise;
  }

  private async ensureOpfs(): Promise<FileSystemDirectoryHandle | null> {
    if (!isBrowser) return null;
    if (!('storage' in navigator) || typeof navigator.storage?.getDirectory !== 'function') {
      return null;
    }
    if (!this.opfsDirPromise) {
      this.opfsDirPromise = (async () => {
        try {
          const root = await navigator.storage.getDirectory();
          const cacheDir = await root.getDirectoryHandle('kali-cache', {
            create: true,
          });
          const entryDir = await cacheDir.getDirectoryHandle('entries', {
            create: true,
          });
          this.useOpfs = true;
          return entryDir;
        } catch (err) {
          console.warn('[cacheStore] OPFS unavailable, falling back to IndexedDB', err);
          this.useOpfs = false;
          return null;
        }
      })();
    }
    return this.opfsDirPromise;
  }

  private getOpfsFileName(hash: string, type: ValueType) {
    switch (type) {
      case 'blob':
        return `${hash}.bin`;
      case 'json':
        return `${hash}.json`;
      case 'text':
      default:
        return `${hash}.txt`;
    }
  }

  private notify(event: CacheEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[cacheStore] listener error', err);
      }
    });
  }

  private updateStats() {
    const stats = this.getStats();
    const signature = `${stats.hits}/${stats.misses}/${stats.evictions}/${stats.corruptions}`;
    if (signature !== this.lastStatsSignature) {
      this.lastStatsSignature = signature;
      if (typeof console !== 'undefined' && console.info) {
        console.info(
          `[cacheStore] hits=${stats.hits} misses=${stats.misses} hitRatio=${(stats.hitRatio * 100).toFixed(1)}% evictions=${stats.evictions}`,
        );
      }
    }
    this.notify({ type: 'stats', stats });
  }

  private recordHit() {
    this.hits += 1;
    this.updateStats();
  }

  private recordMiss() {
    this.misses += 1;
    this.updateStats();
  }

  private async writeOpfsData(hash: string, prepared: PreparedValue, signal?: AbortSignal) {
    const dir = await this.ensureOpfs();
    if (!dir) return false;
    try {
      const name = this.getOpfsFileName(hash, prepared.type);
      try {
        await dir.removeEntry(name, { recursive: false });
      } catch {
        // ignore missing entry
      }
      const handle = await dir.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      this.throwIfAborted(signal);
      if (prepared.rawData instanceof Blob) {
        await writable.write(prepared.rawData);
      } else if (typeof prepared.rawData === 'string') {
        await writable.write(prepared.rawData);
      } else {
        await writable.write(prepared.bytes);
      }
      await writable.close();
      return true;
    } catch (err) {
      console.warn('[cacheStore] failed to write OPFS entry', err);
      return false;
    }
  }

  private async readOpfsData(record: CacheEntryRecord, signal?: AbortSignal): Promise<Blob | string | null> {
    const dir = await this.ensureOpfs();
    if (!dir) return null;
    try {
      const name = this.getOpfsFileName(record.hash, record.type);
      const handle = await dir.getFileHandle(name);
      this.throwIfAborted(signal);
      const file = await handle.getFile();
      if (record.type === 'blob') {
        return file;
      }
      return await file.text();
    } catch (err) {
      console.warn('[cacheStore] failed to read OPFS entry', err);
      return null;
    }
  }

  private async deleteOpfsEntry(record: CacheEntryRecord) {
    const dir = await this.ensureOpfs();
    if (!dir) return;
    try {
      const name = this.getOpfsFileName(record.hash, record.type);
      await dir.removeEntry(name, { recursive: false });
    } catch {
      // ignore removal failures
    }
  }

  private async saveEntryMetadata(record: CacheEntryRecord) {
    const db = await this.getDb();
    if (!db) return;
    await db.put(STORE_ENTRIES, record);
  }

  private async writeIdbData(hash: string, prepared: PreparedValue) {
    const db = await this.getDb();
    if (!db) return;
    await db.put(CACHE_DATA_STORE, {
      hash,
      type: prepared.type,
      contentType: prepared.contentType,
      data: prepared.rawData,
    });
  }

  private async readIdbData(record: CacheEntryRecord): Promise<Blob | string | null> {
    const db = await this.getDb();
    if (!db) return null;
    const stored = await db.get(CACHE_DATA_STORE, record.hash);
    if (!stored) return null;
    return stored.data as Blob | string;
  }

  private async deleteIdbData(hash: string) {
    const db = await this.getDb();
    if (!db) return;
    await db.delete(CACHE_DATA_STORE, hash);
  }

  private async deleteEntry(hash: string, reason: CacheEvictionReason, options: { unlinkAliases?: boolean } = {}) {
    const { unlinkAliases = true } = options;
    const record = this.entries.get(hash);
    if (!record) return;
    this.entries.delete(hash);
    this.totalBytes = Math.max(0, this.totalBytes - record.size);
    if (record.storage === 'opfs') {
      await this.deleteOpfsEntry(record);
    }
    await this.deleteIdbData(hash);
    const db = await this.getDb();
    if (db) {
      await db.delete(STORE_ENTRIES, hash);
    }
    if (unlinkAliases) {
      const aliasesToRemove = Array.from(this.aliases.entries())
        .filter(([, value]) => value === hash)
        .map(([alias]) => alias);
      for (const alias of aliasesToRemove) {
        this.aliases.delete(alias);
        const dbInstance = await this.getDb();
        if (dbInstance) {
          await dbInstance.delete(STORE_ALIASES, alias);
        }
      }
      this.refCounts.delete(hash);
    }
    this.evictions += 1;
    if (reason === 'corruption') {
      this.corruptions += 1;
    }
    if (typeof console !== 'undefined' && console.info) {
      console.info(
        `[cacheStore] evicted ${hash} (${reason}) size=${record.size}`,
      );
    }
    this.notify({ type: 'evict', record, reason });
    this.updateStats();
  }

  private async unlinkAlias(alias: string) {
    const hash = this.aliases.get(alias);
    if (!hash) return;
    this.aliases.delete(alias);
    const db = await this.getDb();
    if (db) {
      await db.delete(STORE_ALIASES, alias);
    }
    const current = (this.refCounts.get(hash) ?? 1) - 1;
    if (current <= 0) {
      this.refCounts.delete(hash);
      await this.deleteEntry(hash, 'manual', { unlinkAliases: false });
    } else {
      this.refCounts.set(hash, current);
    }
  }

  private async rebindAlias(alias: string, hash: string, updatedAt: number) {
    const existing = this.aliases.get(alias);
    if (existing && existing !== hash) {
      await this.unlinkAlias(alias);
    }
    this.aliases.set(alias, hash);
    const db = await this.getDb();
    if (db) {
      await db.put(STORE_ALIASES, {
        alias,
        hash,
        updatedAt,
      } as AliasRecord);
    }
    this.refCounts.set(hash, (this.refCounts.get(hash) ?? 0) + 1);
  }

  private async ensureCapacity(size: number, signal?: AbortSignal) {
    await this.ensureInitialized();
    await this.ensureOpfs();
    if (size > this.options.maxBytes) {
      return; // too large to cache, skip eviction cycle
    }
    await this.mutex.runExclusive(async () => {
      while (this.totalBytes + size > this.options.maxBytes && this.entries.size > 0) {
        this.throwIfAborted(signal);
        let candidate: CacheEntryRecord | null = null;
        let reason: CacheEvictionReason = 'capacity';
        const currentTime = now();
        for (const entry of this.entries.values()) {
          if (entry.expiresAt && entry.expiresAt <= currentTime) {
            candidate = entry;
            reason = 'ttl';
            break;
          }
          if (!candidate || entry.accessedAt < candidate.accessedAt) {
            candidate = entry;
          }
        }
        if (!candidate) break;
        await this.deleteEntry(candidate.hash, reason);
      }
    });
  }

  private async readEntry(
    hash: string,
    alias: string,
    expectedType: ValueType,
    signal?: AbortSignal,
  ): Promise<CacheRememberResult<any> | null> {
    await this.ensureInitialized();
    const record = this.entries.get(hash);
    if (!record) {
      await this.unlinkAlias(alias);
      return null;
    }
    if (record.type !== expectedType) {
      await this.unlinkAlias(alias);
      return null;
    }
    const currentTime = now();
    if (record.expiresAt && record.expiresAt <= currentTime) {
      await this.deleteEntry(hash, 'ttl');
      return null;
    }
    let raw: Blob | string | null = null;
    if (record.storage === 'opfs') {
      raw = await this.readOpfsData(record, signal);
    } else {
      raw = await this.readIdbData(record);
    }
    if (raw == null) {
      await this.deleteEntry(hash, 'corruption');
      return null;
    }
    let data: any;
    try {
      if (record.type === 'json') {
        if (typeof raw !== 'string') {
          raw = typeof (raw as Blob).text === 'function' ? await (raw as Blob).text() : '';
        }
        data = raw ? JSON.parse(raw as string) : null;
      } else if (record.type === 'text') {
        if (typeof raw === 'string') {
          data = raw;
        } else {
          data = await (raw as Blob).text();
        }
      } else {
        data = raw instanceof Blob ? raw : new Blob([raw as string], {
          type: record.contentType || 'application/octet-stream',
        });
      }
    } catch (err) {
      console.warn('[cacheStore] failed to parse cached data', err);
      await this.deleteEntry(hash, 'corruption');
      return null;
    }
    record.accessedAt = currentTime;
    await this.saveEntryMetadata(record);
    return {
      data,
      hash,
      meta: { ...record },
      status: 'hit',
    };
  }

  private async prepareValue(
    type: ValueType,
    value: unknown,
    signal?: AbortSignal,
  ): Promise<PreparedValue> {
    this.throwIfAborted(signal);
    if (type === 'blob') {
      if (!(value instanceof Blob)) {
        throw new Error('Expected Blob data for cache entry');
      }
      const bytes = await value.arrayBuffer();
      return {
        type,
        rawData: value,
        bytes,
        size: value.size,
        contentType: value.type,
      };
    }
    if (type === 'text') {
      if (typeof value !== 'string') {
        throw new Error('Expected string data for cache entry');
      }
      const encoded = textEncoder().encode(value);
      return {
        type,
        rawData: value,
        bytes: encoded.buffer,
        size: encoded.byteLength,
      };
    }
    const serialized = JSON.stringify(value);
    const encoded = textEncoder().encode(serialized);
    return {
      type,
      rawData: serialized,
      bytes: encoded.buffer,
      size: encoded.byteLength,
      contentType: 'application/json',
    };
  }

  private resolveTtl(ttlMs?: number) {
    if (ttlMs === undefined) return this.options.defaultTtlMs;
    if (ttlMs <= 0) return 0;
    return ttlMs;
  }

  private async persistEntry(
    hash: string,
    prepared: PreparedValue,
    expiresAt: number | null,
  ): Promise<CacheEntryRecord | null> {
    const timestamp = now();
    let storage: 'opfs' | 'idb' = 'idb';
    if (await this.writeOpfsData(hash, prepared)) {
      storage = 'opfs';
    }
    const record: CacheEntryRecord = {
      hash,
      size: prepared.size,
      storedAt: timestamp,
      accessedAt: timestamp,
      expiresAt,
      type: prepared.type,
      contentType: prepared.contentType,
      storage,
    };
    const db = await this.getDb();
    if (!db) {
      return null;
    }
    const tx = db.transaction([STORE_ENTRIES, CACHE_DATA_STORE], 'readwrite');
    if (storage === 'idb') {
      await tx.objectStore(CACHE_DATA_STORE).put({
        hash,
        type: prepared.type,
        contentType: prepared.contentType,
        data: prepared.rawData,
      });
    } else {
      await tx.objectStore(CACHE_DATA_STORE).delete(hash);
    }
    await tx.objectStore(STORE_ENTRIES).put(record);
    await tx.done;
    this.entries.set(hash, record);
    this.totalBytes += record.size;
    return record;
  }

  private async rememberInternal<T>(
    alias: string,
    type: ValueType,
    loader: () => Promise<T>,
    options?: CacheRememberOptions,
  ): Promise<CacheRememberResult<T>> {
    const signal = options?.signal;
    await this.ensureInitialized();
    this.throwIfAborted(signal);

    if (!this.canPersist()) {
      const value = await loader();
      this.throwIfAborted(signal);
      const prepared = await this.prepareValue(type, value, signal);
      const hash = await computeHash(prepared.bytes);
      const meta: CacheEntryRecord = {
        hash,
        size: prepared.size,
        storedAt: now(),
        accessedAt: now(),
        expiresAt: null,
        type,
        contentType: prepared.contentType,
        storage: 'idb',
      };
      // Manage simple in-memory store with LRU semantics
      if (this.memoryEntries.has(alias)) {
        const existing = this.memoryEntries.get(alias)!;
        this.memoryOrder = this.memoryOrder.filter((k) => k !== alias);
        this.memoryEntries.delete(alias);
        this.totalBytes = Math.max(0, this.totalBytes - existing.meta.size);
      }
      while (this.totalBytes + prepared.size > this.options.maxBytes && this.memoryOrder.length > 0) {
        const oldestAlias = this.memoryOrder.shift();
        if (!oldestAlias) break;
        const removed = this.memoryEntries.get(oldestAlias);
        if (removed) {
          this.memoryEntries.delete(oldestAlias);
          this.totalBytes = Math.max(0, this.totalBytes - removed.meta.size);
          this.evictions += 1;
          this.notify({ type: 'evict', record: removed.meta, reason: 'capacity' });
        }
      }
      this.memoryEntries.set(alias, { alias, value, meta });
      this.memoryOrder.push(alias);
      this.totalBytes += prepared.size;
      this.recordMiss();
      return {
        data: value,
        hash,
        meta,
        status: 'miss',
      };
    }

    let result: CacheRememberResult<T> | null = null;

    await this.mutex.runExclusive(async () => {
      const existingHash = this.aliases.get(alias);
      if (existingHash) {
        const cached = await this.readEntry(existingHash, alias, type, signal);
        if (cached) {
          result = cached as CacheRememberResult<T>;
        }
      }
    });

    if (result) {
      this.recordHit();
      return result;
    }

    const value = await loader();
    this.throwIfAborted(signal);
    const prepared = await this.prepareValue(type, value, signal);
    const hash = await computeHash(prepared.bytes);
    const ttl = this.resolveTtl(options?.ttlMs);
    const expiresAt = ttl > 0 ? now() + ttl : null;

    await this.ensureCapacity(prepared.size, signal);

    await this.mutex.runExclusive(async () => {
      const currentHash = this.aliases.get(alias);
      if (currentHash) {
        const cached = await this.readEntry(currentHash, alias, type, signal);
        if (cached) {
          result = cached as CacheRememberResult<T>;
          return;
        }
      }

      const existingEntry = this.entries.get(hash);
      let record: CacheEntryRecord | null = null;
      if (existingEntry) {
        existingEntry.accessedAt = now();
        if (expiresAt && (!existingEntry.expiresAt || expiresAt > existingEntry.expiresAt)) {
          existingEntry.expiresAt = expiresAt;
        }
        await this.saveEntryMetadata(existingEntry);
        record = existingEntry;
      } else {
        record = await this.persistEntry(hash, prepared, expiresAt);
      }
      if (!record) {
        // Persistence failed; treat as non-cacheable
        result = {
          data: value,
          hash,
          meta: {
            hash,
            size: prepared.size,
            storedAt: now(),
            accessedAt: now(),
            expiresAt,
            type,
            contentType: prepared.contentType,
            storage: this.useOpfs ? 'opfs' : 'idb',
          },
          status: 'miss',
        };
        return;
      }

      await this.rebindAlias(alias, hash, now());
      result = {
        data: value,
        hash,
        meta: { ...record },
        status: 'miss',
      };
    });

    if (result?.status === 'hit') {
      this.recordHit();
      return result;
    }
    this.recordMiss();
    return result!;
  }

  getStats(): CacheStats {
    const operations = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      corruptions: this.corruptions,
      hitRatio: operations === 0 ? 0 : this.hits / operations,
      entries: this.entries.size || this.memoryEntries.size,
      totalBytes: this.totalBytes,
      maxBytes: this.options.maxBytes,
    };
  }

  subscribe(listener: (event: CacheEvent) => void) {
    this.listeners.add(listener);
    listener({ type: 'stats', stats: this.getStats() });
    return () => {
      this.listeners.delete(listener);
    };
  }

  configure(options: Partial<CacheStoreOptions>) {
    this.options = { ...this.options, ...options };
  }

  async rememberJSON<T>(
    alias: string,
    loader: () => Promise<T>,
    options?: CacheRememberOptions,
  ): Promise<CacheRememberResult<T>> {
    return this.rememberInternal<T>(alias, 'json', loader, options);
  }

  async rememberText(
    alias: string,
    loader: () => Promise<string>,
    options?: CacheRememberOptions,
  ): Promise<CacheRememberResult<string>> {
    return this.rememberInternal<string>(alias, 'text', loader, options);
  }

  async rememberBlob(
    alias: string,
    loader: () => Promise<Blob>,
    options?: CacheRememberOptions,
  ): Promise<CacheRememberResult<Blob>> {
    return this.rememberInternal<Blob>(alias, 'blob', loader, options);
  }

  async getAliasHash(alias: string): Promise<string | null> {
    await this.ensureInitialized();
    return this.aliases.get(alias) ?? null;
  }

  async clear() {
    await this.ensureInitialized();
    if (this.canPersist()) {
      const db = await this.getDb();
      if (db) {
        const tx = db.transaction([STORE_ENTRIES, STORE_ALIASES, CACHE_DATA_STORE], 'readwrite');
        await Promise.all([
          tx.objectStore(STORE_ENTRIES).clear(),
          tx.objectStore(STORE_ALIASES).clear(),
          tx.objectStore(CACHE_DATA_STORE).clear(),
        ]);
        await tx.done;
      }
      const dir = await this.ensureOpfs();
      if (dir) {
        try {
          for await (const entry of (dir as any).values()) {
            if (entry && entry.kind === 'file') {
              await dir.removeEntry(entry.name);
            }
          }
        } catch {
          // ignore
        }
      }
    } else {
      this.memoryEntries.clear();
      this.memoryOrder = [];
    }
    this.entries.clear();
    this.aliases.clear();
    this.refCounts.clear();
    this.totalBytes = 0;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.corruptions = 0;
    this.updateStats();
  }

  async resetForTesting(options?: Partial<CacheStoreOptions>) {
    if (options) {
      this.configure(options);
    }
    await this.clear();
  }
}

const cacheStore = new CacheStore();

export const resetCacheStoreForTesting = (options?: Partial<CacheStoreOptions>) =>
  cacheStore.resetForTesting(options);

export default cacheStore;
