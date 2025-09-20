import { promises as fs } from 'fs';
import path from 'path';

describe('/rum route', () => {
  const tempPath = path.join(process.cwd(), 'data', 'rum-metrics.test.json');
  let routeModule: typeof import('../app/rum/route');

  const buildRequest = (body: string | Record<string, unknown>): Request => {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    return {
      text: async () => payload,
    } as unknown as Request;
  };

  beforeEach(async () => {
    process.env.RUM_METRICS_PATH = tempPath;
    await fs.rm(tempPath, { force: true });
    jest.resetModules();
    routeModule = await import('../app/rum/route');
  });

  afterEach(async () => {
    await fs.rm(tempPath, { force: true });
    delete process.env.RUM_METRICS_PATH;
  });

  it('stores metrics from POST payloads', async () => {
    const { POST } = routeModule;
    const payload = {
      id: 'metric-1',
      name: 'LCP',
      value: 2150.23,
      label: 'web-vital',
      startTime: 120.5,
      attribution: {
        navigationType: 'navigate',
        largestShiftValue: 0.08,
      },
    };

    const response = await POST(buildRequest(payload));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });

    const saved = JSON.parse(await fs.readFile(tempPath, 'utf-8'));
    expect(Array.isArray(saved)).toBe(true);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual(
      expect.objectContaining({
        id: 'metric-1',
        name: 'LCP',
        value: 2150.23,
      }),
    );
    expect(typeof saved[0].timestamp).toBe('number');
    expect(saved[0].attribution).toEqual(
      expect.objectContaining({ navigationType: 'navigate' }),
    );
  });

  it('rejects malformed payloads', async () => {
    const { POST } = routeModule;
    const response = await POST(buildRequest('not-json'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ ok: false }),
    );
  });
});
