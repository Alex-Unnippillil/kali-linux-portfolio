// @jest-environment node
import { createMocks } from 'node-mocks-http';
import dummyHandler from '../pages/api/dummy';
import wallpapersHandler from '../pages/api/wallpapers';
import quoteHandler from '../pages/api/quote';

const describeIfEnabled =
  process.env.FEATURE_NODE_APIS === 'enabled' ? describe : describe.skip;

describeIfEnabled('Node API routes', () => {
  test('dummy API accepts POST and returns message', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await dummyHandler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ message: 'Received' });
  });

  test('wallpapers API lists available images', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await wallpapersHandler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  test('quote API returns content and author', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await quoteHandler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(typeof data.content).toBe('string');
    expect(typeof data.author).toBe('string');
  });
});
