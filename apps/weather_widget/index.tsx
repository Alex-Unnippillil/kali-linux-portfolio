'use client';

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import WeatherIcon from '../weather/components/WeatherIcon';
import { fetchWeather, WeatherFetchError } from '../../components/apps/weather';
import { safeLocalStorage } from '../../utils/safeStorage';
import { useSettings } from '../../hooks/useSettings';
import demoCity from './demoCity.json';
import './styles.css';

type Unit = 'metric' | 'imperial';

type ForecastEntry = {
  date: string;
  tempC: number;
  conditionCode: number;
};

type WeatherSnapshot = {
  cityLabel: string;
  temperatureC: number;
  feelsLikeC: number;
  conditionCode: number;
  conditionText: string;
  sunrise: string | null;
  sunset: string | null;
  humidity: number | null;
  precipitationChance: number | null;
  windSpeedKph: number | null;
  forecast: ForecastEntry[];
  updatedAt: number | null;
  stale: boolean;
};

type FetchOptions = {
  persistQuery?: boolean;
  storeAsLast?: boolean;
};

type WeatherResponse = {
  data: any;
  meta?: { stale?: boolean; timestamp?: number };
  revalidate?: Promise<{ data: any; meta?: { stale?: boolean; timestamp?: number } } | null>;
};

interface DemoCityData {
  label: string;
  temperatureC: number;
  feelsLikeC?: number;
  conditionCode: number;
  sunrise?: string;
  sunset?: string;
  forecast: ForecastEntry[];
}

const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Icy fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm',
};

const describeWeatherCode = (code: number) =>
  WEATHER_DESCRIPTIONS[code] ?? 'Unknown conditions';

const DEMO_CITY = demoCity as DemoCityData;

const FALLBACK_SNAPSHOT: WeatherSnapshot = {
  cityLabel: DEMO_CITY.label,
  temperatureC: DEMO_CITY.temperatureC,
  feelsLikeC: DEMO_CITY.feelsLikeC ?? DEMO_CITY.temperatureC,
  conditionCode: DEMO_CITY.conditionCode,
  conditionText: describeWeatherCode(DEMO_CITY.conditionCode),
  sunrise: DEMO_CITY.sunrise ?? null,
  sunset: DEMO_CITY.sunset ?? null,
  humidity: null,
  precipitationChance: null,
  windSpeedKph: null,
  forecast: DEMO_CITY.forecast.map((entry) => ({ ...entry })),
  updatedAt: null,
  stale: false,
};

const MAX_SAVED_CITIES = 8;

const STORAGE_KEYS = {
  unit: 'weatherUnit',
  saved: 'savedCities',
  pinned: 'pinnedCity',
  last: 'lastCity',
} as const;

function convertTemperature(tempC: number, unit: Unit) {
  return unit === 'metric' ? tempC : tempC * 1.8 + 32;
}

function convertWindSpeed(speedKph: number, unit: Unit) {
  return unit === 'metric' ? speedKph : speedKph * 0.621371;
}

function formatTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function normalizeOpenMeteo(
  data: any,
  label: string,
  meta: { updatedAt: number | null; stale: boolean },
): WeatherSnapshot {
  const current = data?.current_weather ?? {};
  const hourlyTimes: string[] = Array.isArray(data?.hourly?.time)
    ? data.hourly.time
    : [];
  const hourlyApparent: number[] = Array.isArray(
    data?.hourly?.apparent_temperature,
  )
    ? data.hourly.apparent_temperature
    : [];
  const hourlyHumidity: number[] = Array.isArray(
    data?.hourly?.relative_humidity_2m,
  )
    ? data.hourly.relative_humidity_2m
    : [];
  const hourlyPrecip: number[] = Array.isArray(
    data?.hourly?.precipitation_probability,
  )
    ? data.hourly.precipitation_probability
    : [];
  let feelsLike =
    typeof current.temperature === 'number'
      ? current.temperature
      : FALLBACK_SNAPSHOT.temperatureC;
  let humidity: number | null = null;
  let precipitationChance: number | null = null;
  if (typeof current.time === 'string') {
    const idx = hourlyTimes.indexOf(current.time);
    if (idx >= 0 && typeof hourlyApparent[idx] === 'number') {
      feelsLike = hourlyApparent[idx];
    }
    if (idx >= 0 && typeof hourlyHumidity[idx] === 'number') {
      humidity = hourlyHumidity[idx];
    }
    if (idx >= 0 && typeof hourlyPrecip[idx] === 'number') {
      precipitationChance = hourlyPrecip[idx];
    }
  }

  const forecastEntries: ForecastEntry[] = Array.isArray(data?.daily?.time)
    ? data.daily.time.reduce((acc: ForecastEntry[], date: string, idx: number) => {
        const tempMax = data.daily.temperature_2m_max?.[idx];
        const code = data.daily.weathercode?.[idx];
        if (typeof tempMax === 'number' && typeof code === 'number') {
          acc.push({
            date,
            tempC: tempMax,
            conditionCode: code,
          });
        }
        return acc;
      }, [])
    : [];

  const sunrise = Array.isArray(data?.daily?.sunrise)
    ? data.daily.sunrise[0] ?? null
    : null;
  const sunset = Array.isArray(data?.daily?.sunset)
    ? data.daily.sunset[0] ?? null
    : null;

  const conditionCode =
    typeof current.weathercode === 'number'
      ? current.weathercode
      : FALLBACK_SNAPSHOT.conditionCode;
  const temperatureC =
    typeof current.temperature === 'number'
      ? current.temperature
      : FALLBACK_SNAPSHOT.temperatureC;
  const windSpeedKph =
    typeof current.windspeed === 'number' ? current.windspeed : null;

  const forecast =
    forecastEntries.length > 0
      ? forecastEntries.slice(0, 5)
      : FALLBACK_SNAPSHOT.forecast.map((entry) => ({ ...entry }));

  return {
    cityLabel: label,
    temperatureC,
    feelsLikeC: feelsLike,
    conditionCode,
    conditionText: describeWeatherCode(conditionCode),
    sunrise: sunrise ?? FALLBACK_SNAPSHOT.sunrise,
    sunset: sunset ?? FALLBACK_SNAPSHOT.sunset,
    humidity,
    precipitationChance,
    windSpeedKph,
    forecast,
    updatedAt: meta.updatedAt,
    stale: meta.stale,
  };
}

export default function WeatherWidget() {
  const { allowNetwork, reducedMotion, largeHitAreas } = useSettings();
  const [unit, setUnit] = useState<Unit>('metric');
  const [cityQuery, setCityQuery] = useState(FALLBACK_SNAPSHOT.cityLabel);
  const [savedCities, setSavedCities] = useState<string[]>([]);
  const [pinnedCity, setPinnedCity] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<WeatherSnapshot>(FALLBACK_SNAPSHOT);
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const hydrated = useRef(false);
  const initialCityRef = useRef<string | null>(FALLBACK_SNAPSHOT.cityLabel);
  const prevAllowNetwork = useRef<boolean>(allowNetwork);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!safeLocalStorage) {
      hydrated.current = true;
      return;
    }

    try {
      const storedUnit = safeLocalStorage.getItem(STORAGE_KEYS.unit);
      if (storedUnit === 'metric' || storedUnit === 'imperial') {
        setUnit(storedUnit);
      }
    } catch {}

    try {
      const storedCities = safeLocalStorage.getItem(STORAGE_KEYS.saved);
      if (storedCities) {
        const parsed = JSON.parse(storedCities);
        if (Array.isArray(parsed)) {
          setSavedCities(
            parsed
              .map((city) => (typeof city === 'string' ? city : null))
              .filter((city): city is string => Boolean(city)),
          );
        }
      }
    } catch {}

    try {
      const storedPinned = safeLocalStorage.getItem(STORAGE_KEYS.pinned);
      if (storedPinned) {
        setPinnedCity(storedPinned);
        initialCityRef.current = storedPinned;
        setCityQuery(storedPinned);
      }
    } catch {}

    if (initialCityRef.current === FALLBACK_SNAPSHOT.cityLabel) {
      try {
        const lastCity = safeLocalStorage.getItem(STORAGE_KEYS.last);
        if (lastCity) {
          initialCityRef.current = lastCity;
          setCityQuery(lastCity);
        }
      } catch {}
    }

    hydrated.current = true;
  }, []);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const fetchCity = useCallback(
    async (cityName: string, options: FetchOptions = {}) => {
      const trimmed = cityName.trim();
      if (!trimmed) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus('loading');
      setMessage(null);

      try {
        const strategy = allowNetwork
          ? offline
            ? 'cache-first'
            : 'cache-first'
          : 'cache-only';
        const shouldRevalidate = allowNetwork && !offline;

        const geoResponse = (await fetchWeather('openMeteoGeo', {
          name: trimmed,
          count: 1,
          language: 'en',
          format: 'json',
          strategy,
          allowNetwork,
          signal: controller.signal,
          revalidate: shouldRevalidate,
        })) as WeatherResponse;
        if (abortRef.current !== controller) return;
        const geoJson = geoResponse?.data ?? geoResponse;
        const result = geoJson?.results?.[0];
        if (!result) {
          throw new WeatherFetchError('not-found', 'City not found');
        }

        const labelParts = [result.name, result.admin1, result.country_code]
          .filter(Boolean)
          .map((part: string) => part.trim())
          .filter(Boolean);
        const label = labelParts.join(', ');

        const weatherResponse = (await fetchWeather('openMeteo', {
          lat: result.latitude,
          lon: result.longitude,
          timezone: result.timezone || 'auto',
          hourly:
            'apparent_temperature,relative_humidity_2m,precipitation_probability',
          daily:
            'weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset',
          forecast_days: 5,
          strategy,
          allowNetwork,
          signal: controller.signal,
          revalidate: shouldRevalidate,
        })) as WeatherResponse;
        if (abortRef.current !== controller) return;

        const weatherData = weatherResponse?.data ?? weatherResponse;
        const nextSnapshot = normalizeOpenMeteo(weatherData, label, {
          updatedAt: weatherResponse?.meta?.timestamp ?? null,
          stale: Boolean(weatherResponse?.meta?.stale),
        });
        setSnapshot(nextSnapshot);

        const statusMessage = !allowNetwork
          ? 'Network access is disabled in Settings. Showing cached data when available.'
          : offline
            ? 'You are offline. Showing cached data when available.'
            : weatherResponse?.meta?.stale
              ? 'Showing cached data while refreshing.'
              : null;
        setMessage(statusMessage);

        if (weatherResponse?.revalidate) {
          weatherResponse.revalidate.then((next: WeatherResponse | null) => {
            if (!next || abortRef.current !== controller) return;
            const revalidated = normalizeOpenMeteo(next.data, label, {
              updatedAt: next.meta?.timestamp ?? null,
              stale: Boolean(next.meta?.stale),
            });
            setSnapshot(revalidated);
            setMessage(
              !allowNetwork
                ? 'Network access is disabled in Settings. Showing cached data when available.'
                : offline
                  ? 'You are offline. Showing cached data when available.'
                  : null,
            );
          });
        }

        if (options.persistQuery !== false) {
          setCityQuery(label);
        }

        try {
          if (safeLocalStorage && options.storeAsLast !== false) {
            safeLocalStorage.setItem(STORAGE_KEYS.last, label);
          }
        } catch {}

        setSavedCities((prev) => {
          if (prev.includes(label)) return prev;
          const next = [...prev.slice(-(MAX_SAVED_CITIES - 1)), label];
          if (safeLocalStorage) {
            try {
              safeLocalStorage.setItem(
                STORAGE_KEYS.saved,
                JSON.stringify(next),
              );
            } catch {}
          }
          return next;
        });

        setPinnedCity((current) => {
          if (!current) return current;
          if (
            current.toLowerCase() === trimmed.toLowerCase() ||
            current.toLowerCase() === label.toLowerCase()
          ) {
            if (safeLocalStorage) {
              try {
                safeLocalStorage.setItem(STORAGE_KEYS.pinned, label);
              } catch {}
            }
            return label;
          }
          return current;
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof WeatherFetchError) {
          if (error.type === 'not-found') {
            setMessage('City not found. Try a nearby region or country.');
          } else if (error.type === 'network-disabled') {
            setMessage(
              'Network access is disabled in Settings. Showing demo data.',
            );
          } else if (error.type === 'offline') {
            setMessage('You are offline. Showing demo data.');
          } else {
            setMessage(
              'Unable to fetch live weather data. Showing the demo city instead.',
            );
          }
        } else {
          setMessage(
            'Unable to fetch live weather data. Showing the demo city instead.',
          );
        }
        setSnapshot(FALLBACK_SNAPSHOT);
      } finally {
        setStatus('idle');
      }
    },
    [allowNetwork, offline],
  );

  useEffect(() => {
    if (!hydrated.current) return;

    if (!allowNetwork) {
      setStatus('idle');
      setMessage(
        'Network access is disabled in Settings. Showing cached data when available.',
      );
    } else if (offline) {
      setMessage('You are offline. Showing cached data when available.');
    } else {
      setMessage(null);
    }

    if (initialCityRef.current) {
      const initialCity = initialCityRef.current;
      initialCityRef.current = null;
      fetchCity(initialCity, { persistQuery: true, storeAsLast: true });
    }

    if (!prevAllowNetwork.current && allowNetwork) {
      const target = pinnedCity ?? cityQuery;
      if (target) {
        fetchCity(target, { persistQuery: true, storeAsLast: true });
      }
    }

    prevAllowNetwork.current = allowNetwork;
  }, [allowNetwork, offline, cityQuery, pinnedCity, fetchCity]);

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      safeLocalStorage.setItem(STORAGE_KEYS.unit, unit);
    } catch {}
  }, [unit]);

  const dayFormatter = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, { weekday: 'short' });
    } catch {
      return null;
    }
  }, []);

  const formattedForecast = useMemo(() => {
    return snapshot.forecast.map((entry) => {
      const date = new Date(entry.date);
      const label =
        dayFormatter && !Number.isNaN(date.getTime())
          ? dayFormatter.format(date)
          : entry.date;
      return {
        key: entry.date,
        label,
        code: entry.conditionCode,
        temp: Math.round(convertTemperature(entry.tempC, unit)),
      };
    });
  }, [snapshot, unit, dayFormatter]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchCity(cityQuery, { persistQuery: true, storeAsLast: true });
  };

  const handleUnitChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setUnit(event.target.value as Unit);
  };

  const togglePin = () => {
    const label = snapshot.cityLabel.trim();
    if (!label) return;
    setPinnedCity((current) => {
      const next = current === label ? null : label;
      if (safeLocalStorage) {
        try {
          if (next) {
            safeLocalStorage.setItem(STORAGE_KEYS.pinned, next);
          } else {
            safeLocalStorage.removeItem(STORAGE_KEYS.pinned);
          }
        } catch {}
      }
      return next;
    });
  };

  const refresh = () => {
    fetchCity(snapshot.cityLabel, { persistQuery: true, storeAsLast: true });
  };

  const unitSymbol = unit === 'metric' ? 'C' : 'F';
  const temperature = Math.round(convertTemperature(snapshot.temperatureC, unit));
  const feelsLike = Math.round(convertTemperature(snapshot.feelsLikeC, unit));
  const windSpeed =
    snapshot.windSpeedKph === null
      ? '—'
      : `${Math.round(convertWindSpeed(snapshot.windSpeedKph, unit))} ${
          unit === 'metric' ? 'km/h' : 'mph'
        }`;
  const humidity =
    snapshot.humidity === null ? '—' : `${Math.round(snapshot.humidity)}%`;
  const precipitation =
    snapshot.precipitationChance === null
      ? '—'
      : `${Math.round(snapshot.precipitationChance)}%`;
  const updatedLabel =
    snapshot.updatedAt && !Number.isNaN(new Date(snapshot.updatedAt).getTime())
      ? new Date(snapshot.updatedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  const rootClass = [
    'weather-widget',
    reducedMotion ? 'weather-widget--static' : '',
    largeHitAreas ? 'weather-widget--large-hit' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={rootClass} aria-label="Weather widget">
      <form className="weather-widget__controls" onSubmit={handleSubmit}>
        <div className="weather-widget__field">
          <label htmlFor="weather-widget-city">City</label>
            <input
              id="weather-widget-city"
              name="city"
              type="text"
              list="weather-widget-saved"
              autoComplete="off"
              aria-label="Search city"
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
              placeholder="Search city"
            />
          <datalist id="weather-widget-saved">
            {savedCities.map((city) => (
              <option value={city} key={city}>
                {city}
              </option>
            ))}
          </datalist>
        </div>
        <div className="weather-widget__field">
          <label htmlFor="weather-widget-unit">Units</label>
          <select
            id="weather-widget-unit"
            name="unit"
            value={unit}
            onChange={handleUnitChange}
          >
            <option value="metric">Celsius (°C)</option>
            <option value="imperial">Fahrenheit (°F)</option>
          </select>
        </div>
        <div className="weather-widget__actions">
          <button type="submit" disabled={status === 'loading'}>
            Update
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={status === 'loading'}
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={togglePin}
            aria-pressed={pinnedCity === snapshot.cityLabel}
          >
            {pinnedCity === snapshot.cityLabel ? 'Unpin' : 'Pin'}
          </button>
        </div>
      </form>
      {message && (
        <div
          className="weather-widget__alert"
          role="status"
          aria-live="assertive"
        >
          <span className="weather-widget__alert-badge" aria-hidden="true">
            !
          </span>
          <span className="weather-widget__alert-text">{message}</span>
        </div>
      )}
      <div
        className="weather-widget__current"
        role="group"
        aria-label={`Current conditions for ${snapshot.cityLabel}`}
      >
        <div className="weather-widget__header">
          <h2 className="weather-widget__city">{snapshot.cityLabel}</h2>
          <div className="weather-widget__status">
            {updatedLabel && (
              <span className="weather-widget__updated">
                {snapshot.stale ? 'Cached' : 'Updated'} {updatedLabel}
              </span>
            )}
            {status === 'loading' && (
              <span className="weather-widget__loading" role="status">
                Loading…
              </span>
            )}
          </div>
        </div>
        <div className="weather-widget__summary-grid">
          <div className="weather-widget__summary">
            <WeatherIcon
              code={snapshot.conditionCode}
              className="weather-widget__icon"
            />
            <div className="weather-widget__readings">
              <div className="weather-widget__temperature" aria-live="polite">
                {temperature}°{unitSymbol}
              </div>
              <div className="weather-widget__feels">
                Feels like {feelsLike}°{unitSymbol}
              </div>
              <div className="weather-widget__condition">{snapshot.conditionText}</div>
            </div>
          </div>
          <dl
            className="weather-widget__metrics"
            aria-label="Weather metrics"
          >
            <div className="weather-widget__metric">
              <dt>
                <span
                  className="weather-widget__metric-icon"
                  aria-hidden="true"
                >
                  ↑
                </span>
                <span>Sunrise</span>
              </dt>
              <dd>{formatTime(snapshot.sunrise)}</dd>
            </div>
            <div className="weather-widget__metric">
              <dt>
                <span
                  className="weather-widget__metric-icon weather-widget__metric-icon--sunset"
                  aria-hidden="true"
                >
                  ↓
                </span>
                <span>Sunset</span>
              </dt>
              <dd>{formatTime(snapshot.sunset)}</dd>
            </div>
            <div className="weather-widget__metric">
              <dt>
                <span className="weather-widget__metric-icon" aria-hidden="true">
                  💨
                </span>
                <span>Wind</span>
              </dt>
              <dd>{windSpeed}</dd>
            </div>
            <div className="weather-widget__metric">
              <dt>
                <span className="weather-widget__metric-icon" aria-hidden="true">
                  💧
                </span>
                <span>Humidity</span>
              </dt>
              <dd>{humidity}</dd>
            </div>
            <div className="weather-widget__metric">
              <dt>
                <span className="weather-widget__metric-icon" aria-hidden="true">
                  ☔
                </span>
                <span>Precip</span>
              </dt>
              <dd>{precipitation}</dd>
            </div>
          </dl>
        </div>
      </div>
      {formattedForecast.length > 0 && (
        <div className="weather-widget__forecast" role="list" aria-label="5-day forecast">
          {formattedForecast.map((entry) => (
            <div
              key={entry.key}
              role="listitem"
              className="weather-widget__forecast-day"
            >
              <span className="weather-widget__forecast-label">{entry.label}</span>
              <WeatherIcon
                code={entry.code}
                className="weather-widget__forecast-icon"
              />
              <span className="weather-widget__forecast-temp">
                {entry.temp}°{unitSymbol}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
