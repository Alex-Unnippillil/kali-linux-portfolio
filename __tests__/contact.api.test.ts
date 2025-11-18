import handler, {
  rateLimit,
  RATE_LIMIT_WINDOW_MS,
  clearRateLimitSubscribers,
} from '../pages/api/contact';
import { createMocks } from 'node-mocks-http';
import {
  getEmailTestOutbox,
  resetEmailTestOutbox,
} from '../lib/email/provider';

const originalNodeEnv = process.env.NODE_ENV;

describe('contact api', () => {
  afterEach(() => {
    rateLimit.clear();
    jest.restoreAllMocks();
    delete (global as any).fetch;
    delete process.env.RECAPTCHA_SECRET;
    delete process.env.EMAIL_PROVIDER;
    delete process.env.CONTACT_EMAIL_TO;
    delete process.env.CONTACT_EMAIL_FROM;
    delete process.env.CONTACT_EMAIL_SUBJECT;
    delete process.env.RESEND_API_KEY;
    delete process.env.POSTMARK_SERVER_TOKEN;
    process.env.NODE_ENV = originalNodeEnv;
    resetEmailTestOutbox();
    clearRateLimitSubscribers();
  });

  test('issues secure csrf cookie when running in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RECAPTCHA_SECRET = 'secret';
    process.env.EMAIL_PROVIDER = 'console';

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
    process.env.EMAIL_PROVIDER = 'test';
    process.env.CONTACT_EMAIL_TO = 'owner@example.com';
    process.env.CONTACT_EMAIL_FROM = 'portfolio@example.com';

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
    const outbox = getEmailTestOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].replyTo).toBe('alex@example.com');
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
    process.env.EMAIL_PROVIDER = 'test';
    process.env.CONTACT_EMAIL_TO = 'owner@example.com';
    process.env.CONTACT_EMAIL_FROM = 'portfolio@example.com';

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
