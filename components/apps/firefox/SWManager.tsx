import React, { useMemo, useRef, useState } from 'react';

type CacheEntryStatus = 'fresh' | 'stale';

type CacheEntry = {
  id: string;
  label: string;
  url: string;
  size: string;
  revision: number;
  status: CacheEntryStatus;
};

type CacheBucket = {
  name: string;
  description: string;
  entries: CacheEntry[];
};

type CacheBlueprintEntry = {
  id: string;
  label: string;
  url: string;
  size: string;
};

type CacheBlueprint = {
  name: string;
  description: string;
  entries: CacheBlueprintEntry[];
};

const CACHE_BLUEPRINT: CacheBlueprint[] = [
  {
    name: 'app-shell',
    description: 'Offline shell and HTML required to bootstrap the Firefox simulation.',
    entries: [
      { id: 'root', label: 'Root document', url: '/', size: '12 KB' },
      { id: 'shell-css', label: 'Shell styles', url: '/css/firefox-shell.css', size: '8 KB' },
      { id: 'shell-js', label: 'Shell runtime', url: '/js/firefox-shell.js', size: '18 KB' },
    ],
  },
  {
    name: 'static-assets',
    description: 'Static JavaScript and CSS chunks served by Next.js.',
    entries: [
      { id: 'main-js', label: 'Main bundle', url: '/_next/static/main.js', size: '96 KB' },
      { id: 'vendor-js', label: 'Vendor bundle', url: '/_next/static/vendor.js', size: '120 KB' },
      { id: 'styles-css', label: 'Stylesheet', url: '/_next/static/css/app.css', size: '42 KB' },
    ],
  },
  {
    name: 'docs-cache',
    description: 'Documentation API responses for offline reference.',
    entries: [
      { id: 'overview', label: 'Docs overview', url: 'https://www.kali.org/docs/index.json', size: '3 KB' },
      { id: 'tools', label: 'Tools index', url: 'https://www.kali.org/docs/tools.json', size: '5 KB' },
      { id: 'updates', label: 'Release notes', url: 'https://www.kali.org/docs/releases.json', size: '4 KB' },
    ],
  },
];

const createCacheState = (version: number): CacheBucket[] =>
  CACHE_BLUEPRINT.map((cache) => ({
    name: cache.name,
    description: cache.description,
    entries: cache.entries.map((entry) => ({
      ...entry,
      revision: version,
      status: 'fresh' as const,
    })),
  }));

const markCachesStale = (caches: CacheBucket[]): CacheBucket[] =>
  caches.map((cache) => ({
    ...cache,
    entries: cache.entries.map((entry) => ({
      ...entry,
      status: 'stale' as const,
    })),
  }));

type SWEvent = {
  id: string;
  message: string;
  timestamp: string;
};

const formatTimestamp = (isoTimestamp: string) => isoTimestamp.split('T')[1]?.slice(0, 8) ?? '';

export const SWManager: React.FC = () => {
  const [events, setEvents] = useState<SWEvent[]>([]);
  const [caches, setCaches] = useState<CacheBucket[]>([]);
  const [activeVersion, setActiveVersion] = useState<number | null>(null);
  const [pendingVersion, setPendingVersion] = useState<number | null>(null);
  const eventCounter = useRef(0);

  const logEvent = (message: string) => {
    eventCounter.current += 1;
    const timestamp = new Date().toISOString();
    const id = `${timestamp}-${eventCounter.current}`;
    setEvents((previous) => [
      ...previous,
      {
        id,
        message,
        timestamp,
      },
    ]);
  };

  const handleRegister = () => {
    if (activeVersion !== null) {
      return;
    }
    const version = 1;
    logEvent(`Registration requested (v${version})`);
    logEvent(`Install event fired (v${version})`);
    setCaches(createCacheState(version));
    logEvent(`Install event cached core assets (v${version})`);
    logEvent(`Activate event fired (v${version})`);
    setActiveVersion(version);
    setPendingVersion(null);
    logEvent(`Service worker activated (v${version})`);
    logEvent(`Clients now controlled (v${version})`);
  };

  const handleUpdateCheck = () => {
    if (activeVersion === null || pendingVersion !== null) {
      return;
    }
    const nextVersion = activeVersion + 1;
    logEvent(`Update check started (current v${activeVersion})`);
    logEvent(`Update found (v${nextVersion})`);
    setCaches((previous) => markCachesStale(previous));
    logEvent(`Installing update (v${nextVersion})`);
    logEvent(`Install event cached core assets (v${nextVersion})`);
    logEvent(`Update installed and waiting (v${nextVersion})`);
    setPendingVersion(nextVersion);
  };

  const handleActivateUpdate = () => {
    if (pendingVersion === null) {
      return;
    }
    const nextVersion = pendingVersion;
    const previousVersion = activeVersion;
    logEvent(`Skip waiting message sent (v${nextVersion})`);
    logEvent(`Activating update (v${nextVersion})`);
    setActiveVersion(nextVersion);
    setPendingVersion(null);
    setCaches(createCacheState(nextVersion));
    logEvent(`Service worker activated (v${nextVersion})`);
    logEvent(`Clients now controlled (v${nextVersion})`);
    logEvent(`Cache storage refreshed for v${nextVersion}`);
    if (previousVersion !== null) {
      logEvent(`Previous worker marked redundant (v${previousVersion})`);
    }
  };

  const handleClearCache = (cacheName: string) => {
    setCaches((previous) =>
      previous.map((cache) => (cache.name === cacheName ? { ...cache, entries: [] } : cache))
    );
    logEvent(`Cleared ${cacheName} cache entries`);
  };

  const handleUpdateEntry = (cacheName: string, entryId: string) => {
    const targetVersion = pendingVersion ?? activeVersion;
    if (targetVersion === null) {
      return;
    }
    const cache = caches.find((bucket) => bucket.name === cacheName);
    const entryLabel =
      cache?.entries.find((candidate) => candidate.id === entryId)?.label ?? entryId;
    setCaches((previous) =>
      previous.map((cache) => {
        if (cache.name !== cacheName) {
          return cache;
        }
        return {
          ...cache,
          entries: cache.entries.map((entry) => {
            if (entry.id !== entryId) {
              return entry;
            }
            return {
              ...entry,
              revision: targetVersion,
              status: 'fresh',
            };
          }),
        };
      })
    );
    logEvent(`Updated ${entryLabel} in ${cacheName} to v${targetVersion}`);
  };

  const registrationDisabled = activeVersion !== null;
  const updateDisabled = activeVersion === null || pendingVersion !== null;
  const activationDisabled = pendingVersion === null;

  const cacheTargetVersion = useMemo(() => pendingVersion ?? activeVersion, [pendingVersion, activeVersion]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden bg-gray-950 p-4 text-gray-100">
      <section className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 shadow-inner">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-gray-300">
              Active worker: {activeVersion !== null ? `v${activeVersion}` : 'not registered'}
            </p>
            {pendingVersion !== null ? (
              <p className="text-xs text-yellow-300">Update ready to activate: v{pendingVersion}</p>
            ) : null}
            {cacheTargetVersion !== null ? (
              <p className="text-xs text-gray-400">Latest cached revision: v{cacheTargetVersion}</p>
            ) : (
              <p className="text-xs text-gray-400">No caches have been generated yet.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRegister}
              disabled={registrationDisabled}
              className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-gray-700"
            >
              Register service worker
            </button>
            <button
              type="button"
              onClick={handleUpdateCheck}
              disabled={updateDisabled}
              className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-gray-700"
            >
              Check for update
            </button>
            <button
              type="button"
              onClick={handleActivateUpdate}
              disabled={activationDisabled}
              className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-gray-700"
            >
              Activate update
            </button>
          </div>
        </div>
      </section>
      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="flex flex-col rounded-lg border border-gray-800 bg-gray-900/60">
          <header className="border-b border-gray-800 px-4 py-3">
            <h2 className="text-lg font-semibold text-white">Cache inspector</h2>
            <p className="text-sm text-gray-300">
              Review simulated Cache Storage entries and refresh or clear them as lifecycle events run.
            </p>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {caches.length === 0 ? (
              <p className="text-sm text-gray-400">
                Register the service worker to populate cache tables with offline assets.
              </p>
            ) : (
              <div className="space-y-4">
                {caches.map((cache) => {
                  const hasEntries = cache.entries.length > 0;
                  return (
                    <section
                      key={cache.name}
                      data-testid={`cache-section-${cache.name}`}
                      className="rounded-md border border-gray-800 bg-gray-900/70 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-white">{cache.name}</h3>
                          <p className="text-xs text-gray-400">{cache.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleClearCache(cache.name)}
                          aria-label={`Clear ${cache.name} cache`}
                          disabled={!hasEntries}
                          className="self-start rounded bg-red-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-gray-700"
                        >
                          Clear cache
                        </button>
                      </div>
                      {hasEntries ? (
                        <ul className="mt-3 space-y-3">
                          {cache.entries.map((entry) => {
                            const targetVersion = pendingVersion ?? activeVersion;
                            const isCurrent =
                              targetVersion !== null &&
                              entry.revision === targetVersion &&
                              entry.status === 'fresh';
                            const statusLabel = entry.status === 'fresh' ? 'Fresh' : 'Stale';
                            const statusColor = entry.status === 'fresh' ? 'text-green-400' : 'text-yellow-300';
                            return (
                              <li
                                key={entry.id}
                                data-testid={`cache-entry-${entry.id}`}
                                className="rounded border border-gray-800 bg-gray-950/70 p-3"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-white">{entry.label}</p>
                                    <p className="text-xs text-gray-400">{entry.url}</p>
                                    <p className="text-xs text-gray-400">
                                      Revision v{entry.revision} ·{' '}
                                      <span className={`font-semibold ${statusColor}`}>Status: {statusLabel}</span>
                                      {' · '}Size: {entry.size}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateEntry(cache.name, entry.id)}
                                    aria-label={`Update ${entry.label} (${cache.name})`}
                                    disabled={isCurrent}
                                    className="self-start rounded bg-blue-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-gray-700"
                                  >
                                    Update
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-gray-400">This cache has no entries.</p>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </section>
        <section className="flex flex-col rounded-lg border border-gray-800 bg-gray-900/60">
          <header className="border-b border-gray-800 px-4 py-3">
            <h2 className="text-lg font-semibold text-white">Event log</h2>
            <p className="text-sm text-gray-300">
              Logs mirror the Service Worker lifecycle, including registration, update flows, and cache maintenance.
            </p>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
            {events.length === 0 ? (
              <p className="text-sm text-gray-400">Service worker events will appear here once the flow starts.</p>
            ) : (
              <ol className="space-y-3">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="rounded border border-gray-800 bg-gray-950/70 p-3"
                  >
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatTimestamp(event.timestamp)}</span>
                    </div>
                    <p data-testid="sw-event-message" className="mt-1 text-sm text-gray-100">
                      {event.message}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SWManager;
