import {
  evaluateFlags,
  mergeFlagOverrides,
  parseFlagOverridesFromQuery,
} from '../../lib/flags';

describe('flag evaluation', () => {
  const definitions = {
    test: {
      rolloutPercentage: 25,
    },
  } as const;

  it('buckets users deterministically for a given seed', () => {
    const firstPass = evaluateFlags(definitions, 'seed-2');
    const secondPass = evaluateFlags(definitions, 'seed-2');

    expect(firstPass.test).toBe(true);
    expect(secondPass.test).toBe(true);

    const differentSeed = evaluateFlags(definitions, 'seed-0');
    expect(differentSeed.test).toBe(false);
  });

  it('respects overrides from query parameters', () => {
    const overrides = parseFlagOverridesFromQuery({ 'flag:test': 'false' });
    const evaluated = evaluateFlags(definitions, 'seed-2', overrides);

    expect(overrides.test).toBe(false);
    expect(evaluated.test).toBe(false);
  });

  it('merges overrides with later sources taking priority', () => {
    const storage = { test: false };
    const query = { test: true };
    const merged = mergeFlagOverrides(storage, query);

    expect(merged.test).toBe(true);
  });
});

