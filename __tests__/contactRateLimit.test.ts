import handler, {
  rateLimit,
  RATE_LIMIT_WINDOW_MS,
  subscribeToRateLimit,
  clearRateLimitSubscribers,
} from '../pages/api/contact';
import { resetEmailTestOutbox } from '../lib/email/provider';

describe('contact api rate limiter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    rateLimit.clear();
    delete (global as any).fetch;
    delete process.env.RECAPTCHA_SECRET;
    delete process.env.EMAIL_PROVIDER;
    delete process.env.CONTACT_EMAIL_TO;
    delete process.env.CONTACT_EMAIL_FROM;
    clearRateLimitSubscribers();
    resetEmailTestOutbox();
  });

  it('removes stale IP entries', async () => {
    const baseTime = 1_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(baseTime);

    rateLimit.set('1.1.1.1', { count: 1, start: baseTime - RATE_LIMIT_WINDOW_MS - 1 });

    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ success: true }) });
    process.env.RECAPTCHA_SECRET = 'secret';
    process.env.EMAIL_PROVIDER = 'test';
    process.env.CONTACT_EMAIL_TO = 'owner@example.com';
    process.env.CONTACT_EMAIL_FROM = 'portfolio@example.com';
    const req: any = {
      method: 'POST',
      headers: { 'x-csrf-token': 'token', cookie: 'csrfToken=token' },
      cookies: { csrfToken: 'token' },
      socket: { remoteAddress: '2.2.2.2' },
      body: {
        name: 'Alex',
        email: 'alex@example.com',
        message: 'Hello',
        honeypot: '',
        recaptchaToken: 'tok',
      },
    };
    const res: any = {};
    res.status = () => res;
    res.json = () => {};

    const events: any[] = [];
    subscribeToRateLimit((event) => events.push(event));

    await handler(req, res);

    expect(rateLimit.has('1.1.1.1')).toBe(false);
    expect(rateLimit.has('2.2.2.2')).toBe(true);
    expect(events.some((event) => event.type === 'reset')).toBe(true);
  });
});
