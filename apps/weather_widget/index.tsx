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
import clsx from 'clsx';
import WeatherIcon from '../weather/components/WeatherIcon';
import { fetchWeather } from '../../components/apps/weather';
import { safeLocalStorage } from '../../utils/safeStorage';
import { useSettings } from '../../hooks/useSettings';
import demoCity from './demoCity.json';

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
  forecast: ForecastEntry[];
};

type FetchOptions = {
  persistQuery?: boolean;
  storeAsLast?: boolean;
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
  forecast: DEMO_CITY.forecast.map((entry) => ({ ...entry })),
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

function formatTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function normalizeOpenMeteo(data: any, label: string): WeatherSnapshot {
  const current = data?.current_weather ?? {};
  const hourlyTimes: string[] = Array.isArray(data?.hourly?.time)
    ? data.hourly.time
    : [];
  const hourlyApparent: number[] = Array.isArray(
    data?.hourly?.apparent_temperature,
  )
    ? data.hourly.apparent_temperature
    : [];
  let feelsLike =
    typeof current.temperature === 'number'
      ? current.temperature
      : FALLBACK_SNAPSHOT.temperatureC;
  if (typeof current.time === 'string') {
    const idx = hourlyTimes.indexOf(current.time);
    if (idx >= 0 && typeof hourlyApparent[idx] === 'number') {
      feelsLike = hourlyApparent[idx];
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
    forecast,
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
  const hydrated = useRef(false);
  const initialCityRef = useRef<string | null>(FALLBACK_SNAPSHOT.cityLabel);
  const prevAllowNetwork = useRef<boolean>(allowNetwork);

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

  const fetchCity = useCallback(
    async (cityName: string, options: FetchOptions = {}) => {
      const trimmed = cityName.trim();
      if (!trimmed) return;

      if (!allowNetwork) {
        setStatus('idle');
        setMessage(
          'Network access is disabled in Settings. Showing demo data.',
        );
        setSnapshot(FALLBACK_SNAPSHOT);
        return;
      }

      setStatus('loading');
      setMessage(null);

      try {
        const geoResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            trimmed,
          )}&count=1&language=en&format=json`,
        );
        if (!geoResponse.ok) {
          throw new Error('Failed to resolve city coordinates');
        }
        const geoJson = await geoResponse.json();
        const result = geoJson?.results?.[0];
        if (!result) {
          throw new Error('City not found');
        }

        const labelParts = [result.name, result.admin1, result.country_code]
          .filter(Boolean)
          .map((part: string) => part.trim())
          .filter(Boolean);
        const label = labelParts.join(', ');

        const weatherData = await fetchWeather('openMeteo', {
          lat: result.latitude,
          lon: result.longitude,
          timezone: result.timezone || 'auto',
        });

        const nextSnapshot = normalizeOpenMeteo(weatherData, label);
        setSnapshot(nextSnapshot);

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
        console.error('Weather widget fetch failed', error);
        setSnapshot(FALLBACK_SNAPSHOT);
        setMessage(
          'Unable to fetch live weather data. Showing the demo city instead.',
        );
      } finally {
        setStatus('idle');
      }
    },
    [allowNetwork],
  );

  useEffect(() => {
    if (!hydrated.current) return;

    if (!allowNetwork) {
      setStatus('idle');
      setMessage(
        'Network access is disabled in Settings. Showing demo data.',
      );
      setSnapshot(FALLBACK_SNAPSHOT);
    } else {
      setMessage(null);
    }

    if (allowNetwork && initialCityRef.current) {
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
  }, [allowNetwork, cityQuery, pinnedCity, fetchCity]);

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

  const rootClass = clsx(
    'flex min-w-0 flex-col gap-4 rounded-2xl border border-kali-border/70 bg-[color:var(--kali-surface)] p-5 text-[color:var(--kali-text)] shadow-kali-panel',
    reducedMotion && 'motion-reduce:animate-none',
  );

  const inputClass = clsx(
    'w-full rounded-lg border border-kali-border/70 bg-[color:color-mix(in_srgb,var(--kali-panel-border)_22%,transparent)] px-3 py-2 text-sm text-[color:var(--kali-text)] shadow-sm transition',
    'focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]',
    largeHitAreas && 'min-h-[44px]',
  );

  const buttonBase = clsx(
    'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus',
    largeHitAreas && 'min-h-[44px]',
  );

  const primaryButtonClass = clsx(
    buttonBase,
    'border border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-inverse)] shadow-sm hover:bg-[color:color-mix(in_srgb,var(--color-accent)_88%,transparent)]',
    status === 'loading' && 'cursor-not-allowed opacity-70',
  );

  const subtleButtonClass = clsx(
    buttonBase,
    'border border-kali-border/70 text-[color:var(--color-accent)] hover:bg-[color:color-mix(in_srgb,var(--color-accent)_12%,transparent)]',
    (status === 'loading' || !allowNetwork) && 'cursor-not-allowed opacity-60',
  );

  const pinButtonClass = clsx(
    buttonBase,
    'border border-kali-border/70 text-[color:var(--kali-text)] hover:bg-[color:color-mix(in_srgb,var(--kali-panel-border)_16%,transparent)]',
  );

  return (
    <section className={rootClass} aria-label="Weather widget">
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm font-medium">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-[color:var(--kali-text)]">City</span>
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
            className={inputClass}
          />
          <datalist id="weather-widget-saved">
            {savedCities.map((city) => (
              <option value={city} key={city}>
                {city}
              </option>
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-[color:var(--kali-text)]">Units</span>
          <select
            id="weather-widget-unit"
            name="unit"
            value={unit}
            onChange={handleUnitChange}
            className={inputClass}
          >
            <option value="metric">Celsius (°C)</option>
            <option value="imperial">Fahrenheit (°F)</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <button type="submit" className={primaryButtonClass} disabled={status === 'loading'}>
            Update
          </button>
          <button type="button" onClick={refresh} className={subtleButtonClass} disabled={status === 'loading' || !allowNetwork}>
            Refresh
          </button>
          <button
            type="button"
            onClick={togglePin}
            aria-pressed={pinnedCity === snapshot.cityLabel}
            className={pinButtonClass}
          >
            {pinnedCity === snapshot.cityLabel ? 'Unpin' : 'Pin'}
          </button>
        </div>
      </form>
      {message && (
        <div
          className="flex items-center gap-3 rounded-xl border border-[color:var(--color-accent)]/35 bg-[color:color-mix(in_srgb,var(--color-accent)_14%,transparent)] p-4 text-sm shadow-sm"
          role="status"
          aria-live="assertive"
        >
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-[color:var(--color-inverse)] text-xs font-bold uppercase"
            aria-hidden="true"
          >
            !
          </span>
          <span className="leading-relaxed text-[color:color-mix(in_srgb,var(--kali-text)_90%,transparent)]">{message}</span>
        </div>
      )}
      <div
        className="rounded-xl border border-kali-border/70 bg-[color:color-mix(in_srgb,var(--kali-control)_8%,transparent)] p-4 shadow-inner"
        role="group"
        aria-label={`Current conditions for ${snapshot.cityLabel}`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-[color:var(--kali-text)]">{snapshot.cityLabel}</h2>
          {status === 'loading' && (
            <span className="text-xs uppercase tracking-wide text-kali-muted" role="status">
              Loading…
            </span>
          )}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-4">
            <WeatherIcon
              code={snapshot.conditionCode}
              className={clsx('h-16 w-16 text-[color:var(--color-accent)]', reducedMotion && 'motion-reduce:animate-none')}
            />
            <div className="grid gap-1">
              <div className="text-3xl font-bold" aria-live="polite">
                {temperature}°{unitSymbol}
              </div>
              <div className="text-sm text-kali-muted">Feels like {feelsLike}°{unitSymbol}</div>
              <div className="text-sm text-[color:var(--kali-text)]">{snapshot.conditionText}</div>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 md:gap-4" aria-label="Sunrise and sunset times">
            <div className="rounded-lg border border-kali-border/70 bg-[color:color-mix(in_srgb,var(--kali-control)_12%,transparent)] p-3 shadow-sm">
              <dt className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-wide text-kali-muted">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-[color:var(--color-inverse)] text-sm" aria-hidden="true">
                  ↑
                </span>
                Sunrise
              </dt>
              <dd className="mt-1 text-lg font-semibold text-[color:var(--kali-text)]">{formatTime(snapshot.sunrise)}</dd>
            </div>
            <div className="rounded-lg border border-kali-border/70 bg-[color:color-mix(in_srgb,var(--kali-control)_12%,transparent)] p-3 shadow-sm">
              <dt className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-wide text-kali-muted">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-accent)_70%,transparent)] text-[color:var(--color-inverse)] text-sm" aria-hidden="true">
                  ↓
                </span>
                Sunset
              </dt>
              <dd className="mt-1 text-lg font-semibold text-[color:var(--kali-text)]">{formatTime(snapshot.sunset)}</dd>
            </div>
          </dl>
        </div>
      </div>
      {formattedForecast.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5" role="list" aria-label="5-day forecast">
          {formattedForecast.map((entry) => (
            <div
              key={entry.key}
              role="listitem"
              className="rounded-xl border border-kali-border/60 bg-[color:color-mix(in_srgb,var(--kali-control)_10%,transparent)] p-3 text-center shadow-sm"
            >
              <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_86%,transparent)]">
                {entry.label}
              </span>
              <WeatherIcon
                code={entry.code}
                className={clsx('mx-auto h-11 w-11 text-[color:var(--color-accent)]', reducedMotion && 'motion-reduce:animate-none')}
              />
              <span className="text-sm font-semibold text-[color:var(--kali-text)]">{entry.temp}°{unitSymbol}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
