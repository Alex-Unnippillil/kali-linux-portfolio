// @jest-environment node
const { validateServerEnv } = require('../lib/validate');

describe('validateServerEnv', () => {
  const baseEnv = {
    NEXT_PUBLIC_SUPABASE_URL: 'url',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  };

  it('does not throw when all required vars are present', () => {
    expect(() => validateServerEnv(baseEnv)).not.toThrow();
  });

  it('throws when required vars are missing', () => {
    const { NEXT_PUBLIC_SUPABASE_URL, ...env } = baseEnv;
    expect(() => validateServerEnv(env)).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('allows server-only secrets to be absent', () => {
    const env = { ...baseEnv, RATE_LIMIT_SECRET: undefined, RECAPTCHA_SECRET: undefined };
    expect(() => validateServerEnv(env)).not.toThrow();
  });
});
