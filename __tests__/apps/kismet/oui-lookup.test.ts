import { performance } from 'perf_hooks';

import ouiData from '@/apps/kismet/data/oui.json';
import {
  lookupVendor,
  lookupBatch,
  normalizeOui,
  __TEST__,
} from '@/components/apps/kismet/ouiLookup';

type OuiJson = typeof ouiData;

const entries = (ouiData as OuiJson).entries.split(';').filter(Boolean);

const toMac = (prefix: string): string | null => {
  const pairs = prefix.match(/.{1,2}/g);
  if (!pairs) return null;
  return `${pairs.join(':')}:00:00:00`;
};

describe('OUI lookup helper', () => {
  beforeEach(() => {
    __TEST__.clearCache();
  });

  it('normalizes MAC addresses to the expected prefix', () => {
    expect(normalizeOui('f0:ee:7a:12:34:56')).toBe('F0EE7A');
    expect(normalizeOui('AA-BB-CC-DD-EE-FF')).toBe('AABBCC');
    expect(normalizeOui('invalid')).toBeNull();
  });

  it('returns the vendor name for a known address', () => {
    expect(lookupVendor('F0-EE-7A-12-34-56')).toBe('Apple, Inc.');
  });

  it('uses the provided fallback when the vendor is missing', () => {
    const fallback = 'Mystery Vendor';
    expect(lookupVendor('FF-FF-FE-12-34-56', fallback)).toBe(fallback);
    expect(__TEST__.cacheSize()).toBe(1);
  });

  it('batch resolves vendors and shares cache entries', () => {
    const macs = [
      'F0:EE:7A:12:34:56',
      'F0-EE-7A-00-00-01',
      'AB:CD:EF:00:11:22',
    ];
    const result = lookupBatch(macs, 'Unknown');
    expect(result).toEqual(['Apple, Inc.', 'Apple, Inc.', 'Unknown']);
    expect(__TEST__.cacheSize()).toBe(2);
  });

  it('resolves one hundred entries in under eighty milliseconds', () => {
    const sample = entries.slice(0, 100);
    const addresses = sample
      .map((entry) => {
        const [prefix] = entry.split(':');
        return prefix ? toMac(prefix) : null;
      })
      .filter((mac): mac is string => Boolean(mac));

    expect(addresses).toHaveLength(100);

    // Warm up to populate the vendor map without cached prefixes.
    lookupBatch(addresses, 'Unknown');
    __TEST__.clearCache();

    const start = performance.now();
    const results = lookupBatch(addresses, 'Unknown');
    const duration = performance.now() - start;

    expect(results).toHaveLength(addresses.length);
    expect(__TEST__.cacheSize()).toBe(addresses.length);
    expect(duration).toBeLessThan(80);
  });
});
