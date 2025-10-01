import {
  encodeCacheValue,
  encodeCacheValueSync,
  decodeCacheValue,
  decodeCacheValueSync,
  isCacheRecord,
} from '../utils/cacheCompression';

describe('cacheCompression helpers', () => {
  it('returns identity envelopes when below threshold', async () => {
    const record = await encodeCacheValue({ foo: 'bar' }, { threshold: 1024 });

    expect(isCacheRecord(record)).toBe(true);
    expect(record.encoding).toBe('identity');
    expect(record.payload).toBe(JSON.stringify({ foo: 'bar' }));
    expect(record.originalSize).toBe(record.compressedSize);
  });

  it('round trips large payloads through async compression', async () => {
    const largePayload = 'a'.repeat(2048);

    const record = await encodeCacheValue(largePayload, { threshold: 0 });

    expect(record.encoding).toBe('gzip');
    expect(record.compressedSize).toBeLessThan(record.originalSize);

    const decoded = await decodeCacheValue<string>(record);
    expect(decoded).toBe(largePayload);
  });

  it('round trips large payloads through sync compression', () => {
    const largePayload = 'b'.repeat(4096);

    const record = encodeCacheValueSync(largePayload, { threshold: 0 });

    expect(record.encoding).toBe('gzip');
    expect(record.compressedSize).toBeLessThan(record.originalSize);

    const decoded = decodeCacheValueSync<string>(record);
    expect(decoded).toBe(largePayload);
  });

  it('passes through non-cache-record values unchanged', async () => {
    await expect(decodeCacheValue('passthrough')).resolves.toBe('passthrough');
    expect(decodeCacheValueSync('passthrough')).toBe('passthrough');
  });
});
