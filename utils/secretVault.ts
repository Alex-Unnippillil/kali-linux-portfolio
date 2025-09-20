import { getDb } from './safeIDB';
import { logVaultAutoClear } from './analytics';
import type { IDBPDatabase } from 'idb';

export interface SecretVaultMetadata {
  scopes: string[];
  tags: string[];
  expiresAt: number | null;
  restrictCopy: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SecretVaultContent {
  username: string;
  password: string;
  notes?: string;
}

export interface SecretVaultDecryptedItem extends SecretVaultContent {
  id: string;
  label: string;
  metadata: SecretVaultMetadata;
}

export interface SecretVaultDraft extends SecretVaultContent {
  id?: string;
  label: string;
  metadata: Partial<Pick<
    SecretVaultMetadata,
    'scopes' | 'tags' | 'expiresAt' | 'restrictCopy'
  >>;
}

interface SecretVaultStoredItem {
  id: string;
  label: string;
  payload: string;
  iv: string;
  metadata: SecretVaultMetadata;
}

interface SecretVaultMetaRecord {
  salt: string;
  verification: string;
  verificationIv: string;
  createdAt: number;
}

export interface SecretVaultSession {
  key: CryptoKey;
  db: IDBPDatabase;
}

export interface ClipboardCancelOptions {
  wipe?: boolean;
}

const DB_NAME = 'credentials-vault';
const STORE_NAME = 'credentials';
const META_STORE = 'meta';
const META_KEY = 'vault-meta';
const CHECK_VALUE = 'vault-check';
const EXPIRY_WARNING_WINDOW = 1000 * 60 * 60 * 24 * 2; // 48 hours

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let dbPromise: ReturnType<typeof getDb> | null = null;
let clipboardTimeout: ReturnType<typeof setTimeout> | null = null;

export const SECRET_VAULT_DB_NAME = DB_NAME;
export const SECRET_VAULT_STORE = STORE_NAME;

const getCrypto = (): Crypto => {
  const cryptoObj =
    (typeof globalThis !== 'undefined' && (globalThis.crypto as Crypto | undefined)) ||
    (typeof window !== 'undefined' ? (window.crypto as Crypto | undefined) : undefined);
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('WEB_CRYPTO_UNAVAILABLE');
  }
  return cryptoObj;
};

const bufferToBase64 = (buffer: ArrayBuffer): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToUint8Array = (value: string): Uint8Array => {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(value, 'base64'));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const ensureDb = () => {
  dbPromise = getDb(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    },
  });
  return dbPromise;
};

const deriveKey = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
  const crypto = getCrypto();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 250000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const encryptText = async (
  key: CryptoKey,
  value: string
): Promise<{ cipher: string; iv: string }> => {
  const crypto = getCrypto();
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    textEncoder.encode(value)
  );
  return {
    cipher: bufferToBase64(ciphertext),
    iv: bufferToBase64(ivBytes.buffer),
  };
};

const decryptText = async (key: CryptoKey, cipher: string, iv: string): Promise<string> => {
  const crypto = getCrypto();
  const data = base64ToUint8Array(cipher);
  const ivBytes = base64ToUint8Array(iv);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    data
  );
  return textDecoder.decode(plaintext);
};

const normalizeList = (values?: string[]): string[] => {
  if (!values) return [];
  const deduped = new Set<string>();
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => deduped.add(value));
  return Array.from(deduped);
};

export const createVaultSession = async (passphrase: string): Promise<SecretVaultSession> => {
  if (!passphrase) {
    throw new Error('EMPTY_PASSPHRASE');
  }
  const dbp = ensureDb();
  if (!dbp) {
    throw new Error('INDEXEDDB_UNAVAILABLE');
  }
  const db = await dbp;
  const crypto = getCrypto();

  const meta = (await db.get(META_STORE, META_KEY)) as SecretVaultMetaRecord | undefined;
  if (!meta) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(passphrase, salt);
    const verification = await encryptText(key, CHECK_VALUE);
    const record: SecretVaultMetaRecord = {
      salt: bufferToBase64(salt.buffer),
      verification: verification.cipher,
      verificationIv: verification.iv,
      createdAt: Date.now(),
    };
    await db.put(META_STORE, record, META_KEY);
    return { key, db };
  }

  const salt = base64ToUint8Array(meta.salt);
  const key = await deriveKey(passphrase, salt);
  try {
    await decryptText(key, meta.verification, meta.verificationIv);
  } catch (error) {
    throw new Error('INVALID_PASSPHRASE');
  }

  return { key, db };
};

const parseContent = (serialized: string): SecretVaultContent => {
  try {
    const parsed = JSON.parse(serialized) as SecretVaultContent;
    return {
      username: parsed.username || '',
      password: parsed.password || '',
      notes: parsed.notes || '',
    };
  } catch {
    return { username: '', password: '', notes: '' };
  }
};

export const readVaultSecrets = async (
  session: SecretVaultSession
): Promise<SecretVaultDecryptedItem[]> => {
  const records = (await session.db.getAll(STORE_NAME)) as SecretVaultStoredItem[];
  const results: SecretVaultDecryptedItem[] = [];
  for (const record of records) {
    try {
      const plaintext = await decryptText(session.key, record.payload, record.iv);
      const content = parseContent(plaintext);
      const metadata: SecretVaultMetadata = {
        scopes: normalizeList(record.metadata.scopes),
        tags: normalizeList(record.metadata.tags),
        restrictCopy: Boolean(record.metadata.restrictCopy),
        expiresAt:
          typeof record.metadata.expiresAt === 'number'
            ? record.metadata.expiresAt
            : record.metadata.expiresAt === null
            ? null
            : null,
        createdAt: record.metadata.createdAt || record.metadata.updatedAt || Date.now(),
        updatedAt: record.metadata.updatedAt || record.metadata.createdAt || Date.now(),
      };
      results.push({
        id: record.id,
        label: record.label,
        metadata,
        ...content,
      });
    } catch {
      // Skip unreadable records
    }
  }
  return results.sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt);
};

const resolveDraftMetadata = (
  draft: SecretVaultDraft,
  existing?: SecretVaultStoredItem
): SecretVaultMetadata => {
  const now = Date.now();
  const baseMetadata = existing?.metadata;
  const expiresAtValue =
    draft.metadata.expiresAt !== undefined
      ? draft.metadata.expiresAt ?? null
      : baseMetadata?.expiresAt ?? null;

  return {
    scopes: normalizeList(
      draft.metadata.scopes ?? baseMetadata?.scopes ?? []
    ),
    tags: normalizeList(draft.metadata.tags ?? baseMetadata?.tags ?? []),
    restrictCopy: Boolean(
      draft.metadata.restrictCopy ?? baseMetadata?.restrictCopy ?? false
    ),
    expiresAt: expiresAtValue,
    createdAt: baseMetadata?.createdAt ?? now,
    updatedAt: now,
  };
};

export const writeVaultSecret = async (
  session: SecretVaultSession,
  draft: SecretVaultDraft
): Promise<SecretVaultDecryptedItem> => {
  const cryptoObj = getCrypto();
  const id =
    draft.id ??
    (typeof cryptoObj.randomUUID === 'function'
      ? cryptoObj.randomUUID()
      : `vault-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const existing = draft.id
    ? ((await session.db.get(STORE_NAME, draft.id)) as SecretVaultStoredItem | undefined)
    : undefined;
  const metadata = resolveDraftMetadata(draft, existing);
  const serialized = JSON.stringify({
    username: draft.username,
    password: draft.password,
    notes: draft.notes ?? '',
  });
  const encrypted = await encryptText(session.key, serialized);
  const record: SecretVaultStoredItem = {
    id,
    label: draft.label,
    payload: encrypted.cipher,
    iv: encrypted.iv,
    metadata,
  };
  await session.db.put(STORE_NAME, record);
  return {
    id,
    label: draft.label,
    metadata,
    username: draft.username,
    password: draft.password,
    notes: draft.notes ?? '',
  };
};

export const deleteVaultSecret = async (
  session: SecretVaultSession,
  id: string
): Promise<void> => {
  await session.db.delete(STORE_NAME, id);
};

export const isExpired = (item: SecretVaultDecryptedItem, now = Date.now()): boolean => {
  return typeof item.metadata.expiresAt === 'number' && item.metadata.expiresAt <= now;
};

export const willExpireSoon = (
  item: SecretVaultDecryptedItem,
  now = Date.now()
): boolean => {
  if (!item.metadata.expiresAt) return false;
  return item.metadata.expiresAt > now && item.metadata.expiresAt - now <= EXPIRY_WARNING_WINDOW;
};

const clipboardAvailable = (): boolean =>
  typeof navigator !== 'undefined' &&
  !!navigator.clipboard &&
  typeof navigator.clipboard.writeText === 'function';

export const scheduleClipboardWipe = (delay = 20000): void => {
  if (!clipboardAvailable()) return;
  if (clipboardTimeout) {
    clearTimeout(clipboardTimeout);
  }
  clipboardTimeout = setTimeout(async () => {
    clipboardTimeout = null;
    try {
      await navigator.clipboard.writeText('');
      logVaultAutoClear();
    } catch {
      // ignore clipboard errors
    }
  }, delay);
};

export const cancelClipboardWipe = async (
  options: ClipboardCancelOptions = {}
): Promise<void> => {
  if (clipboardTimeout) {
    clearTimeout(clipboardTimeout);
    clipboardTimeout = null;
  }
  if (options.wipe && clipboardAvailable()) {
    try {
      await navigator.clipboard.writeText('');
    } catch {
      // ignore clipboard errors
    }
  }
};

export const getActiveClipboardTimeout = (): ReturnType<typeof setTimeout> | null =>
  clipboardTimeout;

export const deriveExpiryCollections = (
  items: SecretVaultDecryptedItem[],
  now = Date.now()
) => {
  const expired: SecretVaultDecryptedItem[] = [];
  const warnings: SecretVaultDecryptedItem[] = [];
  for (const item of items) {
    if (isExpired(item, now)) {
      expired.push(item);
    } else if (willExpireSoon(item, now)) {
      warnings.push(item);
    }
  }
  return { expired, warnings };
};
