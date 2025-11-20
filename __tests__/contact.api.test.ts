import handler, {
  contactRateLimiter,
  CONTACT_RATE_LIMIT_WINDOW_MS,
} from '../pages/api/contact';
import { createMocks } from 'node-mocks-http';

const originalNodeEnv = process.env.NODE_ENV;

describe('contact api', () => {
  afterEach(() => {
    contactRateLimiter.clear();
    jest.restoreAllMocks();
    delete (global as any).fetch;
    delete process.env.RECAPTCHA_SECRET;
    delete process.env.CONTACT_SECURITY_MODE;
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
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(currentTime);
    contactRateLimiter.clear();
    nowSpy.mockReturnValue(currentTime - CONTACT_RATE_LIMIT_WINDOW_MS - 1);
    contactRateLimiter.attempt('1.1.1.1');
    nowSpy.mockReturnValue(currentTime);

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

    const result = contactRateLimiter.attempt('1.1.1.1');
    expect(result.success).toBe(true);
    expect(res._getStatusCode()).toBe(200);
  });
});
