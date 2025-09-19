const encoder = new TextEncoder();
const decoder = new TextDecoder();

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const DEFAULT_ITERATIONS = 310_000;
const ALGORITHM = 'AES-GCM' as const;
const KDF_NAME = 'PBKDF2' as const;
const KDF_HASH = 'SHA-256' as const;

export const PROFILE_EXPORT_VERSION = 1;

export type ProfileExportMetadata = Record<string, unknown>;

export class ProfileExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileExportError';
  }
}

export class ProfileExportFormatError extends ProfileExportError {
  constructor(message = 'Invalid profile export format') {
    super(message);
    this.name = 'ProfileExportFormatError';
  }
}

export class UnsupportedProfileExportVersionError extends ProfileExportError {
  constructor(message = 'Unsupported profile export version') {
    super(message);
    this.name = 'UnsupportedProfileExportVersionError';
  }
}

export class InvalidProfilePasswordError extends ProfileExportError {
  constructor(message = 'Unable to decrypt profile export with the provided password') {
    super(message);
    this.name = 'InvalidProfilePasswordError';
  }
}

export class ProfileChecksumMismatchError extends ProfileExportError {
  constructor(message = 'Profile export checksum validation failed') {
    super(message);
    this.name = 'ProfileChecksumMismatchError';
  }
}

interface KdfMetadata {
  name: typeof KDF_NAME;
  hash: typeof KDF_HASH;
  iterations: number;
}

export interface ProfileExportEnvelope {
  version: number;
  createdAt: string;
  algorithm: typeof ALGORITHM;
  kdf: KdfMetadata;
  iv: string;
  salt: string;
  checksum: string;
  ciphertext: string;
  metadata?: ProfileExportMetadata;
}

export interface ImportedProfile<T> {
  data: T;
  metadata?: ProfileExportMetadata;
  version: number;
  createdAt: string;
}

const getCrypto = (): Crypto => {
  const crypto = globalThis.crypto;
  if (!crypto || !crypto.subtle) {
    throw new ProfileExportError('Web Crypto API is not available in this environment');
  }
  return crypto;
};

const base64Encode = (input: ArrayBuffer | Uint8Array): string => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  if (typeof btoa === 'function') {
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }
  throw new ProfileExportError('No base64 encoder available');
};

const base64Decode = (value: string): Uint8Array => {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }
  if (typeof atob === 'function') {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  throw new ProfileExportError('No base64 decoder available');
};

const deriveKey = async (
  password: string,
  salt: Uint8Array,
  iterations: number,
  crypto: Crypto,
): Promise<CryptoKey> => {
  const subtle = crypto.subtle;
  const passwordBytes = encoder.encode(password);
  const baseKey = await subtle.importKey('raw', passwordBytes, { name: KDF_NAME }, false, ['deriveKey']);
  return subtle.deriveKey(
    {
      name: KDF_NAME,
      salt,
      iterations,
      hash: KDF_HASH,
    },
    baseKey,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

const digest = async (crypto: Crypto, data: Uint8Array): Promise<string> => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return base64Encode(hashBuffer);
};

export const serializeProfilePayload = <T>(data: T): Uint8Array =>
  encoder.encode(JSON.stringify(data));

export const deserializeProfilePayload = <T>(payload: Uint8Array): T => {
  const text = decoder.decode(payload);
  return JSON.parse(text) as T;
};

export const createProfileExport = async <T>(
  data: T,
  password: string,
  metadata: ProfileExportMetadata = {},
): Promise<string> => {
  if (!password) {
    throw new ProfileExportError('Password is required to export profiles');
  }

  const crypto = getCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const iterations = DEFAULT_ITERATIONS;
  const key = await deriveKey(password, salt, iterations, crypto);

  const payloadBytes = serializeProfilePayload(data);
  const checksum = await digest(crypto, payloadBytes);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    payloadBytes,
  );

  const envelope: ProfileExportEnvelope = {
    version: PROFILE_EXPORT_VERSION,
    createdAt: new Date().toISOString(),
    algorithm: ALGORITHM,
    kdf: {
      name: KDF_NAME,
      hash: KDF_HASH,
      iterations,
    },
    iv: base64Encode(iv),
    salt: base64Encode(salt),
    checksum,
    ciphertext: base64Encode(ciphertext),
    metadata,
  };

  return JSON.stringify(envelope);
};

const assertEnvelope = (value: unknown): value is ProfileExportEnvelope => {
  if (!value || typeof value !== 'object') return false;
  const env = value as Partial<ProfileExportEnvelope>;
  return (
    typeof env.version === 'number' &&
    typeof env.createdAt === 'string' &&
    env.algorithm === ALGORITHM &&
    !!env.kdf &&
    env.kdf.name === KDF_NAME &&
    env.kdf.hash === KDF_HASH &&
    typeof env.kdf.iterations === 'number' &&
    typeof env.iv === 'string' &&
    typeof env.salt === 'string' &&
    typeof env.checksum === 'string' &&
    typeof env.ciphertext === 'string'
  );
};

export const readProfileExport = async <T>(
  exported: string,
  password: string,
): Promise<ImportedProfile<T>> => {
  if (!password) {
    throw new ProfileExportError('Password is required to import profiles');
  }

  let envelope: unknown;
  try {
    envelope = JSON.parse(exported);
  } catch (err) {
    throw new ProfileExportFormatError();
  }

  if (!assertEnvelope(envelope)) {
    throw new ProfileExportFormatError();
  }

  if (envelope.version !== PROFILE_EXPORT_VERSION) {
    throw new UnsupportedProfileExportVersionError();
  }

  const crypto = getCrypto();
  const salt = base64Decode(envelope.salt);
  const iv = base64Decode(envelope.iv);
  const ciphertext = base64Decode(envelope.ciphertext);

  let decrypted: ArrayBuffer;
  try {
    const key = await deriveKey(password, salt, envelope.kdf.iterations, crypto);
    decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  } catch (error) {
    throw new InvalidProfilePasswordError();
  }

  const plaintext = new Uint8Array(decrypted);
  const checksum = await digest(crypto, plaintext);
  if (checksum !== envelope.checksum) {
    throw new ProfileChecksumMismatchError();
  }

  let data: T;
  try {
    data = deserializeProfilePayload<T>(plaintext);
  } catch (err) {
    throw new ProfileExportFormatError('Failed to parse profile payload');
  }

  return {
    data,
    metadata: envelope.metadata,
    version: envelope.version,
    createdAt: envelope.createdAt,
  };
};
