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
import { fetchWeather } from '../../components/apps/weather';
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
            disabled={status === 'loading' || !allowNetwork}
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
          className="weather-widget__status"
          role="status"
          aria-live="assertive"
        >
          {message}
        </div>
      )}
      <div
        className="weather-widget__current"
        role="group"
        aria-label={`Current conditions for ${snapshot.cityLabel}`}
      >
        <div className="weather-widget__header">
          <h2 className="weather-widget__city">{snapshot.cityLabel}</h2>
          {status === 'loading' && (
            <span className="weather-widget__loading" role="status">
              Loading…
            </span>
          )}
        </div>
        <div className="weather-widget__summary">
          <WeatherIcon code={snapshot.conditionCode} className="weather-widget__icon" />
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
        <dl className="weather-widget__sun-times">
          <div>
            <dt>Sunrise</dt>
            <dd>{formatTime(snapshot.sunrise)}</dd>
          </div>
          <div>
            <dt>Sunset</dt>
            <dd>{formatTime(snapshot.sunset)}</dd>
          </div>
        </dl>
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
