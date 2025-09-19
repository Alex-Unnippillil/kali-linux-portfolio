import { renderHook } from '@testing-library/react';
import {
  getFeatureFlagValue,
  useFeatureFlag,
  useFeatureFlags,
} from '../hooks/useFeatureFlags';
import { featureFlagRegistry, type FeatureFlagId } from '../types/featureFlags';

describe('feature flag registry', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_FLAG_BETA_BADGE;
    delete process.env.NEXT_PUBLIC_FLAG_METASPLOIT_DEMO_MODE;
    delete process.env.NEXT_PUBLIC_FLAG_UI_EXPERIMENTS;
    delete process.env.NEXT_PUBLIC_SHOW_BETA;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    delete process.env.NEXT_PUBLIC_UI_EXPERIMENTS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('validates registry contents via zod', () => {
    expect(featureFlagRegistry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'beta_badge', type: 'boolean' }),
      ])
    );
  });

  it('returns defaults when no overrides are present', () => {
    expect(getFeatureFlagValue('beta_badge')).toBe(false);
    expect(getFeatureFlagValue('metasploit_demo_mode')).toBe(false);
  });

  it('prefers explicit overrides over defaults', () => {
    process.env.NEXT_PUBLIC_FLAG_BETA_BADGE = 'true';
    process.env.NEXT_PUBLIC_FLAG_METASPLOIT_DEMO_MODE = '1';
    expect(getFeatureFlagValue('beta_badge')).toBe(true);
    expect(getFeatureFlagValue('metasploit_demo_mode')).toBe(true);
  });

  it('supports legacy environment variable names as fallback', () => {
    process.env.NEXT_PUBLIC_SHOW_BETA = '1';
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    expect(getFeatureFlagValue('beta_badge')).toBe(true);
    expect(getFeatureFlagValue('metasploit_demo_mode')).toBe(true);
  });

  it('throws when accessing unknown flag ids', () => {
    expect(() =>
      getFeatureFlagValue('unknown' as unknown as FeatureFlagId)
    ).toThrow('Unknown feature flag "unknown"');
    expect(() =>
      renderHook(() => useFeatureFlag('unknown' as unknown as FeatureFlagId))
    ).toThrow('Unknown feature flag "unknown"');
  });

  it('exposes hook helpers for components', () => {
    const { result } = renderHook(() => useFeatureFlag('beta_badge'));
    expect(result.current).toBe(false);

    process.env.NEXT_PUBLIC_FLAG_BETA_BADGE = 'true';
    const rerendered = renderHook(() => useFeatureFlags());
    expect(rerendered.result.current.beta_badge).toBe(true);
  });
});
