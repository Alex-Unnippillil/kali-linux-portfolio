function mockReqRes({ method, query, body }: { method: string; query: any; body?: any }) {
  const req: any = { method, query, body, headers: {} };
  const res: any = { statusCode: 200 };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: any) => { res.data = data; return res; };
  res.end = () => res;
  return { req, res };
}

describe('blackjack api', () => {
  const id = 'user1';

  test('persists stats and rate limits', async () => {
    jest.resetModules();

    const { setKVAdapter, MemoryKV } = await import('../lib/kv');
    setKVAdapter(new MemoryKV());
    const { default: handler } = await import('../pages/api/users/[id]/blackjack');

    // initial update
    let { req, res } = mockReqRes({
      method: 'POST',
      query: { id },
      body: { result: 'win' },
    });
    await handler(req, res);
    expect(res.statusCode).toBe(200);

    // verify persistence
    ({ req, res } = mockReqRes({
      method: 'GET',
      query: { id },
    }));
    await handler(req, res);
    expect(res.data.wins).toBe(1);

    // exceed rate limit
    for (let i = 0; i < 5; i++) {
      ({ req, res } = mockReqRes({
        method: 'POST',
        query: { id },
        body: { result: 'win' },
      }));
      await handler(req, res);
    }
    expect(res.statusCode).toBe(429);
  });

  test('validates request body', async () => {
    jest.resetModules();

    const { setKVAdapter, MemoryKV } = await import('../lib/kv');
    setKVAdapter(new MemoryKV());
    const { default: handler } = await import('../pages/api/users/[id]/blackjack');

    const { req, res } = mockReqRes({
      method: 'POST',
      query: { id },
      body: { result: 'invalid' },
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });
});
