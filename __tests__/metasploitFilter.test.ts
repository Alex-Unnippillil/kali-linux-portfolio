import { performance } from 'perf_hooks';
import modules from '../apps/metasploit/moduleData';
import type { NormalizedModule } from '../apps/metasploit/moduleData';
import {
  createFilterCacheKey,
  filterModules,
  type ModuleFilters,
} from '../apps/metasploit/filterModules';

const hasMatch = (value: string, query: string) =>
  value.toLowerCase().includes(query);

describe('Metasploit module filtering', () => {
  it('filters by platform and rank correctly', () => {
    const filters: ModuleFilters = {
      platform: 'multi',
      rank: 'normal',
    };
    const results = filterModules(modules, filters);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((mod) => mod.platform === 'multi')).toBe(true);
    expect(results.every((mod) => mod.rank === 'normal')).toBe(true);
  });

  it('matches query terms across name and description', () => {
    const query = 'appletv';
    const results = filterModules(modules, { query });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (mod) =>
          hasMatch(mod.lowerName, query) || hasMatch(mod.lowerDescription, query),
      ),
    ).toBe(true);
  });

  it('completes filtering within 120ms for complex filters', () => {
    const filters: ModuleFilters = {
      query: 'password reset multi-stage',
      platform: 'multi',
      rank: 'normal',
      tag: 'admin',
    };

    // Warm up to avoid including first-call overhead in the measurement.
    filterModules(modules, filters);

    const start = performance.now();
    const results = filterModules(modules, filters);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(120);
    expect(results.every((mod) => mod.platform === 'multi')).toBe(true);
    expect(results.every((mod) => mod.rank === 'normal')).toBe(true);
    expect(results.every((mod) => mod.tagCache.includes('admin'))).toBe(true);
  });

  it('reuses cached results when available', () => {
    const filters: ModuleFilters = { query: 'payload', platform: 'multi' };
    const cache = new Map<string, NormalizedModule[]>();
    const key = createFilterCacheKey(filters);

    const first = filterModules(modules, filters, { cache, cacheKey: key });
    const second = filterModules(modules, filters, { cache, cacheKey: key });

    expect(first).toBe(second);
    expect(cache.get(key)).toBe(first);
  });
});
