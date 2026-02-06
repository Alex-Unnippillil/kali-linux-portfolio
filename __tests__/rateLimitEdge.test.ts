import rateLimitEdge, { clearRateLimitEdgeStore } from '@/lib/rateLimitEdge';

describe('rateLimitEdge helper', () => {
  const createRes = () => {
    const res: any = {
      statusCode: 200,
      body: undefined as unknown,
      headers: {} as Record<string, string>,
    };
    res.setHeader = (name: string, value: string) => {
      res.headers[name] = value;
    };
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (payload: unknown) => {
      res.body = payload;
      return res;
    };
    return res;
  };

  afterEach(() => {
    clearRateLimitEdgeStore();
  });

  it('allows requests under the limit and annotates headers', async () => {
    const handler = jest.fn((_, res) => {
      res.status(200).json({ ok: true });
    });
    const limited = rateLimitEdge(handler, {
      limit: 2,
      keyGenerator: () => 'test-client',
      scopeGenerator: () => '/api/demo',
    });

    const res1 = createRes();
    await limited({ headers: {} }, res1);
    expect(res1.statusCode).toBe(200);
    expect(res1.headers['X-RateLimit-Limit']).toBe('2');
    expect(res1.headers['X-RateLimit-Remaining']).toBe('1');
    expect(res1.headers['X-RateLimit-Reset']).toBeDefined();

    const res2 = createRes();
    await limited({ headers: {} }, res2);
    expect(res2.statusCode).toBe(200);
    expect(res2.headers['X-RateLimit-Remaining']).toBe('0');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('blocks when the limit is exceeded and returns 429', async () => {
    const handler = jest.fn((_, res) => {
      res.status(200).json({ ok: true });
    });
    const limited = rateLimitEdge(handler, {
      limit: 1,
      keyGenerator: () => 'client',
      scopeGenerator: () => '/api/demo',
    });

    const res1 = createRes();
    await limited({ headers: {} }, res1);
    expect(res1.statusCode).toBe(200);
    expect(res1.headers['X-RateLimit-Remaining']).toBe('0');

    const res2 = createRes();
    await limited({ headers: {} }, res2);
    expect(res2.statusCode).toBe(429);
    expect(res2.body).toEqual({ error: 'rate_limit' });
    expect(res2.headers['Retry-After']).toBeDefined();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
