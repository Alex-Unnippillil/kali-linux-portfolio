import { batchLookupVendors, getCacheStats, lookupVendor, resetOuiCache } from '../utils/ouiLookup';

describe('ouiLookup', () => {
  beforeEach(() => {
    resetOuiCache();
  });

  it('caches resolved vendors for repeated lookups', () => {
    expect(getCacheStats()).toEqual({ cacheSize: 0, mapSize: 0 });
    const vendor = lookupVendor('00:11:22:33:44:55');
    expect(vendor).toBe('Acme Corp');
    const afterFirstLookup = getCacheStats();
    expect(afterFirstLookup.cacheSize).toBe(1);
    expect(afterFirstLookup.mapSize).toBeGreaterThan(0);

    const repeatedVendor = lookupVendor('00:11:22:33:44:55');
    expect(repeatedVendor).toBe('Acme Corp');
    expect(getCacheStats().cacheSize).toBe(1);

    const otherVendor = lookupVendor('66:77:88:00:00:01');
    expect(otherVendor).toBe('Globex');
    expect(getCacheStats().cacheSize).toBe(2);
  });

  it('handles invalid addresses gracefully', () => {
    expect(lookupVendor('not-a-mac')).toBe('Unknown');
    expect(lookupVendor(undefined)).toBe('Unknown');
    expect(lookupVendor(null)).toBe('Unknown');
  });

  it('performs batch lookups under 80ms for 100 addresses', () => {
    // Warm the map to isolate batch performance.
    lookupVendor('00:11:22:00:00:00');

    const macs = Array.from({ length: 100 }, (_, index) => {
      const base = index % 2 === 0 ? '00:11:22' : '66:77:88';
      const suffix = index.toString(16).padStart(6, '0');
      const pairs = [suffix.slice(0, 2), suffix.slice(2, 4), suffix.slice(4, 6)];
      return `${base}:${pairs.join(':')}`;
    });

    const start = performance.now();
    const vendors = batchLookupVendors(macs);
    const duration = performance.now() - start;

    expect(vendors).toHaveLength(100);
    expect(vendors.filter((v) => v === 'Acme Corp').length).toBeGreaterThan(0);
    expect(vendors.filter((v) => v === 'Globex').length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(80);
  });
});
