/** @jest-environment node */
import type { NextApiRequest, NextApiResponse } from 'next';

function createReqRes(query: any = {}) {
  const req = {
    method: 'GET',
    query,
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest;

  const res: Partial<NextApiResponse> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();

  return { req, res: res as NextApiResponse };
}

describe('crtsh api', () => {
  let handler: any;
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    handler = (await import('../pages/api/crtsh')).default;
  });

  it('returns parsed results and caches responses', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          issuer_name: 'Test CA',
          not_before: '2024-01-01T00:00:00',
          not_after: '2024-06-01T00:00:00',
          name_value: 'example.com\nwww.example.com',
          id: 1,
        },
      ],
    });
    (global as any).fetch = mockFetch;

    const first = createReqRes({ domain: 'example.com' });
    await handler(first.req, first.res);
    expect(first.res.status).toHaveBeenCalledWith(200);
    const data = (first.res.json as jest.Mock).mock.calls[0][0];
    expect(data.results[0].issuer).toBe('Test CA');
    expect(data.results[0].sans).toEqual(['example.com', 'www.example.com']);

    const second = createReqRes({ domain: 'example.com' });
    await handler(second.req, second.res);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('enforces rate limits', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
    (global as any).fetch = mockFetch;

    for (let i = 0; i < 10; i++) {
      const { req, res } = createReqRes({ domain: 'a.com' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    }

    const { req, res } = createReqRes({ domain: 'a.com' });
    await handler(req, res);
    expect(res.status).toHaveBeenLastCalledWith(429);
  });
});

