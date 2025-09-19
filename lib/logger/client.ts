import { createConsoleLogger, fallbackCorrelationId, type Logger } from './base';

type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

function getGlobalCrypto(): CryptoLike | undefined {
  if (typeof globalThis !== 'object') {
    return undefined;
  }
  const cryptoObj = (globalThis as { crypto?: CryptoLike }).crypto;
  return cryptoObj;
}

function uuidFromRandomValues(cryptoObj: CryptoLike): string | undefined {
  if (typeof cryptoObj.getRandomValues !== 'function') {
    return undefined;
  }
  try {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return undefined;
  }
}

function generateCorrelationId(): string {
  const cryptoObj = getGlobalCrypto();
  if (cryptoObj) {
    if (typeof cryptoObj.randomUUID === 'function') {
      try {
        return cryptoObj.randomUUID();
      } catch {
        // continue to fallback
      }
    }

    const valueBased = uuidFromRandomValues(cryptoObj);
    if (valueBased) {
      return valueBased;
    }
  }

  return fallbackCorrelationId();
}

export function createLogger(correlationId: string = generateCorrelationId()): Logger {
  return createConsoleLogger(correlationId);
}

export type { Logger };
