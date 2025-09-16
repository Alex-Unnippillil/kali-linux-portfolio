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

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-white/10${className ? ` ${className}` : ''}`}
      aria-hidden
    />
  );
}

function ForecastSkeleton() {
  return (
    <div className="flex gap-1.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="flex h-16 w-12 flex-col items-center justify-end gap-1 rounded bg-white/5 p-1.5"
        >
          <div className="h-6 w-6 rounded-full bg-white/10" />
          <div className="h-2.5 w-8 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}

interface ReadingUpdate {
  temp: number;
  condition: number;
  time: number;
}

function CityTile({ city, loading }: { city: City; loading: boolean }) {
  const temp = city.lastReading?.temp;
  const hasForecast = !!city.forecast && city.forecast.length > 0;

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <div className="text-lg font-semibold">{city.name}</div>
        {loading ? (
          <SkeletonBlock className="mt-2 h-7 w-16" />
        ) : typeof temp === 'number' ? (
          <div className="mt-2 text-4xl font-semibold">{Math.round(temp)}°C</div>
        ) : (
          <div className="mt-2 text-sm opacity-70">No data</div>
        )}
      </div>
      <div className="mt-auto">
        {loading ? (
          <ForecastSkeleton />
        ) : hasForecast ? (
          <Forecast days={city.forecast.slice(0, 5)} />
        ) : (
          <div className="text-sm opacity-70">Forecast unavailable</div>
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
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
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
    if (offline || cities.length === 0) {
      setLoadingIds((prev) =>
        Object.keys(prev).length ? {} : prev,
      );
      return;
    }

    let cancelled = false;
    const pending = cities.filter((city) => !city.lastReading || !city.forecast);

    if (pending.length === 0) {
      return;
    }

    setLoadingIds((prev) => {
      const next = { ...prev };
      pending.forEach((city) => {
        next[city.id] = true;
      });
      return next;
    });

    pending.forEach((city) => {
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
            const idx = next.findIndex((entry) => entry.id === city.id);
            if (idx === -1) return prev;
            next[idx] = { ...next[idx], lastReading: reading, forecast };
            return next;
          });
        })
        .catch(() => {
          // ignore fetch errors
        })
        .finally(() => {
          if (cancelled) return;
          setLoadingIds((prev) => {
            const next = { ...prev };
            next[city.id] = false;
            return next;
          });
        });
    });

    return () => {
      cancelled = true;
    };
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
    <div className="p-4 text-white">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="text-black px-1"
          placeholder="Group"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <button className="bg-blue-600 px-2 rounded" onClick={saveGroup}>
          Save Group
        </button>
        {groups.map((g) => (
          <button
            key={g.name}
            className={`px-2 rounded ${
              currentGroup === g.name ? 'bg-blue-800' : 'bg-white/20'
            }`}
            onClick={() => switchGroup(g.name)}
          >
            {g.name}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="text-black px-1"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="text-black px-1 w-20"
          placeholder="Lat"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
        />
        <input
          className="text-black px-1 w-20"
          placeholder="Lon"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
        />
        <button className="bg-blue-600 px-2 rounded" onClick={addCity}>
          Add
        </button>
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {cities.map((city, i) => {
          const loading = Boolean(loadingIds[city.id]);
          return (
            <div
              key={city.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              onClick={() => setSelected(city)}
              className="group flex min-h-[200px] cursor-pointer flex-col rounded-lg border border-white/5 bg-white/10 p-4 shadow-sm transition hover:bg-white/20"
              aria-busy={loading}
            >
              <CityTile city={city} loading={loading} />
            </div>
          );
        })}
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

