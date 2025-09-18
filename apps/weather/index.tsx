'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useWeatherState, {
  City,
  useWeatherGroups,
  useCurrentGroup,
  useWeatherProviderSetting,
} from './state';
import Forecast from './components/Forecast';
import CityDetail from './components/CityDetail';
import { getProvider, providerOptions } from './providers';
import type { WeatherResponse } from './providers/types';

const WEATHER_CACHE = 'weather';

const cacheKeyForCity = (providerId: string, city: City) =>
  `${providerId}:${city.lat}:${city.lon}`;

const createCacheResponse = (data: WeatherResponse): Response => {
  if (typeof Response !== 'undefined') {
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const serialized = JSON.stringify(data);
  return {
    async json() {
      return JSON.parse(serialized) as WeatherResponse;
    },
    clone() {
      return createCacheResponse(JSON.parse(serialized) as WeatherResponse);
    },
  } as unknown as Response;
};

const readCachedWeather = async (key: string): Promise<WeatherResponse | null> => {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(WEATHER_CACHE);
    const cached = await cache.match(key);
    if (!cached) return null;
    return (await cached.json()) as WeatherResponse;
  } catch {
    return null;
  }
};

const writeCachedWeather = async (key: string, data: WeatherResponse) => {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(WEATHER_CACHE);
    await cache.put(key, createCacheResponse(data));
  } catch {
    // Ignore cache errors so the UI can still update
  }
};

const readingsEqual = (a?: WeatherResponse['reading'], b?: WeatherResponse['reading']) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.temp === b.temp && a.condition === b.condition && a.time === b.time;
};

const forecastsEqual = (a?: WeatherResponse['forecast'], b?: WeatherResponse['forecast']) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every(
    (day, idx) =>
      day.date === b[idx].date &&
      day.temp === b[idx].temp &&
      day.condition === b[idx].condition,
  );
};

function CityTile({ city }: { city: City }) {
  return (
    <div>
      <div className="font-bold mb-1.5">{city.name}</div>
      {city.lastReading ? (
        <div className="mb-1.5">{Math.round(city.lastReading.temp)}°C</div>
      ) : (
        <div className="opacity-70 mb-1.5">No data</div>
      )}
      {city.forecast && <Forecast days={city.forecast.slice(0, 5)} />}
    </div>
  );
}

export default function WeatherApp() {
  const [cities, setCities] = useWeatherState();
  const [groups, setGroups] = useWeatherGroups();
  const [currentGroup, setCurrentGroup] = useCurrentGroup();
  const [providerId, setProviderId] = useWeatherProviderSetting();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [groupName, setGroupName] = useState('');
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [selected, setSelected] = useState<City | null>(null);
  const dragSrc = useRef<number | null>(null);
  const provider = useMemo(() => getProvider(providerId), [providerId]);

  useEffect(() => {
    if (!currentGroup) return;
    const group = groups.find((g) => g.name === currentGroup);
    if (group) setCities(group.cities);
  }, [currentGroup, groups, setCities]);

  useEffect(() => {
    if (provider.id !== providerId) {
      setProviderId(provider.id);
    }
  }, [provider, providerId, setProviderId]);

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

  const updateCityWeather = useCallback(
    (cityId: string, data: WeatherResponse) => {
      setCities((prev) => {
        const idx = prev.findIndex((c) => c.id === cityId);
        if (idx < 0) return prev;
        const city = prev[idx];
        if (readingsEqual(city.lastReading, data.reading) && forecastsEqual(city.forecast, data.forecast)) {
          return prev;
        }
        const next = [...prev];
        next[idx] = {
          ...city,
          lastReading: data.reading,
          forecast: data.forecast,
        };
        return next;
      });
    },
    [setCities],
  );

  useEffect(() => {
    let cancelled = false;

    const loadCity = async (city: City) => {
      const key = cacheKeyForCity(provider.id, city);
      const cached = await readCachedWeather(key);
      if (!cancelled && cached) {
        updateCityWeather(city.id, cached);
      }
      if (offline) return;
      try {
        const fresh = await provider.fetch(city);
        if (!cancelled) {
          updateCityWeather(city.id, fresh);
        }
        void writeCachedWeather(key, fresh);
      } catch {
        // Ignore fetch errors so the UI stays responsive
      }
    };

    cities.forEach((city) => {
      void loadCity(city);
    });

    return () => {
      cancelled = true;
    };
  }, [cities, offline, provider, updateCityWeather]);

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
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label htmlFor="weather-provider-select" className="flex items-center gap-2">
          <span>Provider</span>
          <select
            id="weather-provider-select"
            className="text-black px-1"
            value={provider.id}
            onChange={(e) => setProviderId(e.target.value)}
          >
            {providerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2 mb-4">
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
      <div className="flex gap-2 mb-4">
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
      <div className="grid grid-cols-2 gap-4">
        {cities.map((city, i) => (
          <div
            key={city.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
            onClick={() => setSelected(city)}
            className="bg-white/10 p-4 rounded cursor-pointer"
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
