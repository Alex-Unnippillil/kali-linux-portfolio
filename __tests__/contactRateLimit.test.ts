import handler, { contactRateLimiter } from '../pages/api/contact';
import { createMocks } from 'node-mocks-http';

describe('contact api rate limiter', () => {
  beforeEach(() => {
    contactRateLimiter.clear();
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ success: true }) });
    process.env.RECAPTCHA_SECRET = 'secret';
  });

  afterEach(() => {
    contactRateLimiter.clear();
    jest.restoreAllMocks();
    delete (global as any).fetch;
    delete process.env.RECAPTCHA_SECRET;
    delete process.env.CONTACT_RATE_LIMIT_BYPASS_SECRET;
  });

  const buildRequest = () => {
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
    (req.socket as any).remoteAddress = '9.9.9.9';
    return { req: req as any, res: res as any };
  };

  it('enforces the sliding window limit', async () => {
    for (let i = 0; i < 5; i += 1) {
      const { req, res } = buildRequest();
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
    }

    const { req, res } = buildRequest();
    await handler(req, res);

    expect(res._getStatusCode()).toBe(429);
    expect(res._getJSONData()).toEqual({ ok: false, code: 'rate_limit' });
  });

  it('allows requests with a bypass token', async () => {
    process.env.CONTACT_RATE_LIMIT_BYPASS_SECRET = 'bypass';

    for (let i = 0; i < 6; i += 1) {
      const { req, res } = buildRequest();
      req.headers['x-rate-limit-bypass'] = 'bypass';
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
    }
  });
});
