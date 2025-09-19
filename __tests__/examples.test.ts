import { runLoggerExample } from '@/examples/logger';
import { runPubSubExample } from '@/examples/pubsub';

const { runEnvValidationExample } = require('@/examples/env-validation.js');

describe('code examples', () => {
  it('logger example redacts sensitive metadata', () => {
    const entries = runLoggerExample();
    expect(entries).toHaveLength(2);
    const [infoEntry, errorEntry] = entries;

    expect(infoEntry.level).toBe('info');
    expect(infoEntry.message).toBe('Booting logger example');
    expect(infoEntry.meta).toMatchObject({ user: 'alice' });
    expect(infoEntry.meta).not.toHaveProperty('password');

    expect(errorEntry.meta).toMatchObject({ reason: 'demo-only' });
    expect(errorEntry.meta).not.toHaveProperty('token');
  });

  it('env validation example parses public and server envs', () => {
    const { publicEnv, serverEnv } = runEnvValidationExample();
    expect(publicEnv).toMatchObject({
      NEXT_PUBLIC_ENABLE_ANALYTICS: 'true',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    });
    expect(serverEnv).toMatchObject({ RECAPTCHA_SECRET: 'dummy-secret' });
  });

  it('pubsub example stops emitting after unsubscribe', () => {
    const payloads = runPubSubExample();
    expect(payloads).toEqual([
      { status: 'connected' },
      { status: 'processing', detail: 'step-1' },
    ]);
  });
});
