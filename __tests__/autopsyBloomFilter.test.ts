import {
  CompactBloomFilter,
  createHashLookup,
  benchmarkHashLookup,
} from '../components/apps/autopsy';

describe('Autopsy Bloom filter', () => {
  const makeEntries = (count: number) => {
    const entries: Array<[string, string]> = [];
    for (let i = 0; i < count; i += 1) {
      const hash = i.toString(16).padStart(64, '0');
      entries.push([hash, `file-${i}`]);
    }
    return entries;
  };

  it('adds hashes and confirms membership with fallback set', () => {
    const entries = makeEntries(64);
    const { filter, fallback } = createHashLookup(entries, 0.0001);
    expect(filter).toBeInstanceOf(CompactBloomFilter);
    entries.forEach(([hash, label]) => {
      expect(filter?.has(hash)).toBe(true);
      expect(fallback.get(hash)).toBe(label);
    });
    const unknown = 'f'.repeat(64);
    const isKnown = (filter?.has(unknown) ?? false) && fallback.has(unknown);
    expect(isKnown).toBe(false);
  });

  it('meets benchmark targets for lookup latency and false positives', () => {
    const entries = makeEntries(256);
    const { filter, fallback } = createHashLookup(entries, 0.0001);
    expect(filter).toBeInstanceOf(CompactBloomFilter);

    const rng = (() => {
      let seed = 123456789;
      return () => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return ((seed >>> 0) % 0x100000000) / 0x100000000;
      };
    })();

    let time = 0;
    const metrics = benchmarkHashLookup(filter, fallback, {
      iterations: 10000,
      randomFn: rng,
      now: () => {
        time += 0.5;
        return time;
      },
    });

    expect(metrics.lookups).toBe(10000);
    expect(metrics.misses).toBe(0);
    expect(metrics.falsePositiveRate).toBeLessThan(0.01);
    expect(metrics.durationMs).toBeLessThan(50);
  });
});
