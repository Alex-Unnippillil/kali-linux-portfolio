/** @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';
import { Response } from 'undici';
import handler from '../pages/api/http-diff';

function createReqRes(body = {}) {
  const req = {
    method: 'POST',
    body,
    headers: {},
  };

  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return { req, res };
}

describe('http-diff api', () => {
  it('compares two urls', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('one', { status: 200, headers: {} }))
      .mockResolvedValueOnce(new Response('two', { status: 200, headers: {} }));
    global.fetch = fetchMock;

    const { req, res } = createReqRes({
      url1: 'https://a.test',
      url2: 'https://b.test',
    });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];
    expect(data.url1.body).toBe('one');
    expect(data.url2.body).toBe('two');
    expect(Array.isArray(data.bodyDiff)).toBe(true);
  });
});

