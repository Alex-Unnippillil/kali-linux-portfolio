import { openDB } from 'idb';

export const BACKUP_VERSION = 1;
const MAGIC_HEADER = 'KLP1';
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 210_000;

export type RestoreMode = 'merge' | 'replace';

export interface RestoreOptions {
  mode?: RestoreMode;
}

export interface BackupEntry {
  key: unknown;
  value: unknown;
}

export type IndexedDbDump = Record<string, Record<string, BackupEntry[]>>;

export interface BackupPayload {
  version: number;
  createdAt: string;
  localStorage: Record<string, string>;
  indexedDb: IndexedDbDump;
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

export class InvalidPassphraseError extends BackupError {
  constructor(message = 'Invalid passphrase') {
    super(message);
    this.name = 'InvalidPassphraseError';
  }
}

export class IncompatibleBackupError extends BackupError {
  constructor(message = 'Incompatible backup format') {
    super(message);
    this.name = 'IncompatibleBackupError';
  }
}

type SupportedInput = ArrayBuffer | Uint8Array | string | Blob;

type DatabaseInfo = { name?: string | null; version?: number };

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let cachedCrypto: Crypto | null = null;

const ensureCrypto = async (): Promise<Crypto> => {
  if (cachedCrypto) return cachedCrypto;
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto?.subtle) {
    cachedCrypto = globalThis.crypto;
    return cachedCrypto;
  }
  if (typeof globalThis.process !== 'undefined' && globalThis.process?.versions?.node) {
    const { webcrypto } = await import('node:crypto');
    cachedCrypto = webcrypto as unknown as Crypto;
    return cachedCrypto;
  }
  throw new BackupError('WebCrypto is not available in this environment');
};

const collectLocalStorage = (): Record<string, string> => {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  const result: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    const value = window.localStorage.getItem(key);
    if (value !== null) {
      result[key] = value;
    }
  }
  return result;
};

const listDatabases = async (): Promise<DatabaseInfo[]> => {
  const factory = globalThis.indexedDB as IDBFactory & { databases?: () => Promise<DatabaseInfo[]> };
  if (!factory) return [];
  if (typeof factory.databases === 'function') {
    try {
      const dbs = await factory.databases();
      return dbs.filter(db => db && typeof db.name === 'string');
    } catch {
      // fall through to fallback list
    }
  }
  return [{ name: 'keyval-store' }];
};

const collectIndexedDb = async (): Promise<IndexedDbDump> => {
  if (typeof indexedDB === 'undefined') return {};
  const databases = await listDatabases();
  const dump: IndexedDbDump = {};

  for (const info of databases) {
    if (!info?.name) continue;
    try {
      const db = await openDB(info.name);
      const storeDump: Record<string, BackupEntry[]> = {};

      for (const storeName of db.objectStoreNames) {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const [keys, values] = await Promise.all([
          store.getAllKeys(),
          store.getAll(),
        ]);
        storeDump[storeName] = keys.map((key, index) => ({ key, value: values[index] }));
        await tx.done;
      }

      dump[info.name] = storeDump;
      db.close();
    } catch (error) {
      console.warn('Failed to read IndexedDB database during backup', info?.name, error);
    }
  }

  return dump;
};

const normaliseInput = async (input: SupportedInput): Promise<Uint8Array> => {
  if (input instanceof Uint8Array) {
    return new Uint8Array(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength));
  }
  if (typeof ArrayBuffer !== 'undefined' && input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    const buffer = await input.arrayBuffer();
    return new Uint8Array(buffer);
  }
  if (typeof input === 'string') {
    const binary = typeof atob === 'function'
      ? atob(input)
      : Buffer.from(input, 'base64').toString('binary');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  throw new BackupError('Unsupported backup input');
};

const deriveKey = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
  const crypto = await ensureCrypto();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

const combineEncryptedSections = (
  header: Uint8Array,
  salt: Uint8Array,
  iv: Uint8Array,
  cipher: Uint8Array,
): Uint8Array => {
  const out = new Uint8Array(header.length + salt.length + iv.length + cipher.length);
  out.set(header, 0);
  out.set(salt, header.length);
  out.set(iv, header.length + salt.length);
  out.set(cipher, header.length + salt.length + iv.length);
  return out;
};

const splitEncryptedSections = (data: Uint8Array) => {
  const headerLength = MAGIC_HEADER.length;
  if (data.length <= headerLength + SALT_LENGTH + IV_LENGTH) {
    throw new BackupError('Backup payload is truncated');
  }
  const header = data.slice(0, headerLength);
  const salt = data.slice(headerLength, headerLength + SALT_LENGTH);
  const iv = data.slice(headerLength + SALT_LENGTH, headerLength + SALT_LENGTH + IV_LENGTH);
  const cipher = data.slice(headerLength + SALT_LENGTH + IV_LENGTH);
  return { header, salt, iv, cipher };
};

const readHeader = (header: Uint8Array): string => {
  return textDecoder.decode(header);
};

export const createEncryptedBackup = async (passphrase: string): Promise<Uint8Array> => {
  if (!passphrase) throw new BackupError('Passphrase is required');
  const crypto = await ensureCrypto();
  const [localStorageDump, indexedDbDump] = await Promise.all([
    Promise.resolve(collectLocalStorage()),
    collectIndexedDb(),
  ]);

  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    localStorage: localStorageDump,
    indexedDb: indexedDbDump,
  };

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);

  const plaintext = textEncoder.encode(JSON.stringify(payload));
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  const cipher = new Uint8Array(cipherBuffer);
  const header = textEncoder.encode(MAGIC_HEADER);

  return combineEncryptedSections(header, salt, iv, cipher);
};

const applyLocalStorage = (data: Record<string, string>, mode: RestoreMode) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (mode === 'replace') {
    const existingKeys = new Set<string>();
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key) existingKeys.add(key);
    }
    existingKeys.forEach(key => {
      if (!(key in data)) {
        window.localStorage.removeItem(key);
      }
    });
  }
  Object.entries(data).forEach(([key, value]) => {
    window.localStorage.setItem(key, value);
  });
};

const applyIndexedDb = async (dump: IndexedDbDump, mode: RestoreMode) => {
  if (typeof indexedDB === 'undefined') return;
  const entries = Object.entries(dump);
  for (const [dbName, stores] of entries) {
    const storeNames = Object.keys(stores);
    const db = await openDB(dbName, undefined, {
      upgrade(upgradeDb) {
        storeNames.forEach(storeName => {
          if (!upgradeDb.objectStoreNames.contains(storeName)) {
            upgradeDb.createObjectStore(storeName);
          }
        });
      },
    });

    for (const [storeName, storeEntries] of Object.entries(stores)) {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      if (mode === 'replace') {
        await store.clear();
      }
      for (const entry of storeEntries) {
        if ('key' in entry) {
          await store.put(entry.value, entry.key);
        } else {
          await store.put(entry.value);
        }
      }
      await tx.done;
    }
    db.close();
  }
};

export const restoreFromBackup = async (
  input: SupportedInput,
  passphrase: string,
  options: RestoreOptions = {},
): Promise<BackupPayload> => {
  if (!passphrase) throw new BackupError('Passphrase is required');
  const mode = options.mode ?? 'merge';
  const crypto = await ensureCrypto();
  const bytes = await normaliseInput(input);
  const { header, salt, iv, cipher } = splitEncryptedSections(bytes);
  const headerText = readHeader(header);
  if (headerText !== MAGIC_HEADER) {
    throw new IncompatibleBackupError();
  }

  const key = await deriveKey(passphrase, salt);
  let plaintext: Uint8Array;
  try {
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    plaintext = new Uint8Array(decrypted);
  } catch (error) {
    if (error instanceof DOMException || (error as Error).name === 'OperationError') {
      throw new InvalidPassphraseError();
    }
    throw new BackupError('Failed to decrypt backup');
  }

  let payload: BackupPayload;
  try {
    payload = JSON.parse(textDecoder.decode(plaintext)) as BackupPayload;
  } catch {
    throw new BackupError('Backup payload is corrupted');
  }

  if (typeof payload.version !== 'number' || payload.version > BACKUP_VERSION) {
    throw new IncompatibleBackupError('Unsupported backup version');
  }

  applyLocalStorage(payload.localStorage ?? {}, mode);
  await applyIndexedDb(payload.indexedDb ?? {}, mode);

  return payload;
};

export const inspectBackup = async (input: SupportedInput, passphrase: string): Promise<BackupPayload> => {
  return restoreFromBackup(input, passphrase, { mode: 'merge' });
};

