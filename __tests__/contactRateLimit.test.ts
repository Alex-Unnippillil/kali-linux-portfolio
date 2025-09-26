import handler, {
  contactRateLimiter,
  RATE_LIMIT_WINDOW_MS,
} from '../pages/api/contact';

describe('contact api rate limiter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    contactRateLimiter.reset();
    delete (global as any).fetch;
    delete process.env.RECAPTCHA_SECRET;
  });

  it('removes stale IP entries', async () => {
    const baseTime = 1_000_000;
    const dateSpy = jest.spyOn(Date, 'now');
    dateSpy
      .mockReturnValueOnce(baseTime - RATE_LIMIT_WINDOW_MS - 1)
      .mockReturnValue(baseTime);

    contactRateLimiter.check('1.1.1.1');

    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ success: true }) });
    process.env.RECAPTCHA_SECRET = 'secret';
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

    await handler(req, res);

    expect(contactRateLimiter.has('1.1.1.1')).toBe(false);
    expect(contactRateLimiter.has('2.2.2.2')).toBe(true);
  });
});
