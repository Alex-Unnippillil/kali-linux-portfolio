import dynamic from 'next/dynamic';

const WeatherLoading = () => (
  <div className="flex h-full w-full items-center justify-center bg-[color:var(--kali-panel)] p-6 text-[color:var(--kali-text)]">
    <div className="w-full max-w-4xl space-y-4">
      <div className="h-6 w-48 rounded bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent)] animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={`weather-skel-${idx}`}
            className="space-y-3 rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)]"
          >
            <div className="h-4 w-24 rounded bg-[color:color-mix(in_srgb,var(--kali-panel)_70%,transparent)] animate-pulse" />
            <div className="h-8 w-32 rounded bg-[color:color-mix(in_srgb,var(--kali-panel)_75%,transparent)] animate-pulse" />
            <div className="h-4 w-16 rounded bg-[color:color-mix(in_srgb,var(--kali-panel)_70%,transparent)] animate-pulse" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, subIdx) => (
                <div
                  key={`weather-skel-sub-${idx}-${subIdx}`}
                  className="h-12 rounded bg-[color:color-mix(in_srgb,var(--kali-panel)_78%,transparent)] animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Dynamically load the full Weather application. This remains the default
// export so existing imports continue to work.
const WeatherApp = dynamic(() => import('../../apps/weather'), {
  ssr: false,
  loading: () => <WeatherLoading />,
});

/**
 * A provider agnostic weather fetcher with basic service worker caching.
 *
 * This wrapper accepts a provider name and an options object. Each provider
 * defines a function for building the request URL. Results are cached using
 * the Cache Storage API so subsequent calls can be served while offline.
 */
const CACHE_NAME = 'weather-data';
const META_PREFIX = 'weather-cache-meta:';

export class WeatherFetchError extends Error {
  constructor(type, message, info) {
    super(message);
    this.name = 'WeatherFetchError';
    this.type = type;
    this.info = info;
  }
}

const toMetaKey = (url) => `${META_PREFIX}${url}`;

const readMetaTimestamp = (url) => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const value = localStorage.getItem(toMetaKey(url));
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeMetaTimestamp = (url, timestamp) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(toMetaKey(url), String(timestamp));
  } catch {
    // ignore storage issues
  }
};

export async function fetchWeather(provider, opts = {}) {
  const providers = {
    openWeather: ({ city, apiKey }) =>
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city,
      )}&units=metric&appid=${apiKey}`,
    openMeteo: ({
      lat,
      lon,
      timezone = 'auto',
      hourly = 'apparent_temperature',
      daily = 'weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset',
      forecast_days = 5,
      current_weather = true,
    }) => {
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        timezone: timezone ?? 'auto',
        forecast_days: String(forecast_days),
      });
      if (current_weather) {
        params.set('current_weather', 'true');
      }
      if (hourly) {
        params.set('hourly', hourly);
      }
      if (daily) {
        params.set('daily', daily);
      }
      return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    },
    openMeteoGeo: ({
      name,
      count = 6,
      language = 'en',
      format = 'json',
    }) => {
      const params = new URLSearchParams({
        name: name ?? '',
        count: String(count),
        language,
        format,
      });
      return `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
    },
  };

  const buildUrl = providers[provider];
  if (!buildUrl) {
    throw new WeatherFetchError(
      'unsupported',
      `Unsupported weather provider: ${provider}`,
    );
  }

  const {
    strategy = 'network-first',
    ttl = 10 * 60 * 1000,
    allowNetwork = true,
    signal,
    revalidate = false,
  } = opts;

  const url = buildUrl(opts);

  const canUseCache =
    typeof globalThis !== 'undefined' && 'caches' in globalThis;
  const isOffline =
    typeof navigator !== 'undefined' && navigator.onLine === false;

  const readCache = async () => {
    if (!canUseCache) return null;
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(url);
      if (!cached) return null;
      const data = await cached.json();
      const timestamp = readMetaTimestamp(url);
      const stale =
        typeof timestamp === 'number' ? Date.now() - timestamp > ttl : true;
      return { data, timestamp, stale };
    } catch (error) {
      throw new WeatherFetchError(
        'parsing',
        'Unable to read cached weather data.',
        { error },
      );
    }
  };

  const writeCache = async (response, timestamp) => {
    if (!canUseCache) return;
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, response.clone());
      writeMetaTimestamp(url, timestamp);
    } catch {
      // Ignore cache errors
    }
  };

  const fetchFromNetwork = async () => {
    if (!allowNetwork) {
      throw new WeatherFetchError(
        'network-disabled',
        'Network access is disabled.',
      );
    }
    if (isOffline) {
      throw new WeatherFetchError('offline', 'You appear to be offline.');
    }
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new WeatherFetchError(
        'http',
        `Failed to fetch weather (${res.status})`,
        { status: res.status },
      );
    }
    const cloned = res.clone();
    let data;
    try {
      data = await res.json();
    } catch (error) {
      throw new WeatherFetchError(
        'parsing',
        'Unable to parse weather response.',
        { error },
      );
    }
    const timestamp = Date.now();
    await writeCache(cloned, timestamp);
    return {
      data,
      meta: {
        source: 'network',
        cached: false,
        stale: false,
        timestamp,
      },
    };
  };

  const cached = await readCache().catch((error) => {
    if (error instanceof WeatherFetchError) return null;
    return null;
  });

  const cachePayload = cached
    ? {
        data: cached.data,
        meta: {
          source: 'cache',
          cached: true,
          stale: cached.stale,
          timestamp: cached.timestamp ?? undefined,
        },
      }
    : null;

  const effectiveStrategy =
    allowNetwork || strategy === 'cache-only' ? strategy : 'cache-only';

  if (effectiveStrategy === 'cache-only') {
    if (cachePayload) return cachePayload;
    throw new WeatherFetchError(
      allowNetwork ? 'offline' : 'network-disabled',
      allowNetwork
        ? 'You appear to be offline.'
        : 'Network access is disabled.',
    );
  }

  if (effectiveStrategy === 'cache-first') {
    if (cachePayload) {
      if (revalidate && allowNetwork && !isOffline) {
        const revalidatePromise = fetchFromNetwork().catch(() => null);
        return { ...cachePayload, revalidate: revalidatePromise };
      }
      return cachePayload;
    }
    return fetchFromNetwork();
  }

  try {
    return await fetchFromNetwork();
  } catch (error) {
    if (cachePayload) return cachePayload;
    throw error;
  }
}

export default WeatherApp;

export const displayWeather = () => <WeatherApp />;
