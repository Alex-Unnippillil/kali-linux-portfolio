import { ThumbnailCache, estimateDataUrlSize } from '../components/system/thumbnailCache';

const createDataUrl = (byteSize: number): string => {
  const groups = Math.ceil(byteSize / 3);
  const base64Length = groups * 4;
  const base64 = 'A'.repeat(base64Length);
  return `data:image/png;base64,${base64}`;
};

describe('ThumbnailCache', () => {
  it('stores entries and tracks bytes', () => {
    const cache = new ThumbnailCache();
    const url = createDataUrl(512);
    const { stored, evicted } = cache.upsert('alpha', url);
    expect(stored).toBe(true);
    expect(evicted).toEqual([]);
    expect(cache.get('alpha')?.dataUrl).toBe(url);
    expect(cache.getTotalBytes()).toBe(estimateDataUrlSize(url));
  });

  it('evicts oldest entries when exceeding the budget', () => {
    const first = createDataUrl(400);
    const second = createDataUrl(400);
    const third = createDataUrl(400);
    const bytesFirst = estimateDataUrlSize(first);
    const bytesSecond = estimateDataUrlSize(second);
    const bytesThird = estimateDataUrlSize(third);
    const limit = bytesFirst + bytesSecond + bytesThird - Math.floor(bytesFirst / 2);
    const cache = new ThumbnailCache(limit);
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(10);
    cache.upsert('first', first);
    nowSpy.mockReturnValue(20);
    cache.upsert('second', second);
    nowSpy.mockReturnValue(30);
    const result = cache.upsert('third', third);
    expect(result.stored).toBe(true);
    expect(result.evicted).toEqual(['first']);
    expect(cache.get('first')).toBeUndefined();
    expect(cache.getTotalBytes()).toBe(bytesSecond + bytesThird);
    nowSpy.mockRestore();
  });

  it('skips entries larger than the cache budget', () => {
    const cache = new ThumbnailCache(1024);
    const huge = createDataUrl(4096);
    const hugeBytes = estimateDataUrlSize(huge);
    expect(hugeBytes).toBeGreaterThan(1024);
    const result = cache.upsert('huge', huge);
    expect(result.stored).toBe(false);
    expect(result.evicted).toEqual([]);
    expect(cache.get('huge')).toBeUndefined();
    expect(cache.getTotalBytes()).toBe(0);
  });

  it('prunes entries for windows that are no longer active', () => {
    const cache = new ThumbnailCache();
    const keepUrl = createDataUrl(256);
    const dropUrl = createDataUrl(320);
    cache.upsert('keep', keepUrl);
    cache.upsert('drop', dropUrl);
    const removed = cache.prune(new Set(['keep']));
    expect(removed).toEqual(['drop']);
    expect(cache.get('drop')).toBeUndefined();
    expect(cache.get('keep')).toBeDefined();
    expect(cache.getTotalBytes()).toBe(estimateDataUrlSize(keepUrl));
  });
});
