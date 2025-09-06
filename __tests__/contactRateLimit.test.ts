import handler, { RATE_LIMIT_COOKIE, RATE_LIMIT_WINDOW_MS } from '../pages/api/contact';
import { createMocks } from 'node-mocks-http';
import { sign, unsign } from '@tinyhttp/cookie-signature';

describe('contact api rate limiter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).fetch;
    delete process.env.RECAPTCHA_SECRET;
    delete process.env.RATE_LIMIT_SECRET;
  });

  it('removes stale timestamp entries', async () => {
    const baseTime = 1_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(baseTime);

    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ success: true }) });
    process.env.RECAPTCHA_SECRET = 'secret';
    process.env.RATE_LIMIT_SECRET = 'ratelimit';

    const old = baseTime - RATE_LIMIT_WINDOW_MS - 1;
    const signed = sign(JSON.stringify([old]), 'ratelimit');

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-csrf-token': 'token',
        cookie: `csrfToken=token; ${RATE_LIMIT_COOKIE}=${encodeURIComponent(signed)}`,
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

    const setCookie = res.getHeader('Set-Cookie');
    const cookieStr = Array.isArray(setCookie)
      ? setCookie.find((c) => c.startsWith(`${RATE_LIMIT_COOKIE}=`))
      : setCookie;
    const value = decodeURIComponent(cookieStr.split(';')[0].split('=')[1]);
    const arr = JSON.parse(unsign(value, 'ratelimit'));
    expect(arr).toHaveLength(1);
    expect(arr[0]).toBe(baseTime);
    expect(res._getStatusCode()).toBe(200);
  });
});

