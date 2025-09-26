import crypto from 'crypto';
import { createMocks } from 'node-mocks-http';
import handler, { MIN_PASSWORD_LENGTH } from '../pages/api/hibp-check';

describe('hibp-check api', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).fetch;
  });

  it('returns breach count when password is found', async () => {
    const password = 'hunter' + 'x'.repeat(MIN_PASSWORD_LENGTH - 6 + 1);
    const hash = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(`${suffix}:42\nOTHERHASH:1`),
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { password },
    });

    await handler(req as any, res as any);

    expect((global as any).fetch).toHaveBeenCalledWith(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      expect.objectContaining({
        method: 'GET',
        headers: { 'Add-Padding': 'true' },
      }),
    );
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ ok: true, count: 42, breached: true });
  });

  it('rejects invalid payloads', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { password: 'short' },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ ok: false, code: 'invalid_password' });
    expect((global as any).fetch).toBeUndefined();
  });

  it('returns throttled response when hibp responds with 429', async () => {
    const password = 'validPassword123';

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve(''),
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { password },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(429);
    expect(res._getJSONData()).toEqual({ ok: false, code: 'hibp_throttled' });
  });
});
