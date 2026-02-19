import { DocumensoService } from '../lib/documenso';

describe('DocumensoService', () => {
  const originalEnvKey = process.env.DOCUMENSO_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.DOCUMENSO_API_KEY = originalEnvKey;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses constructor apiKey instead of module-level key for auth headers', async () => {
    process.env.DOCUMENSO_API_KEY = 'env-key';
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

    const service = new DocumensoService({
      apiKey: 'ctor-key',
      baseUrl: 'https://example.test',
    });

    await service.request('/documents');

    expect(global.fetch).toHaveBeenCalledWith('https://example.test/documents', {
      headers: {
        Authorization: 'Bearer ctor-key',
      },
    });
  });

  it('omits authorization header when api key is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

    const service = new DocumensoService({ baseUrl: 'https://example.test' });

    await service.request('/documents');

    expect(global.fetch).toHaveBeenCalledWith('https://example.test/documents', {
      headers: {},
    });
  });
});
