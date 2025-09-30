import type { FeatureFlagMetadata } from '../lib/featureFlags';

describe('feature flag metadata aggregation', () => {
  const originalEnv = process.env;

  const loadMetadata = () => {
    let metadata: FeatureFlagMetadata[] = [];
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      const { getFeatureFlagMetadata } = require('../lib/featureFlags');
      metadata = getFeatureFlagMetadata();
    });
    return metadata;
  };

  const getFlag = (flags: FeatureFlagMetadata[], key: string) =>
    flags.find((flag) => flag.key === key);

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
    delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_ROLLOUT;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    delete process.env.FEATURE_TOOL_APIS;
    delete process.env.FEATURE_TOOL_APIS_ROLLOUT;
    delete process.env.FEATURE_HYDRA;
    delete process.env.FEATURE_HYDRA_ROLLOUT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('exposes default disabled values when no env vars are set', () => {
    const metadata = loadMetadata();
    const analytics = getFlag(metadata, 'NEXT_PUBLIC_ENABLE_ANALYTICS');
    const hydra = getFlag(metadata, 'FEATURE_HYDRA');

    expect(analytics?.enabled).toBe(false);
    expect(analytics?.source).toBe('default');
    expect(hydra?.enabled).toBe(false);
  });

  it('reads enabled state and rollout overrides from the environment', () => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_ROLLOUT = '42.5';

    const metadata = loadMetadata();
    const analytics = getFlag(metadata, 'NEXT_PUBLIC_ENABLE_ANALYTICS');

    expect(analytics?.enabled).toBe(true);
    expect(analytics?.rolloutPercentage).toBe(42.5);
    expect(analytics?.source).toBe('environment');
  });

  it('enforces required dependencies before enabling a flag', () => {
    process.env.FEATURE_TOOL_APIS = 'disabled';
    process.env.FEATURE_HYDRA = 'enabled';

    let metadata = loadMetadata();
    let hydra = getFlag(metadata, 'FEATURE_HYDRA');
    expect(hydra?.enabled).toBe(false);
    expect(hydra?.notes).toMatch(/Requires/i);

    process.env.FEATURE_TOOL_APIS = 'enabled';
    jest.resetModules();
    metadata = loadMetadata();
    hydra = getFlag(metadata, 'FEATURE_HYDRA');
    expect(hydra?.enabled).toBe(true);
  });
});
