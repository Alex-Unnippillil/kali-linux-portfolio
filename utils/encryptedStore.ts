import { isBrowser } from './isBrowser';

const DEFAULT_KEY_SEED = 'kali-portfolio::vpn-manager::task70';
const FALLBACK_KEY = 'vpn-manager-fallback';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const encodeBase64 = (data: Uint8Array): string => {
  if (typeof globalThis.btoa === 'function') {
    let binary = '';
    data.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return globalThis.btoa(binary);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data).toString('base64');
  }
  let binary = '';
  data.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return globalThis.btoa ? globalThis.btoa(binary) : binary;
};

const decodeBase64 = (value: string): Uint8Array => {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    bytes[i] = value.charCodeAt(i);
  }
  return bytes;
};

const xorWithFallbackKey = (data: Uint8Array): Uint8Array => {
  const keyBytes = textEncoder.encode(FALLBACK_KEY);
  const output = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    output[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  return output;
};

const fallbackEncrypt = (plainText: string): string => {
  const bytes = textEncoder.encode(plainText);
  const cipher = xorWithFallbackKey(bytes);
  return encodeBase64(cipher);
};

const fallbackDecrypt = (payload: string): string => {
  const cipherBytes = decodeBase64(payload);
  const plainBytes = xorWithFallbackKey(cipherBytes);
  return textDecoder.decode(plainBytes);
};

const getLocationSalt = (): string => {
  if (!isBrowser) return 'server';
  try {
    return globalThis.location?.host || 'client';
  } catch {
    return 'client';
  }
};

const deriveKey = async (): Promise<CryptoKey | null> => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;

  const material = await subtle.importKey(
    'raw',
    textEncoder.encode(DEFAULT_KEY_SEED),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey'],
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: textEncoder.encode(`vpn-manager:${getLocationSalt()}`),
      iterations: 150_000,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

const encryptValue = async (plainText: string): Promise<string> => {
  try {
    const key = await deriveKey();
    if (!key) {
      return fallbackEncrypt(plainText);
    }
    const subtle = globalThis.crypto!.subtle;
    const iv = globalThis.crypto!.getRandomValues(new Uint8Array(12));
    const cipherBuffer = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      textEncoder.encode(plainText),
    );
    const payload = `${encodeBase64(iv)}.${encodeBase64(new Uint8Array(cipherBuffer))}`;
    return payload;
  } catch {
    return fallbackEncrypt(plainText);
  }
};

const decryptValue = async (payload: string): Promise<string> => {
  try {
    const key = await deriveKey();
    if (!key) {
      return fallbackDecrypt(payload);
    }
    const subtle = globalThis.crypto!.subtle;
    const [ivB64, cipherB64] = payload.split('.');
    if (!ivB64 || !cipherB64) {
      return fallbackDecrypt(payload);
    }
    const iv = decodeBase64(ivB64);
    const cipherBytes = decodeBase64(cipherB64);
    const plainBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes,
    );
    return textDecoder.decode(plainBuffer);
  } catch {
    return fallbackDecrypt(payload);
  }
};

const memoryStore = new Map<string, string>();

const getStorage = () => {
  if (isBrowser && globalThis.localStorage) {
    return {
      getItem: (key: string) => globalThis.localStorage.getItem(key),
      setItem: (key: string, value: string) => globalThis.localStorage.setItem(key, value),
      removeItem: (key: string) => globalThis.localStorage.removeItem(key),
    };
  }
  return {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStore.set(key, value);
    },
    removeItem: (key: string) => {
      memoryStore.delete(key);
    },
  };
};

export interface EncryptedStore<T> {
  load: () => Promise<T>;
  save: (value: T) => Promise<void>;
  clear: () => Promise<void>;
}

export function createEncryptedStore<T>(
  key: string,
  defaultValue: T,
): EncryptedStore<T> {
  const storageKey = `encrypted:${key}`;
  const storage = getStorage();

  return {
    load: async () => {
      const stored = storage.getItem(storageKey);
      if (!stored) return defaultValue;
      try {
        const decrypted = await decryptValue(stored);
        return JSON.parse(decrypted) as T;
      } catch {
        return defaultValue;
      }
    },
    save: async (value: T) => {
      try {
        const payload = await encryptValue(JSON.stringify(value));
        storage.setItem(storageKey, payload);
      } catch {
        storage.setItem(storageKey, fallbackEncrypt(JSON.stringify(value)));
      }
    },
    clear: async () => {
      storage.removeItem(storageKey);
    },
  };
}

export default createEncryptedStore;
