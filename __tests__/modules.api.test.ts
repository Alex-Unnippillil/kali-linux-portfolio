import handler from '../pages/api/modules';
import { createMocks } from 'node-mocks-http';

type AnyRequest = Parameters<typeof handler>[0];
type AnyResponse = Parameters<typeof handler>[1];

const asAny = (value: unknown) => value as any;

describe('modules api', () => {
  it('sets caching headers and supports conditional requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(asAny(req) as AnyRequest, asAny(res) as AnyResponse);

    expect(res.getHeader('cache-control')).toContain('s-maxage=3600');
    const etag = res.getHeader('etag');
    expect(typeof etag).toBe('string');
    expect(res._getStatusCode()).toBe(200);

    const { req: cachedReq, res: cachedRes } = createMocks({
      method: 'GET',
      headers: {
        'if-none-match': etag as string,
      },
    });

    await handler(asAny(cachedReq) as AnyRequest, asAny(cachedRes) as AnyResponse);

    expect(cachedRes.getHeader('etag')).toBe(etag);
    expect(cachedRes.getHeader('cache-control')).toContain('stale-while-revalidate');
    expect(cachedRes._getStatusCode()).toBe(304);
  });
});
