import handler, { rateLimit, RATE_LIMIT_WINDOW_MS } from '../pages/api/contact';

type Res = ReturnType<typeof mockRes>;

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  res.end = jest.fn();
  return res;
}

describe('contact api rate limiter', () => {
  afterEach(() => {
    rateLimit.clear();
    jest.restoreAllMocks();
    delete (global as any).fetch;
    delete process.env.RECAPTCHA_SECRET_KEY;
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
    process.env.RECAPTCHA_SECRET_KEY = 'secret';
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
    const res: Res = mockRes();

    await handler(req, res);

    expect(rateLimit.has('1.1.1.1')).toBe(false);
    expect(rateLimit.has('2.2.2.2')).toBe(true);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

