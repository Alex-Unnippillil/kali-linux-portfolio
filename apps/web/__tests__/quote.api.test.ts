import handler from '../pages/api/quote';
import { createMocks } from 'node-mocks-http';

describe('quote api', () => {
  it('returns 404 with error payload when no quotes match the requested tag', () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { tag: 'nonexistent-tag' },
    });

    handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(404);
    expect(res._getJSONData()).toEqual({
      error: 'No quotes found for the provided tag.',
      tag: 'nonexistent-tag',
    });
  });
});
