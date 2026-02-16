'use client';

import { MouseEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../../hooks/useSettings';
import { fetchWeather, WeatherFetchError } from '../../../components/apps/weather';
import type { City, HourlySnapshot } from '../state';

interface Props {
  city: City;
  onClose: () => void;
  onUpdateCity: (id: string, update: Partial<City>) => void;
}

type WeatherResponse = {
  data: any;
  meta?: { stale?: boolean; timestamp?: number };
  revalidate?: Promise<{ data: any; meta?: { stale?: boolean; timestamp?: number } } | null>;
};

const CHART_HEIGHT = 90;
const CHART_WIDTH = 260;
const CHART_PADDING = 8;

export default function CityDetail({ city, onClose, onUpdateCity }: Props) {
  const { allowNetwork } = useSettings();
  const titleId = useId();
  const descriptionId = useId();
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [hourly, setHourly] = useState<HourlySnapshot | null>(
    city.hourly ?? null,
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [chart, setChart] = useState<{
    points: string;
    min: number | null;
    max: number | null;
  }>({ points: '', min: null, max: null });
  const abortRef = useRef<AbortController | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const offline =
    typeof navigator !== 'undefined' ? !navigator.onLine : false;
  const isDemoOfflineState = city.isDemo && (!allowNetwork || offline);

  const temps = useMemo(() => {
    if (!hourly) return [];
    return unit === 'C'
      ? hourly.temps
      : hourly.temps.map((t) => t * 1.8 + 32);
  }, [hourly, unit]);

  const precipitationChance = useMemo(() => {
    if (!hourly?.precipProbability?.length) return null;
    const numeric = hourly.precipProbability.filter((p) => Number.isFinite(p));
    if (numeric.length === 0) return null;
    return Math.round(Math.max(...numeric));
  }, [hourly]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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

  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    const worker = new Worker(
      new URL('../../../components/apps/weather.worker.js', import.meta.url),
    );
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    const requestId = `${city.id}-${requestRef.current++}`;
    workerRef.current.onmessage = (event: MessageEvent) => {
      if (!event.data || event.data.id !== requestId) return;
      setChart({
        points: event.data.points ?? '',
        min: event.data.min ?? null,
        max: event.data.max ?? null,
      });
    };
    workerRef.current.postMessage({
      id: requestId,
      temps,
      width: CHART_WIDTH,
      height: CHART_HEIGHT,
      padding: CHART_PADDING,
    });
  }, [city.id, temps]);

  useEffect(() => {
    setHourly(city.hourly ?? null);
  }, [city.hourly, city.id]);

  useEffect(() => {
    if (isDemoOfflineState) {
      setStatus('idle');
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    setError(null);

    const strategy = allowNetwork
      ? offline
        ? 'cache-first'
        : 'cache-first'
      : 'cache-only';

    fetchWeather('openMeteo', {
      lat: city.lat,
      lon: city.lon,
      timezone: city.timezone ?? 'auto',
      hourly: 'temperature_2m,precipitation_probability',
      forecast_days: 1,
      strategy,
      allowNetwork,
      signal: controller.signal,
      revalidate: allowNetwork && !offline,
    })
      .then((response: WeatherResponse) => {
        if (abortRef.current !== controller) return;
        const data = response?.data ?? response;
        const temps = Array.isArray(data?.hourly?.temperature_2m)
          ? data.hourly.temperature_2m.filter(
              (t: unknown): t is number =>
                typeof t === 'number' && Number.isFinite(t),
            )
          : [];
        const times = Array.isArray(data?.hourly?.time)
          ? data.hourly.time.filter(
              (t: unknown): t is string => typeof t === 'string',
            )
          : [];
        const precipProbability = Array.isArray(
          data?.hourly?.precipitation_probability,
        )
          ? data.hourly.precipitation_probability.filter(
              (p: unknown): p is number =>
                typeof p === 'number' && Number.isFinite(p),
            )
          : [];

        const snapshot: HourlySnapshot = {
          temps,
          times,
          precipProbability,
          updatedAt: response?.meta?.timestamp ?? Date.now(),
        };

        setHourly(snapshot);
        onUpdateCity(city.id, {
          hourly: snapshot,
          hourlyStale: Boolean(response?.meta?.stale),
        });
        setStatus('idle');

        if (response?.revalidate) {
          response.revalidate.then((next: WeatherResponse | null) => {
            if (!next || abortRef.current !== controller) return;
            const nextData = next.data;
            const nextTemps = Array.isArray(nextData?.hourly?.temperature_2m)
              ? nextData.hourly.temperature_2m.filter(
                  (t: unknown): t is number =>
                    typeof t === 'number' && Number.isFinite(t),
                )
              : [];
            const nextTimes = Array.isArray(nextData?.hourly?.time)
              ? nextData.hourly.time.filter(
                  (t: unknown): t is string => typeof t === 'string',
                )
              : [];
            const nextPrecip = Array.isArray(
              nextData?.hourly?.precipitation_probability,
            )
              ? nextData.hourly.precipitation_probability.filter(
                  (p: unknown): p is number =>
                    typeof p === 'number' && Number.isFinite(p),
                )
              : [];
            const refreshed: HourlySnapshot = {
              temps: nextTemps,
              times: nextTimes,
              precipProbability: nextPrecip,
              updatedAt: next.meta?.timestamp ?? Date.now(),
            };
            setHourly(refreshed);
            onUpdateCity(city.id, {
              hourly: refreshed,
              hourlyStale: Boolean(next.meta?.stale),
            });
          });
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setStatus('error');
        if (err instanceof WeatherFetchError) {
          if (err.type === 'network-disabled') {
            setError('Network access is disabled in Settings.');
          } else if (err.type === 'offline') {
            setError('You are offline.');
          } else {
            setError(err.message);
          }
        } else {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to fetch hourly forecast.',
          );
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    allowNetwork,
    city.id,
    city.lat,
    city.lon,
    city.timezone,
    isDemoOfflineState,
    offline,
    onUpdateCity,
  ]);

  const onOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      onClose();
    }
  };

  const timeLabels = useMemo(() => {
    if (!hourly?.times?.length) return [];
    return hourly.times.slice(0, 24).map((time) => {
      const date = new Date(time);
      if (Number.isNaN(date.getTime())) return time;
      return date.toLocaleTimeString([], { hour: '2-digit' });
    });
  }, [hourly]);

  const updatedAtLabel = hourly?.updatedAt
    ? new Date(hourly.updatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const updatedAtText = updatedAtLabel
    ? `${city.hourlyStale ? 'Cached' : 'Updated'} ${updatedAtLabel}`
    : null;

  const hasTemps = temps.length > 0;
  const isOfflineState = !allowNetwork || offline;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        ref={dialogRef}
        className="w-full max-w-lg rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] p-4 text-[color:var(--kali-text)] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              id={titleId}
              className="text-lg font-semibold text-[color:var(--kali-text)]"
            >
              {city.name}
            </div>
            <div
              id={descriptionId}
              className="text-xs uppercase tracking-wider text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]"
            >
              Hourly forecast
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded bg-[color:color-mix(in_srgb,var(--kali-panel)_80%,transparent)] px-2 py-1 text-xs uppercase tracking-wider text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)] transition hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70"
          >
            Close
          </button>
        </div>

        {isOfflineState && (
          <div className="mt-3 rounded border border-[color:color-mix(in_srgb,var(--kali-panel-border)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,transparent)] p-2 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
            {allowNetwork
              ? 'You are offline. Showing cached hourly data when available.'
              : 'Network access is disabled in Settings. Showing cached hourly data when available.'}
          </div>
        )}

        <div className="mt-4 flex gap-2 text-xs">
          <button
            className={`rounded px-2 py-1 font-semibold uppercase tracking-wide ${
              unit === 'C'
                ? 'bg-kali-control text-black'
                : 'bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,transparent)] text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]'
            }`}
            onClick={() => setUnit('C')}
          >
            °C
          </button>
          <button
            className={`rounded px-2 py-1 font-semibold uppercase tracking-wide ${
              unit === 'F'
                ? 'bg-kali-control text-black'
                : 'bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,transparent)] text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]'
            }`}
            onClick={() => setUnit('F')}
          >
            °F
          </button>
          {updatedAtText && (
            <div className="ml-auto text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
              {updatedAtText}
            </div>
          )}
        </div>

        <div className="mt-4 rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] p-3">
          {hasTemps ? (
            <div className="relative">
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="h-32 w-full"
              >
                <polyline
                  points={chart.points}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              {chart.min !== null && chart.max !== null && (
                <div className="mt-2 flex justify-between text-xs text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
                  <span>Low {Math.round(chart.min)}°</span>
                  <span>High {Math.round(chart.max)}°</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center text-sm text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
              Hourly data is unavailable.
            </div>
          )}
        </div>

        {timeLabels.length > 0 && (
          <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)]">
            {timeLabels
              .filter((_, idx) => idx % 6 === 0)
              .slice(0, 4)
              .map((label) => (
                <span key={label}>{label}</span>
              ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
          {precipitationChance !== null && (
            <div>Precipitation chance: {precipitationChance}%</div>
          )}
          {status === 'loading' && (
            <div className="text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
              Fetching hourly data…
            </div>
          )}
          {status === 'error' && (
            <div className="text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
              {error ?? 'Unable to load hourly forecast.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
