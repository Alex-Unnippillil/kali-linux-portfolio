import { safeLocalStorage } from './safeStorage';

export type SecureStoreErrorCode =
  | 'UNSUPPORTED'
  | 'INVALID_PASSPHRASE'
  | 'CORRUPTED'
  | 'NOT_FOUND';

export class SecureStoreError extends Error {
  code: SecureStoreErrorCode;

  constructor(code: SecureStoreErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SecureStoreError';
    this.code = code;
  }
}

interface SecureEnvelope {
  version: number;
  algorithm: 'AES-GCM' | 'PLAINTEXT';
  ciphertext: string;
  salt?: string;
  iv?: string;
  iterations?: number;
  checksum?: string;
  passphraseHash?: string;
  createdAt?: string;
}

export interface SecureStoreOptions {
  storage?: Storage;
  iterations?: number;
  saltLength?: number;
  ivLength?: number;
}

const DEFAULT_ITERATIONS = 250_000;
const DEFAULT_SALT_LENGTH = 16;
const DEFAULT_IV_LENGTH = 12;
const CURRENT_VERSION = 1;
const AES_ALGORITHM = 'AES-GCM';
const PLAINTEXT_ALGORITHM = 'PLAINTEXT';

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : undefined;
const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : undefined;

const hasSubtleCrypto = () =>
  typeof globalThis !== 'undefined' && !!globalThis.crypto && !!globalThis.crypto.subtle;

const getSubtle = () => {
  if (!hasSubtleCrypto()) {
    throw new SecureStoreError(
      'UNSUPPORTED',
      'WebCrypto is not available in this environment. Secure encryption cannot be performed.',
    );
  }
  return globalThis.crypto.subtle;
};

const getRandomValues = (length: number) => {
  if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
    throw new SecureStoreError(
      'UNSUPPORTED',
      'Secure random number generation is unavailable in this environment.',
    );
  }
  const buffer = new Uint8Array(length);
  globalThis.crypto.getRandomValues(buffer);
  return buffer;
};

const bufferToBase64 = (buffer: ArrayBuffer | Uint8Array) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa ? globalThis.btoa(binary) : Buffer.from(bytes).toString('base64');
};

const base64ToBuffer = (base64: string) => {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(base64, 'base64')).buffer;
  }
  if (!globalThis.atob) {
    throw new SecureStoreError(
      'UNSUPPORTED',
      'Base64 decoding is unavailable in this environment.',
    );
  }
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const encodeString = (value: string) => {
  if (encoder) {
    return encoder.encode(value);
  }
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(value, 'utf8'));
  }
  throw new SecureStoreError('UNSUPPORTED', 'TextEncoder is unavailable in this environment.');
};

const decodeBuffer = (buffer: ArrayBuffer) => {
  if (decoder) {
    return decoder.decode(buffer);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(new Uint8Array(buffer)).toString('utf8');
  }
  throw new SecureStoreError('UNSUPPORTED', 'TextDecoder is unavailable in this environment.');
};

const fnv1a = (input: string) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash >>> 0, 0x01000193);
  }
  return (hash >>> 0).toString(16);
};

const ensureStorage = (storage?: Storage) => {
  const target = storage ?? safeLocalStorage;
  if (!target) {
    throw new SecureStoreError('UNSUPPORTED', 'Persistent storage is not available.');
  }
  return target;
};

const serialize = (envelope: SecureEnvelope) => JSON.stringify(envelope);

const parseEnvelope = (raw: string): SecureEnvelope => {
  let envelope: SecureEnvelope;
  try {
    envelope = JSON.parse(raw);
  } catch (error) {
    throw new SecureStoreError('CORRUPTED', 'Stored data is not valid JSON.', { cause: error });
  }
  if (!envelope || typeof envelope !== 'object') {
    throw new SecureStoreError('CORRUPTED', 'Stored data is malformed.');
  }
  return envelope;
};

const deriveKey = async (
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> => {
  const subtle = getSubtle();
  const keyMaterial = await subtle.importKey(
    'raw',
    encodeString(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: AES_ALGORITHM,
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
};

const encryptAesGcm = async (
  plaintext: string,
  passphrase: string,
  options: Required<Omit<SecureStoreOptions, 'storage'>>,
): Promise<SecureEnvelope> => {
  const salt = getRandomValues(options.saltLength);
  const iv = getRandomValues(options.ivLength);
  const key = await deriveKey(passphrase, salt, options.iterations);
  const subtle = getSubtle();
  const encrypted = await subtle.encrypt(
    {
      name: AES_ALGORITHM,
      iv,
    },
    key,
    encodeString(plaintext),
  );
  return {
    version: CURRENT_VERSION,
    algorithm: AES_ALGORITHM,
    ciphertext: bufferToBase64(encrypted),
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    iterations: options.iterations,
    createdAt: new Date().toISOString(),
  };
};

const decryptAesGcm = async (
  envelope: SecureEnvelope,
  passphrase: string,
): Promise<string> => {
  try {
    const salt = envelope.salt ? new Uint8Array(base64ToBuffer(envelope.salt)) : undefined;
    const iv = envelope.iv ? new Uint8Array(base64ToBuffer(envelope.iv)) : undefined;
    if (!salt || !iv || !envelope.iterations) {
      throw new SecureStoreError('CORRUPTED', 'Encrypted payload is missing metadata.');
    }
    const key = await deriveKey(passphrase, salt, envelope.iterations);
    const subtle = getSubtle();
    const decrypted = await subtle.decrypt(
      {
        name: AES_ALGORITHM,
        iv,
      },
      key,
      base64ToBuffer(envelope.ciphertext),
    );
    return decodeBuffer(decrypted);
  } catch (error) {
    if (error instanceof SecureStoreError) {
      throw error;
    }
    throw new SecureStoreError(
      'INVALID_PASSPHRASE',
      'Unable to decrypt the stored secret. Check your passphrase or re-import the data.',
      { cause: error },
    );
  }
};

const encryptPlaintext = (plaintext: string, passphrase: string): SecureEnvelope => ({
  version: CURRENT_VERSION,
  algorithm: PLAINTEXT_ALGORITHM,
  ciphertext: bufferToBase64(encodeString(plaintext)),
  checksum: fnv1a(plaintext),
  passphraseHash: fnv1a(passphrase),
  createdAt: new Date().toISOString(),
});

const decryptPlaintext = (envelope: SecureEnvelope, passphrase: string): string => {
  if (!envelope.passphraseHash) {
    throw new SecureStoreError('CORRUPTED', 'Stored plaintext payload is missing metadata.');
  }
  const expectedHash = fnv1a(passphrase);
  if (envelope.passphraseHash !== expectedHash) {
    throw new SecureStoreError(
      'INVALID_PASSPHRASE',
      'The passphrase does not match the stored data.',
    );
  }
  const buffer = base64ToBuffer(envelope.ciphertext);
  const plaintext = decodeBuffer(buffer);
  if (envelope.checksum && envelope.checksum !== fnv1a(plaintext)) {
    throw new SecureStoreError(
      'CORRUPTED',
      'Stored data appears to have been modified or corrupted.',
    );
  }
  return plaintext;
};

const getEnvelope = (key: string, storage?: Storage) => {
  const store = ensureStorage(storage);
  const raw = store.getItem(key);
  return raw === null ? null : parseEnvelope(raw);
};

const ensurePassphrase = (passphrase: string) => {
  if (!passphrase || !passphrase.trim()) {
    throw new SecureStoreError('INVALID_PASSPHRASE', 'A passphrase is required for secure storage.');
  }
};

const ensureOptions = (options?: SecureStoreOptions) => ({
  iterations: options?.iterations ?? DEFAULT_ITERATIONS,
  saltLength: options?.saltLength ?? DEFAULT_SALT_LENGTH,
  ivLength: options?.ivLength ?? DEFAULT_IV_LENGTH,
});

export const isSecureStoreUsingWebCrypto = () => hasSubtleCrypto();

export const hasSecureItem = (key: string, storage?: Storage) => {
  try {
    const store = ensureStorage(storage);
    return store.getItem(key) !== null;
  } catch {
    return false;
  }
};

export async function setSecureItem<T>(
  key: string,
  value: T,
  passphrase: string,
  options?: SecureStoreOptions,
): Promise<void> {
  ensurePassphrase(passphrase);
  const store = ensureStorage(options?.storage);
  const payload = JSON.stringify(value);
  const baseOptions = ensureOptions(options);

  let envelope: SecureEnvelope;
  if (hasSubtleCrypto()) {
    envelope = await encryptAesGcm(payload, passphrase, baseOptions);
  } else {
    envelope = encryptPlaintext(payload, passphrase);
  }
  try {
    store.setItem(key, serialize(envelope));
  } catch (error) {
    throw new SecureStoreError('UNSUPPORTED', 'Unable to persist secure data.', { cause: error });
  }
}

export async function getSecureItem<T>(
  key: string,
  passphrase: string,
  options?: SecureStoreOptions,
): Promise<T | null> {
  ensurePassphrase(passphrase);
  const envelope = getEnvelope(key, options?.storage);
  if (!envelope) return null;
  if (envelope.version !== CURRENT_VERSION) {
    throw new SecureStoreError(
      'CORRUPTED',
      'Stored data uses an unsupported version. Please re-save your settings.',
    );
  }
  let plaintext: string;
  if (envelope.algorithm === AES_ALGORITHM) {
    plaintext = await decryptAesGcm(envelope, passphrase);
  } else {
    plaintext = decryptPlaintext(envelope, passphrase);
  }
  try {
    return JSON.parse(plaintext) as T;
  } catch (error) {
    throw new SecureStoreError('CORRUPTED', 'Decrypted data is not valid JSON.', { cause: error });
  }
}

export async function rotateSecureItem(
  key: string,
  oldPassphrase: string,
  newPassphrase: string,
  options?: SecureStoreOptions,
): Promise<void> {
  ensurePassphrase(newPassphrase);
  const store = ensureStorage(options?.storage);
  const existing = await getSecureItem<unknown>(key, oldPassphrase, options);
  if (existing === null) {
    throw new SecureStoreError('NOT_FOUND', 'No secure data is stored for this item.');
  }
  await setSecureItem(key, existing, newPassphrase, { ...options, storage: store });
}

export function removeSecureItem(key: string, options?: SecureStoreOptions) {
  const store = ensureStorage(options?.storage);
  try {
    store.removeItem(key);
  } catch (error) {
    throw new SecureStoreError('UNSUPPORTED', 'Unable to remove secure data.', { cause: error });
  }
}
