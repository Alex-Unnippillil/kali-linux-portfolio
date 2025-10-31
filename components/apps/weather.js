import dynamic from 'next/dynamic';
import { createLiveRegionLoader } from './createLiveRegionLoader';

// Dynamically load the full Weather application. This remains the default
// export so existing imports continue to work.
const WeatherApp = dynamic(() => import('../../apps/weather'), {
  ssr: false,
  loading: createLiveRegionLoader('Loading Weather App...', {
    className: 'flex min-h-[4rem] w-full items-center justify-center rounded bg-ub-cool-grey px-4 py-3 text-center',
  }),
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
    openMeteo: ({ lat, lon, timezone = 'auto' }) =>
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=apparent_temperature&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset&forecast_days=5&timezone=${encodeURIComponent(
        timezone,
      )}`,
  };

  const buildUrl = providers[provider];
  if (!buildUrl) throw new Error(`Unsupported weather provider: ${provider}`);

  const url = buildUrl(opts);

  // Attempt to serve from service worker cache first
  let cached;
  try {
    const cache = await caches.open('weather-data');
    cached = await cache.match(url);
    if (cached) {
      return await cached.json();
    }
  } catch {
    // Cache API might be unavailable; ignore errors
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch weather');

  // Cache the fresh response for offline use
  try {
    const cache = await caches.open('weather-data');
    cache.put(url, res.clone());
  } catch {
    // Ignore cache errors
  }

  return await res.json();
}

export default WeatherApp;

export const displayWeather = () => <WeatherApp />;

