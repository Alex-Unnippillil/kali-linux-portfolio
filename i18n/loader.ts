import { DEFAULT_LOCALE, PACK_MANIFEST, SupportedLocale } from './manifest';

export interface LocalePack {
  locale: SupportedLocale;
  messages: Record<string, string>;
}

export class IntegrityError extends Error {
  readonly locale: SupportedLocale;
  readonly expected: string;
  readonly actual: string;

  constructor(locale: SupportedLocale, expected: string, actual: string) {
    super(`Integrity check failed for locale "${locale}": expected ${expected}, received ${actual}`);
    this.name = 'IntegrityError';
    this.locale = locale;
    this.expected = expected;
    this.actual = actual;
  }
}

const packCache = new Map<SupportedLocale, LocalePack>();
const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : undefined;
let nodeSubtle: SubtleCrypto | null | undefined;
let nodeSubtlePromise: Promise<SubtleCrypto | null> | null | undefined;

const toBase64 = (buffer: ArrayBuffer): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  throw new Error('Unable to convert ArrayBuffer to base64: environment lacks Buffer and btoa.');
};

const decodeUtf8 = (buffer: ArrayBuffer): string => {
  if (textDecoder) {
    return textDecoder.decode(buffer);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('utf-8');
  }

  throw new Error('Unable to decode locale pack: environment lacks TextDecoder and Buffer.');
};

const getSubtleCrypto = async (): Promise<SubtleCrypto | null> => {
  if (typeof globalThis !== 'undefined') {
    const cryptoFromGlobal = (globalThis as typeof globalThis & { crypto?: Crypto }).crypto;
    if (cryptoFromGlobal?.subtle) {
      return cryptoFromGlobal.subtle;
    }
  }

  if (nodeSubtle !== undefined) {
    return nodeSubtle;
  }

  if (typeof process !== 'undefined' && typeof process.versions?.node === 'string') {
    if (nodeSubtlePromise === undefined) {
      nodeSubtlePromise = import('crypto')
        .then((nodeCrypto) => nodeCrypto.webcrypto?.subtle ?? null)
        .catch(() => null);
    }

    nodeSubtle = await nodeSubtlePromise;
    return nodeSubtle;
  }

  return null;
};

const computeIntegrity = async (buffer: ArrayBuffer): Promise<string> => {
  const subtle = await getSubtleCrypto();
  if (!subtle) {
    throw new Error('SubtleCrypto is not available in this environment.');
  }

  const digest = await subtle.digest('SHA-384', buffer);
  return `sha384-${toBase64(digest)}`;
};

const loadLocalePackInternal = async (
  locale: SupportedLocale,
  visited: Set<SupportedLocale>,
): Promise<LocalePack> => {
  if (packCache.has(locale)) {
    return packCache.get(locale)!;
  }

  const manifestEntry = PACK_MANIFEST[locale];
  if (!manifestEntry) {
    throw new Error(`Unsupported locale: ${locale}`);
  }

  const response = await fetch(manifestEntry.path);
  if (!response.ok) {
    throw new Error(`Failed to load locale pack for ${locale}: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const computedIntegrity = await computeIntegrity(buffer);

  if (computedIntegrity !== manifestEntry.integrity) {
    const error = new IntegrityError(locale, manifestEntry.integrity, computedIntegrity);
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(error);
    }

    if (visited.has(locale)) {
      throw error;
    }
    visited.add(locale);

    const fallbackPack = await resolveFallback(locale, visited, error);
    packCache.set(locale, fallbackPack);
    return fallbackPack;
  }

  const jsonText = decodeUtf8(buffer);
  const pack = JSON.parse(jsonText) as LocalePack;
  packCache.set(locale, pack);
  return pack;
};

const resolveFallback = async (
  locale: SupportedLocale,
  visited: Set<SupportedLocale>,
  error: IntegrityError,
): Promise<LocalePack> => {
  if (packCache.has(locale)) {
    return packCache.get(locale)!;
  }

  if (locale !== DEFAULT_LOCALE) {
    const fallbackPack = await loadLocalePackInternal(DEFAULT_LOCALE, visited);
    return fallbackPack;
  }

  throw error;
};

export const loadLocalePack = async (locale: SupportedLocale): Promise<LocalePack> =>
  loadLocalePackInternal(locale, new Set());

export const clearLocalePackCache = (): void => {
  packCache.clear();
};

export const getCachedLocalePack = (locale: SupportedLocale): LocalePack | undefined =>
  packCache.get(locale);
