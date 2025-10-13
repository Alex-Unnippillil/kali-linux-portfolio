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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-sm uppercase tracking-wide text-white/70">
            Current
          </div>
          <div className="mt-1 text-xl font-semibold">{city.name}</div>
          <div
            className={`mt-2 text-4xl font-bold ${
              hasReading ? 'text-white' : 'text-white/60'
            }`}
          >
            {tempLabel}
          </div>
        </div>
        <WeatherIcon
          code={reading?.condition ?? 3}
          className="w-16 h-16 sm:w-20 sm:h-20 text-white/80"
        />
      </div>
      <div>
        <div className="mb-2 text-xs uppercase tracking-wider text-white/60">
          Next 5 days
        </div>
        {city.forecast ? (
          <Forecast days={city.forecast.slice(0, 5)} />
        ) : (
          <div className="text-sm text-white/60">Forecast unavailable</div>
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
        .then((res) => res.json())
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
            next[i] = { ...next[i], lastReading: reading, forecast };
            return next;
          });
        })
        .catch(() => {
          // ignore fetch errors
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
    <div className="space-y-6 p-4 text-white">
      <div className="flex flex-wrap gap-2">
        <input
          className="text-black px-2 py-1 rounded"
          placeholder="Group"
          value={groupName}
          aria-label="Group name"
          onChange={(e) => setGroupName(e.target.value)}
        />
        <button
          className="rounded bg-kali-primary px-3 py-1 text-sm font-semibold text-kali-secondary shadow-[0_6px_16px_rgba(15,148,210,0.25)] transition hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          onClick={saveGroup}
        >
          Save Group
        </button>
        {groups.map((g) => (
          <button
            key={g.name}
            className={`rounded border px-3 py-1 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
              currentGroup === g.name
                ? 'border-kali-primary/60 bg-kali-primary text-kali-secondary shadow-[0_6px_18px_rgba(15,148,210,0.35)]'
                : 'border-kali-primary/30 bg-kali-surface/80 text-white/80 hover:bg-kali-surface/95'
            }`}
            onClick={() => switchGroup(g.name)}
          >
            {g.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className="text-black px-2 py-1 rounded"
          placeholder="Name"
          value={name}
          aria-label="City name"
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="text-black px-2 py-1 rounded w-24"
          placeholder="Lat"
          value={lat}
          aria-label="Latitude"
          onChange={(e) => setLat(e.target.value)}
        />
        <input
          className="text-black px-2 py-1 rounded w-24"
          placeholder="Lon"
          value={lon}
          aria-label="Longitude"
          onChange={(e) => setLon(e.target.value)}
        />
        <button
          className="rounded bg-kali-primary px-3 py-1 text-sm font-semibold text-kali-secondary shadow-[0_6px_16px_rgba(15,148,210,0.25)] transition hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
            className="cursor-pointer rounded border border-kali-primary/25 bg-kali-surface/80 p-4 shadow-sm transition hover:bg-kali-surface/95 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-kali-focus"
          >
            <CityTile city={city} />
          </div>
        ))}
      </div>
      {offline && (
        <div className="mt-4 text-sm">Offline - showing cached data</div>
      )}
      {selected && (
        <CityDetail city={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

