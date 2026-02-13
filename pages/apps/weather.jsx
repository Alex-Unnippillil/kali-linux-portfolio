import { useEffect, useMemo, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

const CONDITION_THEMES = {
  clear: {
    key: 'clear',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #2563eb 50%, #facc15 100%)',
    accent: '#facc15',
    icon: '☀️',
    overlayOpacity: 0.25,
  },
  partlyCloudy: {
    key: 'partlyCloudy',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 40%, #a855f7 100%)',
    accent: '#a855f7',
    icon: '🌤️',
    overlayOpacity: 0.3,
  },
  overcast: {
    key: 'overcast',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #334155 60%, #94a3b8 100%)',
    accent: '#94a3b8',
    icon: '☁️',
    overlayOpacity: 0.45,
  },
  storm: {
    key: 'storm',
    gradient: 'linear-gradient(135deg, #020617 0%, #1d4ed8 45%, #7c3aed 100%)',
    accent: '#60a5fa',
    icon: '⛈️',
    overlayOpacity: 0.35,
  },
  rain: {
    key: 'rain',
    gradient: 'linear-gradient(135deg, #082f49 0%, #0ea5e9 55%, #22d3ee 100%)',
    accent: '#22d3ee',
    icon: '🌧️',
    overlayOpacity: 0.38,
  },
  snow: {
    key: 'snow',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e40af 45%, #e0f2fe 100%)',
    accent: '#e0f2fe',
    icon: '❄️',
    overlayOpacity: 0.28,
  },
  default: {
    key: 'default',
    gradient: 'linear-gradient(135deg, #111827 0%, #1f2937 55%, #4b5563 100%)',
    accent: '#38bdf8',
    icon: '🌡️',
    overlayOpacity: 0.4,
  },
};

const FAKE_FORECASTS = [
  {
    id: 'sf',
    name: 'San Francisco',
    region: 'California, USA',
    summary: 'Marine layer thinning by lunch with a breezy northwest wind.',
    background: 'partlyCloudy',
    current: {
      temperatureC: 17,
      feelsLikeC: 16,
      condition: 'Partly cloudy',
      humidity: 72,
      windKph: 22,
      windDirection: 'NW',
      pressureHpa: 1015,
      visibilityKm: 14,
      dewPointC: 12,
      uvIndex: 5,
      sunrise: '06:34',
      sunset: '19:42',
    },
    hourly: [
      { label: '09:00', temperatureC: 15, conditionKey: 'overcast', precipitationChance: 10 },
      { label: '12:00', temperatureC: 17, conditionKey: 'partlyCloudy', precipitationChance: 5 },
      { label: '15:00', temperatureC: 19, conditionKey: 'clear', precipitationChance: 0 },
      { label: '18:00', temperatureC: 16, conditionKey: 'partlyCloudy', precipitationChance: 10 },
      { label: '21:00', temperatureC: 14, conditionKey: 'overcast', precipitationChance: 20 },
    ],
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    region: 'Kantō, Japan',
    summary: 'Humid air ahead of an evening thunderstorm line.',
    background: 'storm',
    current: {
      temperatureC: 24,
      feelsLikeC: 27,
      condition: 'Humid with building clouds',
      humidity: 84,
      windKph: 18,
      windDirection: 'SE',
      pressureHpa: 1002,
      visibilityKm: 11,
      dewPointC: 21,
      uvIndex: 7,
      sunrise: '05:07',
      sunset: '18:23',
    },
    hourly: [
      { label: '09:00', temperatureC: 22, conditionKey: 'overcast', precipitationChance: 15 },
      { label: '12:00', temperatureC: 25, conditionKey: 'partlyCloudy', precipitationChance: 20 },
      { label: '15:00', temperatureC: 27, conditionKey: 'storm', precipitationChance: 60 },
      { label: '18:00', temperatureC: 23, conditionKey: 'storm', precipitationChance: 75 },
      { label: '21:00', temperatureC: 21, conditionKey: 'rain', precipitationChance: 80 },
    ],
  },
  {
    id: 'reykjavik',
    name: 'Reykjavík',
    region: 'Iceland',
    summary: 'Cold Arctic air delivering pockets of sleet and snow.',
    background: 'snow',
    current: {
      temperatureC: 2,
      feelsLikeC: -2,
      condition: 'Wintry mix',
      humidity: 90,
      windKph: 32,
      windDirection: 'N',
      pressureHpa: 1008,
      visibilityKm: 6,
      dewPointC: 1,
      uvIndex: 1,
      sunrise: '07:21',
      sunset: '18:52',
    },
    hourly: [
      { label: '09:00', temperatureC: 1, conditionKey: 'snow', precipitationChance: 60 },
      { label: '12:00', temperatureC: 2, conditionKey: 'overcast', precipitationChance: 40 },
      { label: '15:00', temperatureC: 3, conditionKey: 'snow', precipitationChance: 70 },
      { label: '18:00', temperatureC: 1, conditionKey: 'snow', precipitationChance: 65 },
      { label: '21:00', temperatureC: -1, conditionKey: 'overcast', precipitationChance: 45 },
    ],
  },
];

const cityIdSet = new Set(FAKE_FORECASTS.map((city) => city.id));

const isValidCityId = (value) => typeof value === 'string' && cityIdSet.has(value);
const isValidUnit = (value) => value === 'metric' || value === 'imperial';

const formatTemperature = (valueC, units) => {
  if (typeof valueC !== 'number') return '—';
  if (units === 'imperial') {
    return `${Math.round((valueC * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(valueC)}°C`;
};

const formatSpeed = (valueKph, units) => {
  if (typeof valueKph !== 'number') return '—';
  if (units === 'imperial') {
    return `${Math.round(valueKph / 1.609)} mph`;
  }
  return `${Math.round(valueKph)} km/h`;
};

const formatDistance = (valueKm, units) => {
  if (typeof valueKm !== 'number') return '—';
  if (units === 'imperial') {
    return `${(valueKm / 1.609).toFixed(1)} mi`;
  }
  return `${valueKm.toFixed(1)} km`;
};

const formatPressure = (valueHpa, units) => {
  if (typeof valueHpa !== 'number') return '—';
  if (units === 'imperial') {
    return `${Math.round(valueHpa * 0.02953)} inHg`;
  }
  return `${Math.round(valueHpa)} hPa`;
};

const formatDewPoint = (valueC, units) => {
  if (typeof valueC !== 'number') return '—';
  if (units === 'imperial') {
    return `${Math.round((valueC * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(valueC)}°C`;
};

function WeatherBackground({ theme, children }) {
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden text-[color:var(--kali-text)]"
      style={{
        background: theme.gradient,
        transition: 'background 700ms ease, filter 700ms ease',
        filter: 'saturate(110%)',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_60%)]"
        style={{ opacity: theme.overlayOpacity }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 top-6 text-8xl text-white/40 drop-shadow-lg sm:-right-6 sm:text-9xl"
      >
        {theme.icon}
      </div>
      <div className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--kali-panel)_45%,transparent)] mix-blend-soft-light" />
      <div className="relative z-10 flex h-full w-full flex-col backdrop-blur-[18px]">
        {children}
      </div>
    </div>
  );
}

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
      role="radiogroup"
      aria-label={label}
    >
      <div className="flex w-full flex-col overflow-hidden rounded-lg border border-[color:color-mix(in_srgb,var(--kali-panel-border)_85%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_78%,transparent)] shadow-[0_8px_24px_rgba(15,23,42,0.3)] sm:inline-flex sm:flex-row">
        {options.map((option, index) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={option.ariaLabel ?? option.label}
              onClick={() => onChange(option.value)}
              className={`relative flex w-full flex-1 flex-col gap-1 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide transition-all sm:min-w-[6.5rem] sm:text-sm ${
                index > 0
                  ? 'border-t border-[color:color-mix(in_srgb,var(--kali-panel-border)_85%,transparent)] sm:border-t-0 sm:border-l'
                  : ''
              } ${
                isActive
                  ? 'bg-kali-control text-black shadow-[0_0_24px_rgba(15,148,210,0.45)]'
                  : 'text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)]'
              }`}
            >
              <span>{option.label}</span>
              {option.description ? (
                <span className="text-[0.65rem] font-normal normal-case text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
                  {option.description}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SkeletonBlock({ className }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-white/20 ${className}`} />;
}

function CurrentConditionsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-12 w-2/3" />
        <SkeletonBlock className="h-3 w-1/2" />
        <SkeletonBlock className="h-16 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`conditions-${index}`} className="space-y-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HourlyForecastSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={`hourly-${index}`}
          className="flex min-w-[5.5rem] flex-col gap-2 rounded-lg border border-[color:color-mix(in_srgb,var(--kali-panel-border)_75%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent)] px-3 py-2"
        >
          <SkeletonBlock className="h-3 w-10" />
          <SkeletonBlock className="h-5 w-12" />
          <SkeletonBlock className="h-8 w-full" />
          <SkeletonBlock className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function WeatherHighlightsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`highlight-${index}`}
          className="space-y-2 rounded-lg border border-[color:color-mix(in_srgb,var(--kali-panel-border)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_84%,transparent)] p-3"
        >
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function WeatherCard({ id, title, subtitle, accent, mounted, isLoading, skeleton, children }) {
  return (
    <section
      aria-labelledby={id}
      aria-busy={isLoading}
      className={`group w-full rounded-xl border border-[color:color-mix(in_srgb,var(--kali-panel-border)_80%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_80%,transparent)] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.35)] transition-all duration-500 ease-out ${
        mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <div className="flex items-center justify-between gap-4 pb-3">
        <div>
          <h2
            id={id}
            className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]"
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div
          aria-hidden="true"
          className="h-2 w-12 rounded-full"
          style={{ background: accent }}
        />
      </div>
      <div className="space-y-3 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_90%,transparent)]">
        {isLoading ? (
          <div data-testid={`${id}-skeleton`} aria-hidden="true">
            {skeleton}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function CurrentConditions({ city, units }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <div className="text-5xl font-semibold leading-tight">
          {formatTemperature(city.current.temperatureC, units)}
        </div>
        <div className="text-sm uppercase tracking-[0.25em] text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
          {city.current.condition}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)]">
          {city.summary}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">Feels Like</dt>
          <dd className="text-base font-medium">
            {formatTemperature(city.current.feelsLikeC, units)}
          </dd>
        </div>
        <div>
          <dt className="text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">Wind</dt>
          <dd className="text-base font-medium">
            {formatSpeed(city.current.windKph, units)} {city.current.windDirection}
          </dd>
        </div>
        <div>
          <dt className="text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">Humidity</dt>
          <dd className="text-base font-medium">{city.current.humidity}%</dd>
        </div>
        <div>
          <dt className="text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">Pressure</dt>
          <dd className="text-base font-medium">
            {formatPressure(city.current.pressureHpa, units)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function HourlyForecast({ city, units }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[color:color-mix(in_srgb,var(--kali-panel-border)_90%,transparent)]">
      {city.hourly.map((hour) => {
        const theme = CONDITION_THEMES[hour.conditionKey] ?? CONDITION_THEMES.default;
        return (
          <div
            key={`${city.id}-${hour.label}`}
            className="min-w-[5.5rem] rounded-lg border border-[color:color-mix(in_srgb,var(--kali-panel-border)_75%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent)] px-3 py-2 text-center shadow-[0_10px_20px_rgba(15,23,42,0.25)]"
          >
            <div className="text-[0.65rem] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
              {hour.label}
            </div>
            <div className="mt-1 text-lg font-semibold">
              {formatTemperature(hour.temperatureC, units)}
            </div>
            <div className="mt-1 text-xl" aria-hidden="true">
              {theme.icon}
            </div>
            <div className="mt-1 text-[0.65rem] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
              {hour.precipitationChance}% chance
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeatherHighlights({ city, units }) {
  const items = [
    {
      label: 'Sunrise',
      value: city.current.sunrise,
      description: 'Local horizon',
    },
    {
      label: 'Sunset',
      value: city.current.sunset,
      description: 'Evening twilight',
    },
    {
      label: 'Visibility',
      value: formatDistance(city.current.visibilityKm, units),
      description: 'Horizontal range',
    },
    {
      label: 'Dew Point',
      value: formatDewPoint(city.current.dewPointC, units),
      description: 'Moisture level',
    },
    {
      label: 'UV Index',
      value: city.current.uvIndex,
      description: 'Moderate risk',
    },
    {
      label: 'Humidity',
      value: `${city.current.humidity}%`,
      description: 'Ambient moisture',
    },
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={`${city.id}-${item.label}`}
          className="rounded-lg border border-[color:color-mix(in_srgb,var(--kali-panel-border)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_84%,transparent)] p-3 shadow-[0_10px_18px_rgba(15,23,42,0.22)]"
        >
          <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
            {item.label}
          </dt>
          <dd className="mt-1 text-lg font-semibold text-[color:color-mix(in_srgb,var(--kali-text)_92%,transparent)]">
            {item.value}
          </dd>
          <p className="text-[0.65rem] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
            {item.description}
          </p>
        </div>
      ))}
    </dl>
  );
}

export default function WeatherAppPage() {
  const [selectedCityId, setSelectedCityId] = usePersistentState(
    'weather:selected-city',
    () => FAKE_FORECASTS[0].id,
    isValidCityId,
  );
  const [unitSystem, setUnitSystem] = usePersistentState(
    'weather:unit-system',
    'metric',
    isValidUnit,
  );
  const [isMounted, setIsMounted] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const selectedCity = useMemo(() => {
    const city = FAKE_FORECASTS.find((item) => item.id === selectedCityId);
    return city ?? FAKE_FORECASTS[0];
  }, [selectedCityId]);

  useEffect(() => {
    if (!isValidCityId(selectedCityId)) {
      setSelectedCityId(FAKE_FORECASTS[0].id);
    }
  }, [selectedCityId, setSelectedCityId]);

  const activeTheme = useMemo(() => {
    const themeKey = selectedCity?.background ?? 'default';
    return CONDITION_THEMES[themeKey] ?? CONDITION_THEMES.default;
  }, [selectedCity]);

  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => setIsLoading(false), 350);
    return () => {
      clearTimeout(timeout);
    };
  }, [selectedCityId, unitSystem]);

  return (
    <WeatherBackground theme={activeTheme}>
      <div className="flex h-full flex-col gap-6 overflow-hidden p-4 sm:p-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.4em] text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
              Weather dashboard
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-white drop-shadow-md sm:text-4xl">
              {selectedCity.name}
            </h1>
            <p className="text-sm text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)]">
              {selectedCity.region}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              label="Toggle temperature unit"
              value={unitSystem}
              onChange={setUnitSystem}
              options={[
                { value: 'metric', label: 'Metric', description: '°C, km/h' },
                { value: 'imperial', label: 'Imperial', description: '°F, mph' },
              ]}
            />
          </div>
        </header>

        <SegmentedControl
          label="Choose a forecast city"
          value={selectedCity.id}
          onChange={setSelectedCityId}
          options={FAKE_FORECASTS.map((city) => ({
            value: city.id,
            label: city.name,
            description: city.summary,
            ariaLabel: `${city.name} forecast`,
          }))}
        />

        <main className="flex-1 overflow-y-auto rounded-2xl border border-[color:color-mix(in_srgb,var(--kali-panel-border)_82%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_65%,transparent)]/70 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.4)] backdrop-blur-xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[color:color-mix(in_srgb,var(--kali-panel-border)_88%,transparent)] sm:p-6">
          <div className="grid gap-6 lg:grid-cols-2" data-testid="weather-cards">
            <WeatherCard
              id="current-conditions"
              title="Current Conditions"
              subtitle={selectedCity.summary}
              accent={activeTheme.accent}
              mounted={isMounted}
              isLoading={isLoading}
              skeleton={<CurrentConditionsSkeleton />}
            >
              <CurrentConditions city={selectedCity} units={unitSystem} />
            </WeatherCard>

            <WeatherCard
              id="hourly-forecast"
              title="Hourly Forecast"
              subtitle="Next 12 hours outlook"
              accent={activeTheme.accent}
              mounted={isMounted}
              isLoading={isLoading}
              skeleton={<HourlyForecastSkeleton />}
            >
              <HourlyForecast city={selectedCity} units={unitSystem} />
            </WeatherCard>

            <WeatherCard
              id="weather-highlights"
              title="Atmospheric Highlights"
              subtitle="Key metrics at a glance"
              accent={activeTheme.accent}
              mounted={isMounted}
              isLoading={isLoading}
              skeleton={<WeatherHighlightsSkeleton />}
            >
              <WeatherHighlights city={selectedCity} units={unitSystem} />
            </WeatherCard>

            {isOffline ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-3 rounded-lg border border-dashed border-[color:color-mix(in_srgb,var(--kali-panel-border)_85%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent)] px-4 py-3 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_85%,transparent)] shadow-[0_12px_24px_rgba(15,23,42,0.3)]"
              >
                <span aria-hidden="true" className="text-lg">
                  📴
                </span>
                Offline mode – using cached forecast visuals.
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </WeatherBackground>
  );
}

