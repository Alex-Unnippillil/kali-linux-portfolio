import handler from '../pages/api/quote';
import { createMocks } from 'node-mocks-http';

const asAny = (value: unknown) => value as any;

describe('quote api', () => {
  it('returns 404 with error payload when no quotes match the requested tag', () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { tag: 'nonexistent-tag' },
    });

    handler(asAny(req), asAny(res));

    expect(res._getStatusCode()).toBe(404);
    expect(res._getJSONData()).toEqual({
      error: 'No quotes found for the provided tag.',
      tag: 'nonexistent-tag',
    });
  });

  it('sets cache headers and honours ETag revalidation', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    const { req, res } = createMocks({
      method: 'GET',
    });

    handler(asAny(req), asAny(res));

    expect(res.getHeader('cache-control')).toContain('s-maxage=86400');
    const etag = res.getHeader('etag');
    expect(typeof etag).toBe('string');

    const { req: cachedReq, res: cachedRes } = createMocks({
      method: 'GET',
      headers: {
        'if-none-match': etag as string,
      },
    });

    handler(asAny(cachedReq), asAny(cachedRes));

    expect(cachedRes.getHeader('etag')).toBe(etag);
    expect(cachedRes.getHeader('cache-control')).toContain('stale-while-revalidate');
    expect(cachedRes._getStatusCode()).toBe(304);

    randomSpy.mockRestore();
  });
});
