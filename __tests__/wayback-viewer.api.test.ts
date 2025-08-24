/** @jest-environment node */

import type { NextApiRequest, NextApiResponse } from 'next';
import handler, { __clearCache } from '../pages/api/wayback-viewer';

function createReqRes(query: any) {
  const req = { method: 'GET', query } as unknown as NextApiRequest;
  const res: Partial<NextApiResponse> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockImplementation((d) => {
    (res as any)._data = d;
    return res;
  });
  return { req, res: res as NextApiResponse };
}

describe('wayback viewer api', () => {
  beforeEach(() => {
    __clearCache();
  });

  it('caches responses for identical queries', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          ['timestamp', 'original', 'statuscode', 'mimetype', 'robotflags'],
          ['20200101000000', 'http://example.com', '200', 'text/html', null],
        ],
      });
    (global as any).fetch = mockFetch;

    const q = { url: 'http://example.com' };
    const first = createReqRes(q);
    await handler(first.req, first.res);
    const second = createReqRes(q);
    await handler(second.req, second.res);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect((second.res as any)._data.snapshots).toHaveLength(1);
  });

  it('handles upstream errors', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false });
    (global as any).fetch = mockFetch;

    const { req, res } = createReqRes({ url: 'http://example.com' });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect((res as any)._data.error).toBe('Failed to fetch snapshots');
  });
});
