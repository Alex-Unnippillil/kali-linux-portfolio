"use client";

import { safeLocalStorage } from './safeStorage';

const KEY_MATERIAL = 'kali-hydra-credsets::material';
const KEY_SALT = 'kali-hydra-credsets::salt-v1';

interface SecurePayload {
  version: number;
  iv: string;
  data: string;
}

const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

const getCrypto = () =>
  (typeof globalThis !== 'undefined' && (globalThis.crypto || (globalThis as any).msCrypto)) ||
  undefined;

let keyPromise: Promise<CryptoKey | null> | null = null;

const deriveKey = async (): Promise<CryptoKey | null> => {
  const crypto = getCrypto();
  if (!crypto?.subtle || !textEncoder) return null;
  if (!keyPromise) {
    keyPromise = (async () => {
      const material = await crypto.subtle.importKey(
        'raw',
        textEncoder.encode(KEY_MATERIAL),
        'PBKDF2',
        false,
        ['deriveKey'],
      );
      return crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: textEncoder.encode(KEY_SALT),
          iterations: 150000,
          hash: 'SHA-256',
        },
        material,
        {
          name: 'AES-GCM',
          length: 256,
        },
        false,
        ['encrypt', 'decrypt'],
      );
    })().catch(() => null);
  }
  return keyPromise;
};

const toBase64 = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
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

const isSecurePayload = (value: unknown): value is SecurePayload =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'version' in value &&
      'iv' in value &&
      'data' in value,
  );

export const secureSave = async (storageKey: string, value: unknown): Promise<void> => {
  if (!safeLocalStorage) return;
  const crypto = getCrypto();
  const key = await deriveKey();
  try {
    if (key && crypto?.subtle && textEncoder) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = textEncoder.encode(JSON.stringify(value));
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
      const payload: SecurePayload = {
        version: 1,
        iv: toBase64(iv),
        data: toBase64(encrypted),
      };
      safeLocalStorage.setItem(storageKey, JSON.stringify(payload));
      return;
    }
  } catch {
    // fall through to plain storage
  }
  safeLocalStorage.setItem(storageKey, JSON.stringify(value));
};

export const secureLoad = async <T>(storageKey: string, fallback: T): Promise<T> => {
  if (!safeLocalStorage) return fallback;
  const raw = safeLocalStorage.getItem(storageKey);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (isSecurePayload(parsed)) {
      const key = await deriveKey();
      const crypto = getCrypto();
      if (!key || !crypto?.subtle || !textDecoder) return fallback;
      const iv = fromBase64(parsed.iv);
      const data = fromBase64(parsed.data);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data,
      );
      return JSON.parse(textDecoder.decode(decrypted));
    }
    return parsed as T;
  } catch {
    return fallback;
  }
};

export const secureRemove = (storageKey: string): void => {
  safeLocalStorage?.removeItem(storageKey);
};
