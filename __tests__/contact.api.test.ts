import handler, { rateLimit, RATE_LIMIT_WINDOW_MS } from '../pages/api/contact';
import { createMocks } from 'node-mocks-http';

describe('contact api', () => {
  afterEach(() => {
    rateLimit.clear();
    jest.restoreAllMocks();
    delete (global as any).fetch;
    delete process.env.RECAPTCHA_SECRET;
  });

  test('returns 200 when inputs pass', async () => {
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ success: true }) });
    process.env.RECAPTCHA_SECRET = 'secret';

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
        purpose: 'hiring',
        honeypot: '',
        recaptchaToken: 'tok',
      },
    });
    (req.socket as any).remoteAddress = '2.2.2.2';

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ ok: true });
  });

  test('removes stale ip entries', async () => {
    const currentTime = 1_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(currentTime);
    rateLimit.set('1.1.1.1', {
      count: 1,
      start: currentTime - RATE_LIMIT_WINDOW_MS - 1,
    });

    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ success: true }) });
    process.env.RECAPTCHA_SECRET = 'secret';

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
        purpose: 'hiring',
        honeypot: '',
        recaptchaToken: 'tok',
      },
    });
    (req.socket as any).remoteAddress = '2.2.2.2';

    await handler(req as any, res as any);

    expect(rateLimit.has('1.1.1.1')).toBe(false);
    expect(rateLimit.has('2.2.2.2')).toBe(true);
    expect(res._getStatusCode()).toBe(200);
  });
});
