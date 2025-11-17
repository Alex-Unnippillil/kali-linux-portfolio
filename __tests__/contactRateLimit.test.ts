import handler, { rateLimit, RATE_LIMIT_MAX } from '../pages/api/contact';
import { createMocks } from 'node-mocks-http';

const buildRequest = (ip) => {
  const { req, res } = createMocks({
    method: 'POST',
    headers: {
      'x-csrf-token': 'token',
      cookie: 'csrfToken=token',
    },
    cookies: { csrfToken: 'token' },
    body: {
      name: 'Alex',
      email: 'alex@example.com',
      message: 'Hello',
      honeypot: '',
      recaptchaToken: 'tok',
    },
  });
  (req.socket as any).remoteAddress = ip;
  return { req, res };
};

describe('contact api rate limiter', () => {
  beforeEach(() => {
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ success: true }) });
    process.env.RECAPTCHA_SECRET = 'secret';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    rateLimit.clear();
    delete (global as any).fetch;
    delete process.env.RECAPTCHA_SECRET;
  });

  it('removes stale IP entries', async () => {
    rateLimit.set('1.1.1.1', { count: 1 }, { ttl: 1 });
    await new Promise((resolve) => setTimeout(resolve, 5));

    const { req, res } = buildRequest('2.2.2.2');
    await handler(req as any, res as any);

    expect(rateLimit.has('1.1.1.1')).toBe(false);
    expect(rateLimit.get('2.2.2.2')).toEqual({ count: 1 });
  });

  it('limits bursts within the sliding window', async () => {
    const ip = '3.3.3.3';

    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      const { req, res } = buildRequest(ip);
      await handler(req as any, res as any);
      expect(res._getStatusCode()).toBe(200);
    }

    const { req: limitedReq, res: limitedRes } = buildRequest(ip);
    await handler(limitedReq as any, limitedRes as any);

    expect(limitedRes._getStatusCode()).toBe(429);
    expect(limitedRes._getJSONData()).toEqual({ ok: false, code: 'rate_limit' });
  });

  it('allows requests after the TTL expires', async () => {
    const ip = '4.4.4.4';
    rateLimit.set(ip, { count: RATE_LIMIT_MAX }, { ttl: 5 });
    await new Promise((resolve) => setTimeout(resolve, 10));

    const { req, res } = buildRequest(ip);
    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    expect(rateLimit.get(ip)).toEqual({ count: 1 });
  });
});
