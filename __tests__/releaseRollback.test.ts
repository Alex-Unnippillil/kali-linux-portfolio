import { performRollback, RELEASE_OVERRIDE_KEY } from '../utils/releases';
import type { ReleaseMetadata } from '../utils/releases';
import { logEvent } from '../utils/analytics';

jest.mock('../utils/analytics', () => ({
  logEvent: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockManifest = (channel: string, current: ReleaseMetadata, previous: ReleaseMetadata | null) => ({
  channels: {
    [channel]: {
      current,
      previous,
    },
  },
});

describe('performRollback', () => {
  const channel = 'stable';
  const currentRelease: ReleaseMetadata = {
    channel,
    version: '2.2.0',
    buildId: 'build-current',
    exportedAt: '2024-01-01T00:00:00.000Z',
    baseUrl: '/',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createFetchMock = (manifest: unknown) =>
    jest.fn().mockResolvedValue({
      ok: true,
      json: async () => manifest,
    });

  const createStorageMock = () => {
    const store = new Map<string, string>();
    return {
      getItem: jest.fn((key: string) => store.get(key) ?? null),
      setItem: jest.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn((key: string) => {
        store.delete(key);
      }),
    } as unknown as Storage;
  };

  const createCacheMock = (keys: string[] = []) => ({
    keys: jest.fn().mockResolvedValue(keys),
    delete: jest.fn().mockResolvedValue(true),
  });

  it('throws when no previous release is available', async () => {
    const fetchMock = createFetchMock(mockManifest(channel, currentRelease, null));
    const storage = createStorageMock();
    const caches = createCacheMock();

    await expect(
      performRollback({
        channel,
        fetchImpl: fetchMock,
        cacheStorage: caches,
        storage,
        location: { href: 'https://portfolio.test/', assign: jest.fn() },
      }),
    ).rejects.toThrow('No previous release available for channel stable');

    expect(caches.delete).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('purges caches, stores override, logs event, and reloads on success', async () => {
    const previousRelease: ReleaseMetadata = {
      channel,
      version: '2.1.0',
      buildId: 'build-prev',
      exportedAt: '2023-12-31T00:00:00.000Z',
      baseUrl: '/releases/stable/prev/',
    };

    const fetchMock = createFetchMock(
      mockManifest(channel, currentRelease, previousRelease),
    );
    const storage = createStorageMock();
    const caches = createCacheMock(['a', 'b']);
    const assign = jest.fn();

    await performRollback({
      channel,
      fetchImpl: fetchMock,
      cacheStorage: caches,
      storage,
      location: { href: 'https://portfolio.test/apps', assign },
    });

    expect(fetchMock).toHaveBeenCalledWith('/releases.json', { cache: 'no-store' });
    expect(caches.keys).toHaveBeenCalled();
    expect(caches.delete).toHaveBeenCalledTimes(2);
    expect(caches.delete).toHaveBeenNthCalledWith(1, 'a');
    expect(caches.delete).toHaveBeenNthCalledWith(2, 'b');
    expect(storage.setItem).toHaveBeenCalledWith(
      RELEASE_OVERRIDE_KEY,
      expect.any(String),
    );
    const stored = storage.getItem(RELEASE_OVERRIDE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);
    expect(parsed).toMatchObject({
      buildId: 'build-prev',
      channel,
      targetUrl: 'https://portfolio.test/releases/stable/prev/',
    });

    expect(assign).toHaveBeenCalledWith('https://portfolio.test/releases/stable/prev/');
    expect(logEvent).toHaveBeenCalledWith({
      category: 'release',
      action: 'rollback',
      label: `${channel}:build-prev`,
    });
  });
});
