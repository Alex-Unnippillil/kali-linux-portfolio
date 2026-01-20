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
  };

  const buildUrl = providers[provider];
  if (!buildUrl) throw new Error(`Unsupported weather provider: ${provider}`);

  const url = buildUrl(opts);

  const canUseCache =
    typeof globalThis !== 'undefined' && 'caches' in globalThis;

  let cached;
  if (canUseCache) {
    try {
      const cache = await caches.open('weather-data');
      cached = await cache.match(url);
    } catch {
      cached = undefined;
    }
  }

  try {
    const res = await fetch(url, { signal: opts.signal });
    if (!res.ok) {
      throw new Error('Failed to fetch weather');
    }

    if (canUseCache) {
      try {
        const cache = await caches.open('weather-data');
        await cache.put(url, res.clone());
      } catch {
        // Ignore cache errors
      }
    }

    return await res.json();
  } catch (error) {
    if (cached) {
      try {
        return await cached.json();
      } catch {
        // fall through to throw original error
      }
    }
    throw error;
  }
}

export default WeatherApp;

export const displayWeather = () => <WeatherApp />;
