import { flushPendingSubmissions, sendWithOfflineQueue, __offlineQueue } from '../utils/offlineQueue';

describe('offline submission queue', () => {
  const setNavigatorOnline = (value: boolean) => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value,
    });
  };

  beforeEach(async () => {
    await __offlineQueue.clear();
    localStorage.clear();
    setNavigatorOnline(true);
  });

  it('queues submissions while offline and flushes when online', async () => {
    setNavigatorOnline(false);
    const fetchMock = jest.fn();

    const result = await sendWithOfflineQueue(
      {
        url: '/api/test',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { hello: 'world' },
        dedupeKey: 'test-queue',
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(result.status).toBe('queued');
    expect(fetchMock).not.toHaveBeenCalled();

    let entries = await __offlineQueue.getAll();
    expect(entries).toHaveLength(1);

    setNavigatorOnline(true);
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await flushPendingSubmissions(fetchMock as unknown as typeof fetch);

    entries = await __offlineQueue.getAll();
    expect(entries).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('drops submissions after max retry attempts', async () => {
    setNavigatorOnline(true);
    const failingFetch = jest.fn().mockRejectedValue(new Error('network down'));

    // First queue the submission by forcing a network failure
    await sendWithOfflineQueue(
      {
        url: '/api/test',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { ping: 'pong' },
        dedupeKey: 'retry-test',
      },
      failingFetch as unknown as typeof fetch,
    );

    let entries = await __offlineQueue.getAll();
    expect(entries).toHaveLength(1);

    for (let i = 0; i < 5; i += 1) {
      await flushPendingSubmissions(failingFetch as unknown as typeof fetch);
    }

    entries = await __offlineQueue.getAll();
    expect(entries).toHaveLength(0);
    expect(failingFetch).toHaveBeenCalled();
  });
});
