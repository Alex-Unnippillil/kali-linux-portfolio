import { createMocks } from 'node-mocks-http';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
  },
}));

describe('mirrorbits status api', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('returns stale when record missing', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    const { default: handler } = await import('../pages/api/mirrorbits');
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(503);
    expect(JSON.parse(res._getData()).stale).toBe(true);
  });

  it('flags stale records over 30 minutes', async () => {
    const { kv } = require('@vercel/kv');
    kv.get.mockResolvedValueOnce({
      status: 200,
      checkedAt: Date.now() - 31 * 60 * 1000,
    });
    const { req, res } = createMocks({ method: 'GET' });
    const { default: handler } = await import('../pages/api/mirrorbits');
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).stale).toBe(true);
  });

  it('returns fresh data', async () => {
    const { kv } = require('@vercel/kv');
    kv.get.mockResolvedValueOnce({
      status: 200,
      checkedAt: Date.now(),
    });
    const { req, res } = createMocks({ method: 'GET' });
    const { default: handler } = await import('../pages/api/mirrorbits');
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).stale).toBe(false);
  });
});
