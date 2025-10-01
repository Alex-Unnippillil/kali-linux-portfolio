import {
  getSecureItem,
  setSecureItem,
  rotateSecureItem,
  removeSecureItem,
} from '../utils/secureStore';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const globalAny = global as typeof globalThis & { crypto?: Crypto };

describe('secureStore', () => {
  const originalCrypto = globalAny.crypto;

  const mockWebCrypto = () => {
    let storedPlaintext = '';
    let currentPassphrase = '';
    const cryptoMock = {
      getRandomValues: jest.fn((array: Uint8Array) => {
        for (let i = 0; i < array.length; i += 1) {
          // deterministic but non-zero values
          // ensures different buffers across calls
          // without relying on true randomness
          array[i] = ((i + 13) * 17) % 255;
        }
        return array;
      }),
      subtle: {
        importKey: jest.fn(async (_format, keyData: ArrayBuffer) => keyData),
        deriveKey: jest.fn(async (_algo, keyData: ArrayBuffer) => ({
          passphrase: decoder.decode(keyData),
        })),
        encrypt: jest.fn(async (_algo, key: { passphrase: string }, data: ArrayBuffer) => {
          storedPlaintext = decoder.decode(data);
          currentPassphrase = key.passphrase;
          return encoder.encode(`enc:${storedPlaintext}`).buffer;
        }),
        decrypt: jest.fn(async (_algo, key: { passphrase: string }) => {
          if (!storedPlaintext) {
            throw new Error('No data');
          }
          if (key.passphrase !== currentPassphrase) {
            throw new Error('Mismatched passphrase');
          }
          return encoder.encode(storedPlaintext).buffer;
        }),
      },
    } as unknown as Crypto;
    Object.defineProperty(global, 'crypto', {
      value: cryptoMock,
      configurable: true,
    });
    return cryptoMock;
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    if (originalCrypto) {
      Object.defineProperty(global, 'crypto', {
        value: originalCrypto,
        configurable: true,
      });
    } else {
      delete globalAny.crypto;
    }
  });

  it('encrypts and decrypts values using WebCrypto', async () => {
    const cryptoMock = mockWebCrypto();
    await setSecureItem('secret-item', { foo: 'bar' }, 'passphrase');
    expect(cryptoMock.subtle.encrypt).toHaveBeenCalled();
    const stored = localStorage.getItem('secret-item');
    expect(stored).toBeTruthy();
    const envelope = JSON.parse(String(stored));
    expect(envelope.algorithm).toBe('AES-GCM');
    expect(envelope.ciphertext).toBeDefined();
    const result = await getSecureItem<{ foo: string }>('secret-item', 'passphrase');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('supports passphrase rotation', async () => {
    mockWebCrypto();
    await setSecureItem('rotate-item', { value: 123 }, 'old-pass');
    await rotateSecureItem('rotate-item', 'old-pass', 'new-pass');
    await expect(getSecureItem('rotate-item', 'old-pass')).rejects.toMatchObject({
      code: 'INVALID_PASSPHRASE',
    });
    const rotated = await getSecureItem<{ value: number }>('rotate-item', 'new-pass');
    expect(rotated?.value).toBe(123);
  });

  it('detects corrupted payloads', async () => {
    mockWebCrypto();
    await setSecureItem('corrupt-item', { ok: true }, 'secret');
    const raw = localStorage.getItem('corrupt-item');
    expect(raw).toBeTruthy();
    if (raw) {
      localStorage.setItem('corrupt-item', `${raw.slice(0, -2)}xx`);
    }
    await expect(getSecureItem('corrupt-item', 'secret')).rejects.toMatchObject({
      code: 'INVALID_PASSPHRASE',
    });
  });

  it('returns null when no secure data exists', async () => {
    mockWebCrypto();
    removeSecureItem('missing-item');
    await expect(getSecureItem('missing-item', 'pass')).resolves.toBeNull();
  });

  it('rejects empty passphrases', async () => {
    mockWebCrypto();
    await expect(setSecureItem('empty', 'value', ''))
      .rejects.toMatchObject({ code: 'INVALID_PASSPHRASE' });
  });
});
