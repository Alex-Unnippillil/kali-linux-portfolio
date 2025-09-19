import { logEvent } from './analytics';
import log from './logger';

export interface ReleaseAsset {
  path: string;
  size: number;
}

export interface ReleaseMetadata {
  channel: string;
  version: string;
  buildId: string;
  commit?: string;
  exportedAt: string;
  baseUrl?: string;
  assetPrefix?: string | null;
  assets?: ReleaseAsset[];
}

export interface ChannelReleases {
  current: ReleaseMetadata | null;
  previous: ReleaseMetadata | null;
  history?: ReleaseMetadata[];
}

export interface ReleasesManifest {
  channels: Record<string, ChannelReleases | undefined>;
}

export interface ReleaseOverride {
  channel: string;
  targetUrl: string;
  buildId: string;
  appliedAt: string;
}

export const RELEASES_PATH = '/releases.json';
export const RELEASE_OVERRIDE_KEY = 'release:override';
export const DEFAULT_CHANNEL =
  process.env.NEXT_PUBLIC_RELEASE_CHANNEL ?? 'stable';

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface CacheStorageLike {
  keys(): Promise<string[]>;
  delete(key: string): Promise<boolean>;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

interface LocationLike {
  href: string;
  assign(url: string): void;
}

const defaultFetch: FetchImpl | undefined =
  typeof fetch === 'function' ? (fetch as FetchImpl) : undefined;

const getGlobalObject = (): typeof globalThis | undefined =>
  typeof globalThis === 'undefined' ? undefined : globalThis;

const resolveStorage = (storage?: StorageLike): StorageLike | undefined => {
  if (storage) return storage;
  const globalObj = getGlobalObject() as { localStorage?: StorageLike } | undefined;
  return globalObj?.localStorage;
};

const resolveCaches = (cacheStorage?: CacheStorageLike): CacheStorageLike | undefined => {
  if (cacheStorage) return cacheStorage;
  const globalObj = getGlobalObject() as { caches?: CacheStorageLike } | undefined;
  return globalObj?.caches;
};

const resolveLocation = (location?: LocationLike): LocationLike | undefined => {
  if (location) return location;
  const globalObj = getGlobalObject() as { location?: LocationLike } | undefined;
  return globalObj?.location;
};

export const getStoredOverride = (
  storage?: StorageLike,
): ReleaseOverride | null => {
  const activeStorage = resolveStorage(storage);
  if (!activeStorage) return null;
  const raw = activeStorage.getItem(RELEASE_OVERRIDE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.channel !== 'string' ||
      typeof parsed.buildId !== 'string' ||
      typeof parsed.targetUrl !== 'string'
    ) {
      activeStorage.removeItem?.(RELEASE_OVERRIDE_KEY);
      return null;
    }
    return parsed as ReleaseOverride;
  } catch (err) {
    log.error('Failed to parse stored release override', err);
    activeStorage.removeItem?.(RELEASE_OVERRIDE_KEY);
    return null;
  }
};

export const setStoredOverride = (
  override: ReleaseOverride,
  storage?: StorageLike,
): void => {
  const activeStorage = resolveStorage(storage);
  if (!activeStorage) return;
  activeStorage.setItem(RELEASE_OVERRIDE_KEY, JSON.stringify(override));
};

export const clearStoredOverride = (
  storage?: StorageLike,
): void => {
  const activeStorage = resolveStorage(storage);
  activeStorage?.removeItem?.(RELEASE_OVERRIDE_KEY);
};

export const fetchReleases = async (
  fetchImpl: FetchImpl | undefined = defaultFetch,
): Promise<ReleasesManifest> => {
  if (!fetchImpl) {
    throw new Error('No fetch implementation available for releases manifest');
  }
  const res = await fetchImpl(RELEASES_PATH, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load ${RELEASES_PATH}: ${res.status}`);
  }
  const data = await res.json();
  if (!data || typeof data !== 'object' || !('channels' in data)) {
    throw new Error('Invalid release manifest received');
  }
  return data as ReleasesManifest;
};

export const getChannelReleases = async (
  channel: string,
  fetchImpl?: FetchImpl,
): Promise<ChannelReleases> => {
  const manifest = await fetchReleases(fetchImpl);
  const info = manifest.channels[channel];
  if (!info) {
    throw new Error(`No release data found for channel ${channel}`);
  }
  const { current = null, previous = null, history = [] } = info;
  return { current, previous, history };
};

interface RollbackOptions {
  channel?: string;
  fetchImpl?: FetchImpl;
  cacheStorage?: CacheStorageLike;
  storage?: StorageLike;
  location?: LocationLike;
}

export const performRollback = async ({
  channel = DEFAULT_CHANNEL,
  fetchImpl,
  cacheStorage,
  storage,
  location,
}: RollbackOptions = {}): Promise<ReleaseMetadata> => {
  const { previous } = await getChannelReleases(channel, fetchImpl);
  if (!previous) {
    throw new Error(`No previous release available for channel ${channel}`);
  }

  const activeCaches = resolveCaches(cacheStorage);
  if (activeCaches?.keys) {
    try {
      const keys = await activeCaches.keys();
      await Promise.all(keys.map((key) => activeCaches.delete(key).catch(() => false)));
    } catch (err) {
      log.error('Failed to purge caches during rollback', err);
    }
  }

  const base = previous.baseUrl && previous.baseUrl.trim() ? previous.baseUrl : '/';
  const activeLocation = resolveLocation(location);
  const targetUrl = activeLocation
    ? new URL(base, activeLocation.href).toString()
    : base;

  const override: ReleaseOverride = {
    channel,
    targetUrl,
    buildId: previous.buildId,
    appliedAt: new Date().toISOString(),
  };

  try {
    setStoredOverride(override, storage);
  } catch (err) {
    log.error('Failed to store rollback override', err);
  }

  logEvent({
    category: 'release',
    action: 'rollback',
    label: `${channel}:${previous.buildId}`,
  });

  if (activeLocation?.assign) {
    activeLocation.assign(targetUrl);
  }

  return previous;
};
