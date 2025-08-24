/** @jest-environment node */

import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../pages/api/request';

function createReqRes(body: any = {}) {
  const req = {
    method: 'POST',
    body,
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest;

  const res: Partial<NextApiResponse> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();

  return { req, res: res as NextApiResponse };
}

describe('request api caching', () => {
  it('returns cached response on consecutive identical requests', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: {
        forEach(cb: (v: string, k: string) => void) {
          cb('text/plain', 'content-type');
        },
      },
      text: async () => 'cached',
    });

    (global as any).fetch = mockFetch;

    const payload = { url: 'https://example.com' };

    const first = createReqRes(payload);
    await handler(first.req, first.res);

    const second = createReqRes(payload);
    await handler(second.req, second.res);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

