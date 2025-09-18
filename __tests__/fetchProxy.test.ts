type FetchProxyModule = typeof import('../lib/fetchProxy');

describe('fetchProxy retry behavior', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let originalFetch: typeof global.fetch;
  let getActiveFetches: FetchProxyModule['getActiveFetches'] = () => [];

  const importProxy = async () => {
    jest.resetModules();
    delete (globalThis as any).__fetchProxyInstalled;
    const mod = await import('../lib/fetchProxy');
    getActiveFetches = mod.getActiveFetches;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    originalFetch = global.fetch;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  const createMockResponse = (status: number, headers: Record<string, string> = {}) => {
    const headerMap = new Map(
      Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    );
    const clone = () => ({
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    return {
      status,
      headers: {
        get: (key: string) => headerMap.get(key.toLowerCase()) ?? null,
      },
      clone,
    } as unknown as Response;
  };

  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    global.fetch = originalFetch;
    delete (globalThis as any).__fetchProxyInstalled;
    jest.resetModules();
  });

  it('retries recoverable statuses with exponential backoff and resolves', async () => {
    const responses = [
      createMockResponse(429),
      createMockResponse(500),
      createMockResponse(200),
    ];
    const fetchMock = jest
      .fn<Promise<Response>, [RequestInfo | URL, RequestInit | undefined]>()
      .mockResolvedValueOnce(responses[0])
      .mockResolvedValueOnce(responses[1])
      .mockResolvedValueOnce(responses[2]);

    global.fetch = fetchMock as any;
    await importProxy();

    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const promise = global.fetch('/api/data');
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getActiveFetches()).toHaveLength(1);

    jest.advanceTimersByTime(200);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(400);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await flushPromises();
    const response = await promise;
    expect(response.status).toBe(200);
    expect(getActiveFetches()).toHaveLength(0);
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 200);
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 400);

    setTimeoutSpy.mockRestore();
  });

  it('logs when recoverable status persists after max attempts', async () => {
    const responses = [
      createMockResponse(500),
      createMockResponse(500),
      createMockResponse(500),
    ];
    const fetchMock = jest
      .fn<Promise<Response>, [RequestInfo | URL, RequestInit | undefined]>()
      .mockResolvedValueOnce(responses[0])
      .mockResolvedValueOnce(responses[1])
      .mockResolvedValueOnce(responses[2]);

    global.fetch = fetchMock as any;
    await importProxy();

    const promise = global.fetch('/api/error');
    await flushPromises();

    jest.advanceTimersByTime(200);
    await flushPromises();
    jest.advanceTimersByTime(400);
    await flushPromises();

    await flushPromises();
    const response = await promise;
    expect(response.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Fetch returned recoverable status after max attempts',
      expect.objectContaining({ url: '/api/error', status: 500, attempts: 3 }),
    );
  });

  it('logs error and rethrows when fetch rejects repeatedly', async () => {
    const error = new Error('network down');
    const fetchMock = jest
      .fn<Promise<Response>, [RequestInfo | URL, RequestInit | undefined]>()
      .mockRejectedValue(error);

    global.fetch = fetchMock as any;
    await importProxy();

    const promise = global.fetch('/api/fail');
    await flushPromises();

    jest.advanceTimersByTime(200);
    await flushPromises();
    jest.advanceTimersByTime(400);
    await flushPromises();

    await expect(promise).rejects.toThrow('network down');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Fetch request failed after retries',
      expect.objectContaining({ url: '/api/fail', attempts: 3, error }),
    );
  });
});
