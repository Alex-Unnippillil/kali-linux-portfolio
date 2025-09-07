// @jest-environment node
const { validateServerEnv } = require('../lib/validate');

describe('validateServerEnv', () => {
  const baseEnv = {
    NEXT_PUBLIC_SUPABASE_URL: 'url',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    SUPABASE_URL: 'url',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    RATE_LIMIT_SECRET: 'rate',
    FLAGS_SECRET: 'flags',
    RECAPTCHA_SECRET: 'recaptcha',
  };

  it('does not throw when all required vars are present', () => {
    expect(() => validateServerEnv(baseEnv)).not.toThrow();
  });

  it('throws when required vars are missing', () => {
    const { RATE_LIMIT_SECRET, RECAPTCHA_SECRET, ...env } = baseEnv;
    expect(() => validateServerEnv(env)).toThrow(/RATE_LIMIT_SECRET/);
    expect(() => validateServerEnv(env)).toThrow(/RECAPTCHA_SECRET/);
  });
});
