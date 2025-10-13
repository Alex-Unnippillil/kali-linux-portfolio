import { loadPublicEnv, loadServerEnv } from '../lib/env';

describe('environment schema', () => {
  it('parses defaults for optional client flags', () => {
    const env = loadPublicEnv({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);

    expect(env.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe(false);
    expect(env.NEXT_PUBLIC_DEMO_MODE).toBe(false);
    expect(env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY).toBeUndefined();
  });

  it('normalizes blank strings to undefined', () => {
    const env = loadPublicEnv({
      NODE_ENV: 'development',
      NEXT_PUBLIC_RECAPTCHA_SITE_KEY: '   ',
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    } as NodeJS.ProcessEnv);

    expect(env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY).toBeUndefined();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeUndefined();
  });

  it('fails fast when production secrets are missing', () => {
    expect(() =>
      loadServerEnv({
        NODE_ENV: 'production',
      } as NodeJS.ProcessEnv)
    ).toThrow(/RECAPTCHA_SECRET/);
  });

  it('rejects invalid feature toggle values', () => {
    expect(() =>
      loadServerEnv({
        NODE_ENV: 'development',
        FEATURE_TOOL_APIS: 'maybe',
      } as NodeJS.ProcessEnv)
    ).toThrow(/FEATURE_TOOL_APIS/);
  });

  it('requires Supabase credentials to be paired', () => {
    expect(() =>
      loadServerEnv({
        NODE_ENV: 'development',
        SUPABASE_URL: 'https://example.supabase.co',
      } as NodeJS.ProcessEnv)
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);

    expect(() =>
      loadServerEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      } as NodeJS.ProcessEnv)
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
