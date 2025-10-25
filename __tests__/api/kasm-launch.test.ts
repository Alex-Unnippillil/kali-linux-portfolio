import handler from '../../pages/api/kasm/launch';
import { createMocks } from 'node-mocks-http';

describe('kasm launch api', () => {
  afterEach(() => {
    jest.resetAllMocks();
    delete (global as any).fetch;
    delete process.env.KASM_URL;
    delete process.env.KASM_USERNAME;
    delete process.env.KASM_PASSWORD;
    delete process.env.KASM_WORKSPACE_ID;
  });

  test('returns session url', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ token: 'tok' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ url: 'https://session' }),
      });
    (global as any).fetch = fetchMock;

    process.env.KASM_URL = 'https://kasm.local';
    process.env.KASM_USERNAME = 'user';
    process.env.KASM_PASSWORD = 'pass';
    process.env.KASM_WORKSPACE_ID = 'work';

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req as any, res as any);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://kasm.local/api/v1/authenticate');
    expect(fetchMock.mock.calls[1][0]).toBe('https://kasm.local/api/v1/containers/launch');
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ url: 'https://session' });
  });
});

