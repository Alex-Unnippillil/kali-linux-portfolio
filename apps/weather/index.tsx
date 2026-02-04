'use client';

import {
  DragEvent,
  FormEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useWeatherState, {
  City,
  ForecastDay,
  WeatherReading,
  useCurrentGroup,
  useWeatherGroups,
} from './state';
import Forecast from './components/Forecast';
import CityDetail from './components/CityDetail';
import WeatherIcon from './components/WeatherIcon';
import { fetchWeather, WeatherFetchError } from '../../components/apps/weather';
import { useSettings } from '../../hooks/useSettings';

interface GeoResult {
  name: string;
  admin1?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

interface CityTileProps {
  city: City;
  loading: boolean;
  statusLabel?: string;
  onOpen: () => void;
  onRefresh: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onClearError: () => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canFetch: boolean;
}

type WeatherResponse = {
  data: any;
  meta?: { stale?: boolean; timestamp?: number };
  revalidate?: Promise<{ data: any; meta?: { stale?: boolean; timestamp?: number } } | null>;
};

const WEATHER_TTL = 10 * 60 * 1000;
const DEFAULT_DAILY =
  'weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset';

const formatCityLabel = (result: GeoResult) => {
  const parts = [result.name, result.admin1, result.country_code]
    .filter((part): part is string => typeof part === 'string')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.join(', ');
};

const formatUpdatedTime = (time?: number, stale?: boolean) => {
  if (!time) return 'No cached data';
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return 'No cached data';
  return `${stale ? 'Cached' : 'Updated'} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

function CityTile({
  city,
  loading,
  statusLabel,
  onOpen,
  onRefresh,
  onRemove,
  onEdit,
  onMoveUp,
  onMoveDown,
  onClearError,
  onDragStart,
  onDragEnd,
  canMoveUp,
  canMoveDown,
  canFetch,
}: CityTileProps) {
  const reading = city.lastReading;
  const hasReading = Boolean(reading);
  const tempLabel = hasReading
    ? `${Math.round(reading!.temp)}°C`
    : '—';
  const iconCode = reading?.condition ?? 3;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70"
          aria-label={`Open ${city.name} details`}
        >
          <div className="text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
            Current
          </div>
          <div className="mt-1 text-xl font-semibold text-[color:var(--kali-text)]">
            {city.name}
          </div>
          <div
            className={`mt-2 text-4xl font-bold ${
              hasReading
                ? 'text-[color:var(--kali-text)]'
                : 'text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]'
            }`}
          >
            {tempLabel}
          </div>
          {statusLabel && (
            <div className="mt-2 text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
              {statusLabel}
            </div>
          )}
        </button>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="cursor-grab rounded border border-[color:var(--kali-panel-border)] px-2 py-1 text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)] transition hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70 active:cursor-grabbing"
            aria-label={`Drag ${city.name}`}
            title="Drag to reorder"
          >
            Drag
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={!canFetch || loading}
            className="rounded border border-[color:var(--kali-panel-border)] px-2 py-1 text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)] transition hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Refresh ${city.name}`}
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded border border-[color:var(--kali-panel-border)] px-2 py-1 text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)] transition hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70"
            aria-label={`Edit ${city.name}`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded border border-[color:color-mix(in_srgb,var(--kali-panel-border)_60%,transparent)] px-2 py-1 text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)] transition hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70"
            aria-label={`Remove ${city.name}`}
          >
            Remove
          </button>
          {loading && (
            <span className="text-[10px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
              Updating…
            </span>
          )}
        </div>
        <WeatherIcon
          code={iconCode}
          className="h-16 w-16 sm:h-20 sm:w-20"
        />
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-wider text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
          Next 5 days
        </div>
        {loading && !city.forecast ? (
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={`forecast-skel-${city.id}-${idx}`}
                className="h-16 rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,transparent)] animate-pulse"
              />
            ))}
          </div>
        ) : city.forecast ? (
          <Forecast days={city.forecast.slice(0, 5)} />
        ) : (
          <div className="text-sm text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
            Forecast data will appear once the city is refreshed.
          </div>
        )}
      </div>

      {city.lastError && (
        <div className="rounded border border-[color:color-mix(in_srgb,var(--kali-panel-border)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,transparent)] p-2 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
          <div className="flex items-center justify-between gap-3">
            <span>{city.lastError}</span>
            <button
              type="button"
              onClick={onClearError}
              className="rounded px-2 py-1 text-[10px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between text-xs text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
        <span>{formatUpdatedTime(reading?.time, city.lastReadingStale)}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="rounded px-2 py-1 uppercase tracking-wide transition hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Move ${city.name} up`}
          >
            Up
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="rounded px-2 py-1 uppercase tracking-wide transition hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Move ${city.name} down`}
          >
            Down
          </button>
        </div>
      </div>
    </div>
  );
}

interface CityEditModalProps {
  city: City;
  onClose: () => void;
  onSave: (update: { name: string; lat: number; lon: number }) => void;
}

function CityEditModal({ city, onClose, onSave }: CityEditModalProps) {
  const [name, setName] = useState(city.name);
  const [lat, setLat] = useState(String(city.lat));
  const [lon, setLon] = useState(String(city.lon));
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const descriptionId = useRef(`edit-city-desc-${city.id}`);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    nameRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const handleFocusTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const container = dialogRef.current;
      if (!container) return;
      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleFocusTrap);
    return () => {
      document.removeEventListener('keydown', handleFocusTrap);
    };
  }, []);

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      onClose();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextLat = Number.parseFloat(lat);
    const nextLon = Number.parseFloat(lon);
    if (!name.trim()) {
      setError('City name is required.');
      return;
    }
    if (Number.isNaN(nextLat) || Number.isNaN(nextLon)) {
      setError('Latitude and longitude must be valid numbers.');
      return;
    }
    setError(null);
    onSave({ name: name.trim(), lat: nextLat, lon: nextLon });
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-city-title"
        aria-describedby={descriptionId.current}
        ref={dialogRef}
        className="w-full max-w-md rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] p-4 text-[color:var(--kali-text)]"
      >
        <div className="mb-3 flex items-center justify-between">
          <div id="edit-city-title" className="text-lg font-semibold">
            Edit city
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)]"
          >
            Close
          </button>
        </div>
        <p
          id={descriptionId.current}
          className="text-xs text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]"
        >
          Update the city name or coordinates. Changes to coordinates will refresh cached data.
        </p>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="space-y-1 text-sm">
            <span className="text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
              Name
            </span>
            <input
              ref={nameRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] px-2 py-1 text-[color:var(--kali-text)]"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span className="text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
                Latitude
              </span>
              <input
                value={lat}
                onChange={(event) => setLat(event.target.value)}
                className="w-full rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] px-2 py-1 text-[color:var(--kali-text)]"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
                Longitude
              </span>
              <input
                value={lon}
                onChange={(event) => setLon(event.target.value)}
                className="w-full rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] px-2 py-1 text-[color:var(--kali-text)]"
              />
            </label>
          </div>
          {error && (
            <div className="rounded border border-[color:color-mix(in_srgb,var(--kali-panel-border)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,transparent)] p-2 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[color:var(--kali-panel-border)] px-3 py-1 text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-kali-control px-3 py-1 text-xs font-semibold uppercase tracking-wide text-black shadow-[0_0_12px_rgba(15,148,210,0.35)]"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WeatherApp() {
  const [cities, setCities] = useWeatherState();
  const [groups, setGroups] = useWeatherGroups();
  const [currentGroup, setCurrentGroup] = useCurrentGroup();
  const { allowNetwork } = useSettings();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'error'>(
    'idle',
  );
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'error'>(
    'idle',
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const dragSrc = useRef<number | null>(null);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const lastSearchRef = useRef<string>('');

  const isRefreshingAny = useMemo(
    () => Object.keys(loadingIds).length > 0,
    [loadingIds],
  );

  const citySignature = useMemo(
    () => cities.map((city) => `${city.id}:${city.lat}:${city.lon}`).join('|'),
    [cities],
  );

  useEffect(() => {
    if (!currentGroup) return;
    const group = groups.find((g) => g.name === currentGroup);
    if (group) {
      setCities(group.cities);
      if (!groupName) setGroupName(group.name);
    }
  }, [currentGroup, groupName, groups, setCities]);

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
    controllersRef.current.forEach((controller) => controller.abort());
    controllersRef.current.clear();
  }, [citySignature]);

  useEffect(() => {
    return () => {
      controllersRef.current.forEach((controller) => controller.abort());
      controllersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
    };
  }, []);

  const updateCity = useCallback(
    (id: string, update: Partial<City>) => {
      setCities((prev) =>
        prev.map((city) => (city.id === id ? { ...city, ...update } : city)),
      );
    },
    [setCities],
  );

  const fetchCityWeather = useCallback(
    async (city: City, { force = false }: { force?: boolean } = {}) => {
      const now = Date.now();
      const withinTtl =
        city.lastReading && now - city.lastReading.time < WEATHER_TTL;
      if (!force && withinTtl && !city.lastReadingStale) {
        return;
      }
      const existing = controllersRef.current.get(city.id);
      if (existing) existing.abort();
      const controller = new AbortController();
      controllersRef.current.set(city.id, controller);

      setLoadingIds((prev) => ({ ...prev, [city.id]: true }));
      updateCity(city.id, { lastError: undefined });

      try {
        const strategy = allowNetwork
          ? force && !offline
            ? 'network-first'
            : 'cache-first'
          : 'cache-only';
        const response = (await fetchWeather('openMeteo', {
          lat: city.lat,
          lon: city.lon,
          timezone: city.timezone ?? 'auto',
          hourly: 'apparent_temperature',
          daily: DEFAULT_DAILY,
          forecast_days: 5,
          signal: controller.signal,
          strategy,
          allowNetwork,
          revalidate: allowNetwork && !offline && !force,
          ttl: WEATHER_TTL,
        })) as WeatherResponse;

        if (controllersRef.current.get(city.id) !== controller) return;

        const data = response?.data ?? response;
        const current = data?.current_weather ?? {};
        const readingTime = response?.meta?.timestamp ?? Date.now();
        const nextReading: WeatherReading | undefined =
          typeof current.temperature === 'number' &&
          typeof current.weathercode === 'number'
            ? {
                temp: current.temperature,
                condition: current.weathercode,
                time: readingTime,
              }
            : city.lastReading;

        const forecast: ForecastDay[] = Array.isArray(data?.daily?.time)
          ? data.daily.time.reduce((acc: ForecastDay[], date: string, idx: number) => {
              const temp = data.daily.temperature_2m_max?.[idx];
              const condition = data.daily.weathercode?.[idx];
              if (typeof temp === 'number' && typeof condition === 'number') {
                acc.push({ date, temp, condition });
              }
              return acc;
            }, [])
          : [];

        updateCity(city.id, {
          lastReading: nextReading,
          lastReadingStale: Boolean(response?.meta?.stale),
          forecast: forecast.length ? forecast : city.forecast,
          timezone: data?.timezone ?? city.timezone,
          lastError: undefined,
        });

        if (response?.revalidate) {
          response.revalidate.then((next: WeatherResponse | null) => {
            if (!next || controllersRef.current.get(city.id) !== controller) return;
            const nextData = next.data;
            const nextCurrent = nextData?.current_weather ?? {};
            const nextReading: WeatherReading | undefined =
              typeof nextCurrent.temperature === 'number' &&
              typeof nextCurrent.weathercode === 'number'
                ? {
                    temp: nextCurrent.temperature,
                    condition: nextCurrent.weathercode,
                    time: next.meta?.timestamp ?? Date.now(),
                  }
                : city.lastReading;
            const nextForecast: ForecastDay[] = Array.isArray(nextData?.daily?.time)
              ? nextData.daily.time.reduce(
                  (acc: ForecastDay[], date: string, idx: number) => {
                    const temp = nextData.daily.temperature_2m_max?.[idx];
                    const condition = nextData.daily.weathercode?.[idx];
                    if (typeof temp === 'number' && typeof condition === 'number') {
                      acc.push({ date, temp, condition });
                    }
                    return acc;
                  },
                  [],
                )
              : [];
            updateCity(city.id, {
              lastReading: nextReading,
              lastReadingStale: Boolean(next.meta?.stale),
              forecast: nextForecast.length ? nextForecast : city.forecast,
              timezone: nextData?.timezone ?? city.timezone,
              lastError: undefined,
            });
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof WeatherFetchError) {
          const message =
            error.type === 'network-disabled'
              ? 'Network access is disabled in Settings.'
              : error.type === 'offline'
                ? 'You are offline.'
                : error.message;
          updateCity(city.id, { lastError: message });
        } else {
          updateCity(city.id, {
            lastError:
              error instanceof Error
                ? error.message
                : 'Unable to update this city right now.',
          });
        }
      } finally {
        if (controllersRef.current.get(city.id) === controller) {
          controllersRef.current.delete(city.id);
          setLoadingIds((prev) => {
            const next = { ...prev };
            delete next[city.id];
            return next;
          });
        }
      }
    },
    [allowNetwork, offline, updateCity],
  );

  useEffect(() => {
    cities.forEach((city) => {
      const needsRefresh =
        !city.lastReading ||
        Date.now() - city.lastReading.time > WEATHER_TTL ||
        city.lastReadingStale;
      if (needsRefresh) {
        fetchCityWeather(city);
      }
    });
  }, [cities, fetchCityWeather]);

  const addCity = useCallback(
    (newCity: City) => {
      setCities((prev) => {
        if (prev.some((city) => city.id === newCity.id)) return prev;
        return [...prev, newCity];
      });
    },
    [setCities],
  );

  const runSearch = useCallback(
    async (query: string, { immediate = false }: { immediate?: boolean } = {}) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      const strategy = allowNetwork
        ? offline
          ? 'cache-first'
          : 'network-first'
        : 'cache-only';

      if (!allowNetwork && strategy === 'cache-only' && !immediate) {
        setSearchError('Network access is disabled in Settings.');
        setSearchStatus('error');
        return;
      }

      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setSearchStatus('loading');
      setSearchError(null);

      try {
        const response = await fetchWeather('openMeteoGeo', {
          name: trimmed,
          count: 6,
          language: 'en',
          format: 'json',
          signal: controller.signal,
          allowNetwork,
          strategy,
        });
        if (searchAbortRef.current !== controller) return;
        const data = response?.data ?? response;
        const results = Array.isArray(data?.results) ? data.results : [];
        const seen = new Set<string>();
        const cleaned = results
          .filter(
            (item: any): item is GeoResult =>
              typeof item?.name === 'string' &&
              typeof item?.latitude === 'number' &&
              typeof item?.longitude === 'number',
          )
          .filter((item: GeoResult) => {
            const key = `${item.name}-${item.latitude}-${item.longitude}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 6);
        setSearchResults(cleaned);
        setSearchStatus('idle');
      } catch (error) {
        if (controller.signal.aborted) return;
        setSearchStatus('error');
        if (error instanceof WeatherFetchError) {
          const message =
            error.type === 'network-disabled'
              ? 'Network access is disabled in Settings.'
              : error.type === 'offline'
                ? 'You are offline. Connect to fetch city suggestions.'
                : error.message;
          setSearchError(message);
        } else {
          setSearchError(
            error instanceof Error
              ? error.message
              : 'Unable to find matching cities.',
          );
        }
      }
    },
    [allowNetwork, offline],
  );

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchStatus('idle');
      setSearchError(null);
      lastSearchRef.current = '';
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
      return;
    }
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = window.setTimeout(() => {
      if (lastSearchRef.current === searchQuery.trim()) return;
      lastSearchRef.current = searchQuery.trim();
      runSearch(searchQuery);
    }, 350);
    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, runSearch]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    runSearch(searchQuery, { immediate: true });
  };

  const handleManualAdd = () => {
    const latNum = Number.parseFloat(manualLat);
    const lonNum = Number.parseFloat(manualLon);
    if (!manualName.trim() || Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      return;
    }
    const id = `manual:${latNum}:${lonNum}`;
    addCity({ id, name: manualName.trim(), lat: latNum, lon: lonNum });
    setManualName('');
    setManualLat('');
    setManualLon('');
  };

  const handleUseLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('Geolocation is not supported in this browser.');
      return;
    }
    setLocationStatus('loading');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lon = Number(position.coords.longitude.toFixed(4));
        const nextCity: City = {
          id: 'my-location',
          name: 'My location',
          lat,
          lon,
        };
        setCities((prev) => {
          const idx = prev.findIndex((entry) => entry.id === 'my-location');
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...nextCity };
            return next;
          }
          return [...prev, nextCity];
        });
        fetchCityWeather(nextCity, { force: true });
        setLocationStatus('idle');
      },
      (error) => {
        setLocationStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was denied.');
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out.');
        } else {
          setLocationError('Unable to access your location.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const onDragStart = (event: DragEvent<HTMLButtonElement>, i: number) => {
    dragSrc.current = i;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', 'move');
  };

  const onDragEnd = () => {
    dragSrc.current = null;
  };

  const onDrop = (i: number) => {
    const src = dragSrc.current;
    dragSrc.current = null;
    if (src === null || src === i) return;
    setCities((prev) => {
      const next = [...prev];
      const [moved] = next.splice(src, 1);
      next.splice(i, 0, moved);
      return next;
    });
  };

  const saveGroup = () => {
    if (!groupName.trim()) return;
    const idx = groups.findIndex((g) => g.name === groupName.trim());
    const next = [...groups];
    const data = { name: groupName.trim(), cities };
    if (idx >= 0) next[idx] = data;
    else next.push(data);
    setGroups(next);
    setCurrentGroup(groupName.trim());
  };

  const switchGroup = (name: string) => {
    const group = groups.find((g) => g.name === name);
    if (group) {
      setCities(group.cities);
      setCurrentGroup(name);
      setGroupName(name);
    }
  };

  const selectedCity = selectedId
    ? cities.find((city) => city.id === selectedId) ?? null
    : null;

  useEffect(() => {
    if (selectedId && !selectedCity) {
      setSelectedId(null);
    }
  }, [selectedCity, selectedId]);

  return (
    <div className="flex h-full flex-col bg-[color:var(--kali-panel)] text-[color:var(--kali-text)]">
      <header className="sticky top-0 z-10 space-y-4 border-b border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-lg font-semibold">Weather</div>
            <div className="text-xs uppercase tracking-wider text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
              Kali desktop forecast center
            </div>
          </div>
          <button
            type="button"
            onClick={() => cities.forEach((city) => fetchCityWeather(city, { force: true }))}
            disabled={cities.length === 0 || isRefreshingAny}
            className="rounded bg-kali-control px-3 py-1 text-xs font-semibold uppercase tracking-wide text-black shadow-[0_0_12px_rgba(15,148,210,0.35)] transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRefreshingAny ? 'Refreshing…' : 'Refresh all'}
          </button>
        </div>

        {!allowNetwork && (
          <div className="rounded border border-[color:color-mix(in_srgb,var(--kali-panel-border)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] p-2 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
            Network access is disabled in Settings. Showing cached data when available.
          </div>
        )}
        {allowNetwork && offline && (
          <div className="rounded border border-[color:color-mix(in_srgb,var(--kali-panel-border)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] p-2 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
            You are offline. Showing cached data when available.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <input
            className="rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] px-2 py-1 text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)] focus:outline-none focus:ring-2 focus:ring-kali-control/60"
            placeholder="Group"
            value={groupName}
            aria-label="Group name"
            onChange={(e) => setGroupName(e.target.value)}
          />
          <button
            className="rounded bg-kali-control px-3 py-1 text-sm font-medium text-black shadow-[0_0_12px_rgba(15,148,210,0.35)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] hover:bg-kali-control/90"
            onClick={saveGroup}
          >
            Save Group
          </button>
          {groups.map((g) => (
            <button
              key={g.name}
              className={`rounded px-3 py-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] ${
                currentGroup === g.name
                  ? 'bg-kali-control text-black shadow-[0_0_12px_rgba(15,148,210,0.35)]'
                  : 'bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,transparent)] text-[color:color-mix(in_srgb,var(--kali-text)_85%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)]'
              }`}
              onClick={() => switchGroup(g.name)}
            >
              {g.name}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="flex-1 rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] px-2 py-1 text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)] focus:outline-none focus:ring-2 focus:ring-kali-control/60"
              placeholder="Search city"
              value={searchQuery}
              aria-label="Search city"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="rounded bg-kali-control px-3 py-1 text-sm font-medium text-black shadow-[0_0_12px_rgba(15,148,210,0.35)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] hover:bg-kali-control/90 disabled:opacity-60"
              disabled={!searchQuery.trim()}
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={locationStatus === 'loading'}
              className="rounded border border-[color:var(--kali-panel-border)] px-3 py-1 text-sm font-medium text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)] transition hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/60 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Use my location"
            >
              {locationStatus === 'loading' ? 'Locating…' : 'Use my location'}
            </button>
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="rounded border border-[color:var(--kali-panel-border)] px-3 py-1 text-sm font-medium text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)] transition hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)]"
            >
              {showAdvanced ? 'Hide advanced' : 'Advanced'}
            </button>
          </div>
          {searchStatus === 'loading' && (
            <div className="text-sm text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
              Searching for cities…
            </div>
          )}
          {searchError && (
            <div className="rounded border border-[color:color-mix(in_srgb,var(--kali-panel-border)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,transparent)] p-2 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
              {searchError}
            </div>
          )}
          {locationError && (
            <div className="rounded border border-[color:color-mix(in_srgb,var(--kali-panel-border)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,transparent)] p-2 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
              {locationError}
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {searchResults.map((result) => {
                const label = formatCityLabel(result);
                return (
                  <button
                    key={`${result.latitude}-${result.longitude}`}
                    type="button"
                    onClick={() => {
                      const id = `geo:${result.latitude}:${result.longitude}`;
                      addCity({
                        id,
                        name: label,
                        lat: result.latitude,
                        lon: result.longitude,
                        region: result.admin1,
                        countryCode: result.country_code,
                        timezone: result.timezone,
                      });
                    }}
                    className="flex items-center justify-between rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] px-3 py-2 text-left text-sm text-[color:var(--kali-text)] transition hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/60"
                  >
                    <div>
                      <div className="font-semibold">{label}</div>
                      <div className="text-xs text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
                        {result.latitude.toFixed(2)}, {result.longitude.toFixed(2)}
                      </div>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
                      Add
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {showAdvanced && (
            <div className="rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] p-3">
              <div className="mb-2 text-xs uppercase tracking-wider text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
                Advanced manual entry
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  className="min-w-[180px] flex-1 rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] px-2 py-1 text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)] focus:outline-none focus:ring-2 focus:ring-kali-control/60"
                  placeholder="Name"
                  value={manualName}
                  aria-label="City name"
                  onChange={(e) => setManualName(e.target.value)}
                />
                <input
                  className="w-24 rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] px-2 py-1 text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)] focus:outline-none focus:ring-2 focus:ring-kali-control/60"
                  placeholder="Lat"
                  value={manualLat}
                  aria-label="Latitude"
                  onChange={(e) => setManualLat(e.target.value)}
                />
                <input
                  className="w-24 rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] px-2 py-1 text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)] focus:outline-none focus:ring-2 focus:ring-kali-control/60"
                  placeholder="Lon"
                  value={manualLon}
                  aria-label="Longitude"
                  onChange={(e) => setManualLon(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded bg-kali-control px-3 py-1 text-sm font-medium text-black shadow-[0_0_12px_rgba(15,148,210,0.35)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] hover:bg-kali-control/90"
                  onClick={handleManualAdd}
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </form>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {cities.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-[color:var(--kali-panel-border)] p-8 text-center text-sm text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
            Search for a city above to start building your weather desk.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cities.map((city, i) => (
              <div
                key={city.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(i)}
                className="rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] p-4 transition hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_94%,transparent)] focus-within:bg-[color:color-mix(in_srgb,var(--kali-panel)_94%,transparent)]"
              >
                <CityTile
                  city={city}
                  loading={Boolean(loadingIds[city.id])}
                  statusLabel={
                    !allowNetwork
                      ? 'Network disabled'
                      : offline
                        ? 'Offline'
                        : city.lastReadingStale
                          ? 'Cached'
                          : undefined
                  }
                  canFetch={!loadingIds[city.id]}
                  onOpen={() => setSelectedId(city.id)}
                  onRefresh={() => fetchCityWeather(city, { force: true })}
                  onEdit={() => setEditingCity(city)}
                  onRemove={() =>
                    setCities((prev) => prev.filter((entry) => entry.id !== city.id))
                  }
                  onClearError={() => updateCity(city.id, { lastError: undefined })}
                  onMoveUp={() =>
                    setCities((prev) => {
                      if (i === 0) return prev;
                      const next = [...prev];
                      const [moved] = next.splice(i, 1);
                      next.splice(i - 1, 0, moved);
                      return next;
                    })
                  }
                  onMoveDown={() =>
                    setCities((prev) => {
                      if (i >= prev.length - 1) return prev;
                      const next = [...prev];
                      const [moved] = next.splice(i, 1);
                      next.splice(i + 1, 0, moved);
                      return next;
                    })
                  }
                  onDragStart={(event) => onDragStart(event, i)}
                  onDragEnd={onDragEnd}
                  canMoveUp={i > 0}
                  canMoveDown={i < cities.length - 1}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCity && (
        <CityDetail
          city={selectedCity}
          onClose={() => setSelectedId(null)}
          onUpdateCity={updateCity}
        />
      )}

      {editingCity && (
        <CityEditModal
          city={editingCity}
          onClose={() => setEditingCity(null)}
          onSave={(update) => {
            setCities((prev) =>
              prev.map((city) => {
                if (city.id !== editingCity.id) return city;
                const coordsChanged =
                  city.lat !== update.lat || city.lon !== update.lon;
                const nextId = coordsChanged
                  ? `geo:${update.lat}:${update.lon}`
                  : city.id;
                if (selectedId === city.id) {
                  setSelectedId(nextId);
                }
                return {
                  ...city,
                  id: nextId,
                  name: update.name,
                  lat: update.lat,
                  lon: update.lon,
                  lastReading: coordsChanged ? undefined : city.lastReading,
                  forecast: coordsChanged ? undefined : city.forecast,
                  hourly: coordsChanged ? undefined : city.hourly,
                  lastError: undefined,
                };
              }),
            );
            setEditingCity(null);
          }}
        />
      )}
    </div>
  );
}
