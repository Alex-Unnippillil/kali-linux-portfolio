import fs from 'fs';
import path from 'path';
import { webcrypto } from 'crypto';
import { loadLocalePack, clearLocalePackCache, getCachedLocalePack } from '@/i18n/loader';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, SupportedLocale } from '@/i18n/manifest';

const toArrayBuffer = (input: string): ArrayBuffer => {
  const buffer = Buffer.from(input, 'utf-8');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

const readPackFixture = (locale: SupportedLocale): string => {
  const filePath = path.join(process.cwd(), 'public', 'i18n', 'packs', `${locale}.json`);
  return fs.readFileSync(filePath, 'utf-8');
};

describe('loadLocalePack', () => {
  beforeAll(() => {
    // Ensure the loader has access to SubtleCrypto in the Jest environment.
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: webcrypto as unknown as Crypto,
    });
  });

  beforeEach(() => {
    clearLocalePackCache();
    jest.restoreAllMocks();
  });

  it('loads and caches locale packs when integrity matches', async () => {
    const locale: SupportedLocale = 'es';
    const packContents = readPackFixture(locale);
    const arrayBuffer = toArrayBuffer(packContents);

    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: async () => arrayBuffer,
      } as unknown as Response);

    const pack = await loadLocalePack(locale);
    expect(pack.locale).toBe(locale);
    expect(pack.messages['desktop.launch']).toBe('Iniciar');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const cachedPack = await loadLocalePack(locale);
    expect(cachedPack).toBe(pack);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the default locale when integrity validation fails', async () => {
    const locale: SupportedLocale = 'es';
    const invalidBuffer = toArrayBuffer('{"tampered":true}');
    const defaultBuffer = toArrayBuffer(readPackFixture(DEFAULT_LOCALE));

    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: async () => invalidBuffer,
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: async () => defaultBuffer,
      } as unknown as Response);

    const pack = await loadLocalePack(locale);
    expect(pack.locale).toBe(DEFAULT_LOCALE);
    expect(pack.messages['desktop.launch']).toBe('Launch');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const cachedFallback = await loadLocalePack(locale);
    expect(cachedFallback).toBe(pack);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when requesting an unsupported locale', async () => {
    const unsupportedLocale = 'fr' as SupportedLocale;
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    await expect(loadLocalePack(unsupportedLocale)).rejects.toThrow('Unsupported locale');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('exposes cached packs for supported locales', async () => {
    const locale: SupportedLocale = 'en';
    const buffer = toArrayBuffer(readPackFixture(locale));

    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => buffer,
    } as unknown as Response);

    expect(getCachedLocalePack(locale)).toBeUndefined();

    const pack = await loadLocalePack(locale);
    expect(getCachedLocalePack(locale)).toBe(pack);
  });

  it('has fixtures for all supported locales to keep manifest and packs in sync', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(() => readPackFixture(locale)).not.toThrow();
    }
  });
});
