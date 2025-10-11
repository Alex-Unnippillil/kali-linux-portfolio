import dynamic from 'next/dynamic';
import { buildDemoWeather } from '../../apps/weather/demoData';
import { normalizeUnit } from '../../apps/weather/units';
import { getAllowNetwork } from '../../utils/settingsStore';

// Dynamically load the full Weather application. This remains the default
// export so existing imports continue to work.
const WeatherApp = dynamic(() => import('../../apps/weather'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

/**
 * A provider agnostic weather fetcher with basic service worker caching.
 *
 * This wrapper accepts a provider name and an options object. Each provider
 * defines a function for building the request URL. Results are cached using
 * the Cache Storage API so subsequent calls can be served while offline.
 */
export async function fetchWeather(provider, opts = {}) {
  const unit = normalizeUnit(opts.unit);
  const allowNetwork = await getAllowNetwork();
  const isOffline =
    typeof navigator !== 'undefined' ? navigator.onLine === false : false;

  const fallbackCity =
    opts.cityData ||
    (typeof opts.lat === 'number' && typeof opts.lon === 'number'
      ? {
          id:
            opts.cityId ||
            `${opts.city || opts.cityName || 'city'}-${opts.lat}-${opts.lon}`,
          name: opts.city || opts.cityName || 'City',
          lat: opts.lat,
          lon: opts.lon,
        }
      : null);

  if (provider === 'demo' || !allowNetwork || isOffline) {
    if (!fallbackCity) {
      throw new Error('City metadata required when using demo weather data');
    }
    return buildDemoWeather(fallbackCity);
  }

  const providers = {
    openWeather: ({ city, apiKey, unit: providerUnit }) => {
      if (!city || !apiKey) {
        throw new Error('openWeather provider requires city and apiKey');
      }
      const normalizedUnit = providerUnit === 'imperial' ? 'imperial' : 'metric';
      return `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city,
      )}&units=${normalizedUnit}&appid=${apiKey}`;
    },
    openMeteo: ({ lat, lon, unit: providerUnit }) => {
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        throw new Error('openMeteo provider requires latitude and longitude');
      }
      const temperatureUnit = providerUnit === 'imperial' ? 'fahrenheit' : 'celsius';
      return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max&forecast_days=5&timezone=auto&temperature_unit=${temperatureUnit}`;
    },
  };

  const buildUrl = providers[provider];
  if (!buildUrl) throw new Error(`Unsupported weather provider: ${provider}`);

  const url = buildUrl({ ...opts, unit });

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

