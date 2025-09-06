import handler, { RATE_LIMIT_COOKIE } from '../pages/api/contact';
import { createMocks } from 'node-mocks-http';
import { unsign } from '@tinyhttp/cookie-signature';

describe('contact api', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).fetch;
    delete process.env.RECAPTCHA_SECRET;
    delete process.env.RATE_LIMIT_SECRET;
  });

  test('returns 200 when inputs pass', async () => {
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ success: true }) });
    process.env.RECAPTCHA_SECRET = 'secret';
    process.env.RATE_LIMIT_SECRET = 'ratelimit';

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
    (req.socket as any).remoteAddress = '2.2.2.2';

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ ok: true });

    const setCookie = res.getHeader('Set-Cookie');
    const cookieStr = Array.isArray(setCookie)
      ? setCookie.find((c) => c.startsWith(`${RATE_LIMIT_COOKIE}=`))
      : setCookie;
    expect(cookieStr).toBeDefined();
    const value = decodeURIComponent(
      cookieStr.split(';')[0].split('=')[1]
    );
    const arr = JSON.parse(unsign(value, 'ratelimit'));
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(1);
  });

  test('rate limits when cookie contains recent requests', async () => {
    const now = 1_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ success: true }) });
    process.env.RECAPTCHA_SECRET = 'secret';
    process.env.RATE_LIMIT_SECRET = 'ratelimit';

    const timestamps = Array.from({ length: 5 }, (_, i) => now - i * 1000);
    const signed = require('@tinyhttp/cookie-signature').sign(
      JSON.stringify(timestamps),
      'ratelimit'
    );

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-csrf-token': 'token',
        cookie: `csrfToken=token; ${RATE_LIMIT_COOKIE}=${encodeURIComponent(
          signed
        )}`,
      },
      cookies: { csrfToken: 'token', [RATE_LIMIT_COOKIE]: signed },
      body: {
        name: 'Alex',
        email: 'alex@example.com',
        message: 'Hello',
        honeypot: '',
        recaptchaToken: 'tok',
      },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(429);
  });
});
