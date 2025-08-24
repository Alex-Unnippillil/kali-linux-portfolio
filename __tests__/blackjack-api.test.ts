import jwt from 'jsonwebtoken';

function mockReqRes({ method, query, body, headers }: { method: string; query: any; body?: any; headers?: any }) {
  const req: any = { method, query, body, headers: headers || {} };
  const res: any = { statusCode: 200 };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: any) => { res.data = data; return res; };
  res.end = () => res;
  return { req, res };
}

describe('blackjack api', () => {
  const id = 'user1';

  test('rejects when JWT secret missing', async () => {
    delete process.env.JWT_SECRET;
    jest.resetModules();

    
    const { setKVAdapter, MemoryKV } = await import('../lib/kv');
    setKVAdapter(new MemoryKV());
    const { default: handler } = await import('../pages/api/users/[id]/blackjack');

    const token = jwt.sign({ sub: id }, 'temp');
    const { req, res } = mockReqRes({ method: 'GET', query: { id }, headers: { authorization: `Bearer ${token}` } });
    await handler(req, res);
    expect(res.statusCode).toBe(500);
  });

  test('validates token subject', async () => {
    process.env.JWT_SECRET = 'secret';
    jest.resetModules();

    const { setKVAdapter, MemoryKV } = await import('../lib/kv');
    setKVAdapter(new MemoryKV());
    const { default: handler } = await import('../pages/api/users/[id]/blackjack');

    const token = jwt.sign({ sub: 'other' }, process.env.JWT_SECRET!);
    const { req, res } = mockReqRes({ method: 'GET', query: { id }, headers: { authorization: `Bearer ${token}` } });
    await handler(req, res);
    expect(res.statusCode).toBe(403);
  });

  test('persists stats and rate limits', async () => {
    process.env.JWT_SECRET = 'secret';
    jest.resetModules();

    const { setKVAdapter, MemoryKV } = await import('../lib/kv');
    setKVAdapter(new MemoryKV());
    const { default: handler } = await import('../pages/api/users/[id]/blackjack');

    const token = jwt.sign({ sub: id }, process.env.JWT_SECRET!);

    // initial update
    let { req, res } = mockReqRes({
      method: 'POST',
      query: { id },
      body: { result: 'win' },
      headers: { authorization: `Bearer ${token}` },
    });
    await handler(req, res);
    expect(res.statusCode).toBe(200);

    // verify persistence
    ({ req, res } = mockReqRes({
      method: 'GET',
      query: { id },
      headers: { authorization: `Bearer ${token}` },
    }));
    await handler(req, res);
    expect(res.data.wins).toBe(1);

    // exceed rate limit
    for (let i = 0; i < 5; i++) {
      ({ req, res } = mockReqRes({
        method: 'POST',
        query: { id },
        body: { result: 'win' },
        headers: { authorization: `Bearer ${token}` },
      }));
      await handler(req, res);
    }
    expect(res.statusCode).toBe(429);
  });
});
