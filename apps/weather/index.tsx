'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useWeatherState, {
  City,
  useWeatherGroups,
  useCurrentGroup,
  useWeatherUnit,
} from './state';
import Forecast from './components/Forecast';
import CityDetail from './components/CityDetail';
import WeatherIcon from './components/WeatherIcon';
import { buildDemoWeather, DemoWeatherSnapshot } from './demoData';
import { TemperatureUnit, formatTemperature } from './units';

interface CityWeatherEntry {
  city: City;
  weather: DemoWeatherSnapshot;
}

function CityTile({ entry, unit }: { entry: CityWeatherEntry; unit: TemperatureUnit }) {
  const { city, weather } = entry;
  return (
    <div>
      <div className="font-bold mb-1.5">{city.name}</div>
      <div className="flex items-center gap-3 mb-1.5">
        <WeatherIcon code={weather.reading.condition} className="w-12 h-12" />
        <div className="text-2xl font-semibold">
          {formatTemperature(weather.reading.temp, unit)}
        </div>
      </div>
      <Forecast days={weather.forecast.slice(0, 5)} unit={unit} />
    </div>
  );
}

export default function WeatherApp() {
  const [cities, setCities] = useWeatherState();
  const [groups, setGroups] = useWeatherGroups();
  const [currentGroup, setCurrentGroup] = useCurrentGroup();
  const [unit, setUnit] = useWeatherUnit();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [groupName, setGroupName] = useState('');
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragSrc = useRef<number | null>(null);

  useEffect(() => {
    if (!currentGroup) return;
    const group = groups.find((g) => g.name === currentGroup);
    if (group) setCities(group.cities);
  }, [currentGroup, groups, setCities]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const cityWeather = useMemo<CityWeatherEntry[]>(
    () => cities.map((city) => ({ city, weather: buildDemoWeather(city) })),
    [cities],
  );

  const selectedEntry = selectedId
    ? cityWeather.find((entry) => entry.city.id === selectedId) || null
    : null;

  useEffect(() => {
    if (selectedId && !selectedEntry) {
      setSelectedId(null);
    }
  }, [selectedId, selectedEntry]);

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
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input
          className="text-black px-1"
          placeholder="Group"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          aria-label="Group name"
        />
        <button className="bg-blue-600 px-2 rounded" onClick={saveGroup} type="button">
          Save Group
        </button>
        {groups.map((g) => (
          <button
            key={g.name}
            className={`px-2 rounded ${
              currentGroup === g.name ? 'bg-blue-800' : 'bg-white/20'
            }`}
            onClick={() => switchGroup(g.name)}
            type="button"
          >
            {g.name}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-white/70">Units</span>
          <button
            className={`px-1.5 rounded ${
              unit === 'metric' ? 'bg-blue-600' : 'bg-white/20'
            }`}
            onClick={() => setUnit('metric')}
            type="button"
          >
            °C
          </button>
          <button
            className={`px-1.5 rounded ${
              unit === 'imperial' ? 'bg-blue-600' : 'bg-white/20'
            }`}
            onClick={() => setUnit('imperial')}
            type="button"
          >
            °F
          </button>
        </div>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          className="text-black px-1"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="City name"
        />
        <input
          className="text-black px-1 w-20"
          placeholder="Lat"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          aria-label="Latitude"
        />
        <input
          className="text-black px-1 w-20"
          placeholder="Lon"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          aria-label="Longitude"
        />
        <button className="bg-blue-600 px-2 rounded" onClick={addCity} type="button">
          Add
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cityWeather.map((entry, i) => (
          <div
            key={entry.city.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
            onClick={() => setSelectedId(entry.city.id)}
            className="bg-white/10 p-4 rounded cursor-pointer focus:outline focus:outline-blue-500"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelectedId(entry.city.id);
              }
            }}
          >
            <CityTile entry={entry} unit={unit} />
          </div>
        ))}
      </div>
      {offline && (
        <div className="mt-4 text-sm">Offline – showing demo data</div>
      )}
      {selectedEntry && (
        <CityDetail
          city={selectedEntry.city}
          weather={selectedEntry.weather}
          unit={unit}
          onUnitChange={setUnit}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
