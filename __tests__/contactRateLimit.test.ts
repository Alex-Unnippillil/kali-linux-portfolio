import handler, { rateLimit, RATE_LIMIT_WINDOW_MS } from '../pages/api/contact';

describe('contact api rate limiter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    rateLimit.clear();
  });

  it('removes stale IP entries', () => {
    const baseTime = 1_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(baseTime);

    rateLimit.set('1.1.1.1', { count: 1, start: baseTime - RATE_LIMIT_WINDOW_MS - 1 });

    const req: any = {
      method: 'POST',
      headers: {},
      socket: { remoteAddress: '2.2.2.2' },
      body: { name: 'Alex', email: 'alex@example.com', message: 'Hello', honeypot: '' },
    };
    const res: any = {};
    res.status = () => res;
    res.json = () => {};

    handler(req, res);

    expect(rateLimit.has('1.1.1.1')).toBe(false);
    expect(rateLimit.has('2.2.2.2')).toBe(true);
  });
});
