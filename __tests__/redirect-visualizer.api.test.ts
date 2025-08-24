/** @jest-environment node */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Response } from 'undici';
import handler from '../pages/api/redirect-visualizer';

jest.mock('../lib/headCache', () => ({
  fetchHead: jest.fn(() => Promise.resolve({ alpn: 'h2' })),
}));

function createReqRes(body: any = {}) {
  const req = {
    method: 'POST',
    body,
    headers: {},
  } as unknown as NextApiRequest;

  const res: Partial<NextApiResponse> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return { req, res: res as NextApiResponse };
}

describe('redirect-visualizer api', () => {
  it('captures redirect chain with method changes and cache headers', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response('', {
          status: 302,
          headers: {
            location: 'https://b.example',
            'cache-control': 'no-store',
          },
        })
      )
      .mockResolvedValueOnce(
        new Response('', {
          status: 200,
          headers: {
            'cache-control': 'max-age=60',
          },
        })
      )
      .mockResolvedValueOnce(
        new Response('', { status: 200, headers: {} })
      );
    (global as any).fetch = mockFetch;

    const { req, res } = createReqRes({
      url: 'https://a.example',
      method: 'POST',
    });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = (res.json as any).mock.calls[0][0];
    expect(data.ok).toBe(true);
    expect(data.chain).toHaveLength(2);
    expect(data.chain[0].method).toBe('POST');
    expect(data.chain[0].cacheControl).toBe('no-store');
    expect(data.chain[1].method).toBe('GET');
    expect(data.chain[1].cacheControl).toBe('max-age=60');
  });

  it('validates request body', async () => {
    const { req, res } = createReqRes({});
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
