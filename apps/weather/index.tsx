'use client';

import { useEffect, useRef, useState } from 'react';
import useWeatherState, {
  City,
  ForecastDay,
  useWeatherGroups,
  useCurrentGroup,
} from './state';
import Forecast from './components/Forecast';
import CityDetail from './components/CityDetail';
import WeatherIcon from './components/WeatherIcon';

interface ReadingUpdate {
  temp: number;
  condition: number;
  time: number;
}

function CityTile({ city }: { city: City }) {
  const reading = city.lastReading;
  const hasReading = Boolean(reading);
  const tempLabel = hasReading
    ? `${Math.round(reading!.temp)}°C`
    : 'No data';
  const errorMessage = city.weatherError;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-sm uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
            Current
          </div>
          <div className="mt-1 text-xl font-semibold">{city.name}</div>
          <div
            className={`mt-2 text-4xl font-bold ${
              hasReading
                ? 'text-[color:var(--kali-text)]'
                : 'text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]'
            }`}
          >
            {tempLabel}
          </div>
          {errorMessage && (
            <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-200/80">
              {errorMessage}
            </div>
          )}
        </div>
        <WeatherIcon
          code={reading?.condition ?? 3}
          className="h-16 w-16 text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)] sm:h-20 sm:w-20"
        />
      </div>
      <div>
        <div className="mb-2 text-xs uppercase tracking-wider text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
          Next 5 days
        </div>
        {city.forecast ? (
          <Forecast days={city.forecast.slice(0, 5)} />
        ) : (
          <div className="text-sm text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
            Forecast unavailable
          </div>
        )}
      </div>
    </div>
  );
}

export default function WeatherApp() {
  const [cities, setCities] = useWeatherState();
  const [groups, setGroups] = useWeatherGroups();
  const [currentGroup, setCurrentGroup] = useCurrentGroup();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [groupName, setGroupName] = useState('');
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [selected, setSelected] = useState<City | null>(null);
  const dragSrc = useRef<number | null>(null);

  useEffect(() => {
    if (!currentGroup) return;
    const group = groups.find((g) => g.name === currentGroup);
    if (group) setCities(group.cities);
  }, [currentGroup, groups, setCities]);

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
    if (offline) return;
    cities.forEach((city, i) => {
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true&daily=weathercode,temperature_2m_max&forecast_days=5&timezone=auto`,
      )
        .then((res) => {
          if (!res.ok) {
            throw new Error('Weather data unavailable');
          }
          return res.json();
        })
        .then((data) => {
          const reading: ReadingUpdate = {
            temp: data.current_weather.temperature,
            condition: data.current_weather.weathercode,
            time: Date.now(),
          };
          const forecast: ForecastDay[] = data.daily.time.map(
            (date: string, idx: number) => ({
              date,
              temp: data.daily.temperature_2m_max[idx],
              condition: data.daily.weathercode[idx],
            }),
          );
          setCities((prev) => {
            const next = [...prev];
            if (!next[i]) return prev;
            next[i] = {
              ...next[i],
              lastReading: reading,
              forecast,
              weatherError: undefined,
            };
            return next;
          });
        })
        .catch((error) => {
          setCities((prev) => {
            const next = [...prev];
            if (!next[i]) return prev;
            next[i] = {
              ...next[i],
              weatherError:
                error instanceof Error && error.message
                  ? error.message
                  : 'Weather data unavailable',
            };
            return next;
          });
        });
    });
  }, [offline, cities, setCities]);

  const addCity = () => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!name || Number.isNaN(latNum) || Number.isNaN(lonNum)) return;
    setCities([
      ...cities,
      { id: `${name}-${lat}-${lon}`, name, lat: latNum, lon: lonNum },
    ]);
    setName('');
    setLat('');
    setLon('');
  };

  const onDragStart = (i: number) => {
    dragSrc.current = i;
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
    if (!groupName) return;
    const idx = groups.findIndex((g) => g.name === groupName);
    const next = [...groups];
    const data = { name: groupName, cities };
    if (idx >= 0) next[idx] = data;
    else next.push(data);
    setGroups(next);
    setCurrentGroup(groupName);
  };

  const switchGroup = (name: string) => {
    const group = groups.find((g) => g.name === name);
    if (group) {
      setCities(group.cities);
      setCurrentGroup(name);
    }
  };

  return (
    <div className="space-y-6 bg-[color:var(--kali-panel)] p-4 text-[color:var(--kali-text)]">
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
      <div className="flex flex-wrap gap-2">
        <input
          className="rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] px-2 py-1 text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)] focus:outline-none focus:ring-2 focus:ring-kali-control/60"
          placeholder="Name"
          value={name}
          aria-label="City name"
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-24 rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] px-2 py-1 text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)] focus:outline-none focus:ring-2 focus:ring-kali-control/60"
          placeholder="Lat"
          value={lat}
          aria-label="Latitude"
          onChange={(e) => setLat(e.target.value)}
        />
        <input
          className="w-24 rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] px-2 py-1 text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)] focus:outline-none focus:ring-2 focus:ring-kali-control/60"
          placeholder="Lon"
          value={lon}
          aria-label="Longitude"
          onChange={(e) => setLon(e.target.value)}
        />
        <button
          className="rounded bg-kali-control px-3 py-1 text-sm font-medium text-black shadow-[0_0_12px_rgba(15,148,210,0.35)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] hover:bg-kali-control/90"
          onClick={addCity}
        >
          Add
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cities.map((city, i) => (
          <div
            key={city.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
            onClick={() => setSelected(city)}
            className="cursor-pointer rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] p-4 transition hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_94%,transparent)] focus-within:bg-[color:color-mix(in_srgb,var(--kali-panel)_94%,transparent)]"
          >
            <CityTile city={city} />
          </div>
        ))}
      </div>
      {offline && (
        <div className="mt-4 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
          Offline - showing cached data
        </div>
      )}
      {selected && (
        <CityDetail city={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
