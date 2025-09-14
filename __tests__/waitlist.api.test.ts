import waitlistHandler from '../pages/api/waitlist';
import confirmHandler from '../pages/api/waitlist/confirm';
import exportHandler from '../pages/api/waitlist/export';
import { kv } from '../lib/waitlist';
import { createMocks } from 'node-mocks-http';

describe('waitlist api', () => {
  afterEach(() => {
    kv.clear();
    delete process.env.QUEUE_EXPORT_KEY;
  });

  test('double opt-in and csv export', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { email: 'a@example.com', consent: true },
    });
    await waitlistHandler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);

    const token = Array.from(kv.values())[0].token;
    const { req: req2, res: res2 } = createMocks({
      method: 'GET',
      query: { token },
    });
    await confirmHandler(req2 as any, res2 as any);
    expect(res2._getStatusCode()).toBe(200);
    expect(Array.from(kv.values())[0].confirmed).toBe(true);

    process.env.QUEUE_EXPORT_KEY = 'k';
    const { req: req3, res: res3 } = createMocks({
      method: 'GET',
      query: { key: 'k' },
    });
    await exportHandler(req3 as any, res3 as any);
    expect(res3._getStatusCode()).toBe(200);
    expect(res3._getData()).toContain('a@example.com');
  });
});
