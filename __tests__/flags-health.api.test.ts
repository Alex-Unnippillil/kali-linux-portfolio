import { createMocks } from 'node-mocks-http';
import handler, { snapshotFlags } from '../pages/api/flags/health';

describe('flags health api', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('produces a snapshot of feature flags', () => {
    const env = {
      FEATURE_TOOL_APIS: 'enabled',
      FEATURE_HYDRA: 'disabled',
      FEATURE_EXPERIMENTAL: 'enabled',
    } as NodeJS.ProcessEnv;

    const snapshot = snapshotFlags(env);

    expect(snapshot.flags).toEqual({
      FEATURE_EXPERIMENTAL: { enabled: true, value: 'enabled' },
      FEATURE_HYDRA: { enabled: false, value: 'disabled' },
      FEATURE_TOOL_APIS: { enabled: true, value: 'enabled' },
    });
    expect(snapshot.enabledGates).toEqual([
      'FEATURE_EXPERIMENTAL',
      'FEATURE_TOOL_APIS',
    ]);
  });

  it('returns the current flag state over HTTP', async () => {
    process.env.FEATURE_TOOL_APIS = 'enabled';
    process.env.FEATURE_HYDRA = 'disabled';

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()).toMatchObject({ 'cache-control': 'no-store' });

    const body = res._getJSONData();
    expect(body.ok).toBe(true);
    expect(typeof body.timestamp).toBe('string');
    expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
    expect(body.enabledGates).toEqual(['FEATURE_TOOL_APIS']);
    expect(body.flags).toMatchObject({
      FEATURE_TOOL_APIS: { enabled: true, value: 'enabled' },
      FEATURE_HYDRA: { enabled: false, value: 'disabled' },
    });
  });

  it('rejects non-GET methods', async () => {
    const { req, res } = createMocks({ method: 'POST' });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({ error: 'Method Not Allowed' });
  });
});
