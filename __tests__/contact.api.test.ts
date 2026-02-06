import handler, { rateLimit, RATE_LIMIT_WINDOW_MS } from '../pages/api/contact';
import { createMocks } from 'node-mocks-http';

const originalNodeEnv = process.env.NODE_ENV;

describe('contact api', () => {
  const requiredEnv = {
    JWT_SECRET: 'jwt-secret',
    JWT_REFRESH_SECRET: 'jwt-refresh-secret',
    RATE_LIMIT_SECRET: 'rate-limit-secret',
    ADMIN_READ_KEY: 'admin-key',
    SUPABASE_URL: 'https://example.com',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    SUPABASE_ANON_KEY: 'anon-key',
  };

  beforeEach(() => {
    Object.assign(process.env, requiredEnv);
  });

  afterEach(() => {
    rateLimit.clear();
    jest.restoreAllMocks();
    delete (global as any).fetch;
    for (const key of Object.keys(requiredEnv)) {
      delete process.env[key];
    }
    delete process.env.RECAPTCHA_SECRET;
    process.env.NODE_ENV = originalNodeEnv;
  });

  test('issues secure csrf cookie when running in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RECAPTCHA_SECRET = 'secret';

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req as any, res as any);

    const setCookie =
      res.getHeader('Set-Cookie') ??
      res.getHeader('set-cookie') ??
      res._getHeaders()['set-cookie'];
    expect(setCookie).toBeTruthy();
    const cookieValue = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieValue).toContain('Secure');
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
