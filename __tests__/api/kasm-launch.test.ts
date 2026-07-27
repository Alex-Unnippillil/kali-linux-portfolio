import handler from '../../pages/api/kasm/launch';
import { createMocks } from 'node-mocks-http';

describe('kasm launch api', () => {
  afterEach(() => {
    jest.resetAllMocks();
    delete (global as any).fetch;
    delete process.env.KASM_URL;
    delete process.env.KASM_USERNAME;
    delete process.env.KASM_PASSWORD;
    delete process.env.KASM_IMAGE_ID;
  });

  test('returns session url', async () => {
    (global as any).fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'abc' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://kasm/session' }),
      });

    process.env.KASM_URL = 'https://kasm.test';
    process.env.KASM_USERNAME = 'user';
    process.env.KASM_PASSWORD = 'pass';
    process.env.KASM_IMAGE_ID = '123';

    const { req, res } = createMocks({ method: 'POST' });
    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ url: 'https://kasm/session' });
    expect((global as any).fetch).toHaveBeenNthCalledWith(
      1,
      'https://kasm.test/api/login',
      expect.any(Object),
    );
    expect((global as any).fetch).toHaveBeenNthCalledWith(
      2,
      'https://kasm.test/api/create-session',
      expect.any(Object),
    );
  });
});
