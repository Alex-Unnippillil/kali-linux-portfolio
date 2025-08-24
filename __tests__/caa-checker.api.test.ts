import type { NextApiHandler } from 'next';

function mockReqRes({ method, query }: { method: string; query: any }) {
  const req: any = { method, query };
  const res: any = { statusCode: 200 };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.data = data;
    return res;
  };
  return { req, res };
}

describe('caa-checker api', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('parses records and caches responses', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Answer: [
          { data: '0 issue "letsencrypt.org"' },
          { data: '0 iodef "mailto:security@example.com"' },
        ],
      }),
    });
    (global as any).fetch = fetchMock;

    const { default: handler } = await import('../pages/api/caa-checker');

    const { req, res } = mockReqRes({
      method: 'GET',
      query: { domain: 'sub.example.com' },
    });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.data.effective.issue).toEqual(['letsencrypt.org']);
    expect(res.data.effective.iodef).toBe('mailto:security@example.com');

    const { req: req2, res: res2 } = mockReqRes({
      method: 'GET',
      query: { domain: 'sub.example.com' },
    });
    await handler(req2, res2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('handles upstream errors', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false });
    (global as any).fetch = fetchMock;
    const { default: handler } = await import('../pages/api/caa-checker');
    const { req, res } = mockReqRes({ method: 'GET', query: { domain: 'example.com' } });
    await handler(req, res);
    expect(res.statusCode).toBe(500);
  });

  test('validates domain input', async () => {
    const { default: handler } = await import('../pages/api/caa-checker');
    const { req, res } = mockReqRes({ method: 'GET', query: { domain: 'bad_domain!' } });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });
});

