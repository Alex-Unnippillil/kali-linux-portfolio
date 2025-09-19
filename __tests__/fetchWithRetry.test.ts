import {
  createFetchCancelToken,
  fetchWithRetry,
} from '../utils/fetchWithRetry';

describe('fetchWithRetry', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('retries with exponential backoff and jitter', async () => {
    jest.useFakeTimers();
    const successResponse = { status: 200, ok: true } as Response;
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('network failure'))
      .mockRejectedValueOnce(new TypeError('network failure again'))
      .mockResolvedValue(successResponse);
    const onRetry = jest.fn();

    const { promise, getRetryCount } = fetchWithRetry('/api/test', {
      fetcher: fetchMock as any,
      retries: 2,
      baseDelay: 100,
      backoffFactor: 2,
      maxDelay: 1000,
      jitter: true,
      random: () => 0.5,
      onRetry,
    });

    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(50);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(100);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await expect(promise).resolves.toBe(successResponse);

    expect(onRetry).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ attempt: 1, delay: 50 })
    );
    expect(onRetry).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ attempt: 2, delay: 100 })
    );
    expect(getRetryCount()).toBe(2);
  });

  it('aborts when cancel token is triggered', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
    );

    const token = createFetchCancelToken();
    const { promise } = fetchWithRetry('/api/test', {
      fetcher: fetchMock as any,
      cancelToken: token,
      retries: 3,
    });

    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    token.cancel();

    await expect(promise).rejects.toHaveProperty('name', 'AbortError');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable responses', async () => {
    jest.useFakeTimers();
    const failingResponse = { status: 502, ok: false } as Response;
    const successResponse = { status: 200, ok: true } as Response;
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(failingResponse)
      .mockResolvedValueOnce(successResponse);
    const onRetry = jest.fn();

    const { promise } = fetchWithRetry('/api/test', {
      fetcher: fetchMock as any,
      retries: 1,
      baseDelay: 25,
      jitter: false,
      onRetry,
    });

    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 1, delay: 25, error: failingResponse })
    );

    await jest.advanceTimersByTimeAsync(25);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    await expect(promise).resolves.toBe(successResponse);
  });
});
