/** @jest-environment node */
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;
(global as any).ReadableStream = ReadableStream;
const { Response } = require('undici');
import handler from '../pages/api/http-diff';

function createReqRes(body = {}) {
  const req = {
    method: 'POST',
    body,
    headers: {},
  };

  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return { req, res };
}

describe('http-diff api', () => {
  it('compares two urls', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response('one', { status: 200, headers: {} }))
      .mockResolvedValueOnce(new Response('two', { status: 200, headers: {} }));
    global.fetch = fetchMock as any;

    const { req, res } = createReqRes({
      url1: 'https://a.test',
      url2: 'https://b.test',
    });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = (res.json as any).mock.calls[0][0];
    expect(data.url1.body).toBe('one');
    expect(data.url2.body).toBe('two');
    expect(Array.isArray(data.bodyDiff)).toBe(true);
  });

  it('validates request body', async () => {
    const { req, res } = createReqRes({ url1: 'https://a.test' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

