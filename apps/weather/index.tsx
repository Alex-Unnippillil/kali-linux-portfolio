'use client';

import { useEffect, useRef, useState } from 'react';
import useWeatherState, { City } from './state';

interface ReadingUpdate {
  temp: number;
  condition: number;
  time: number;
}

function CityTile({ city }: { city: City }) {
  return (
    <div>
      <div className="font-bold mb-2">{city.name}</div>
      {city.lastReading ? (
        <div>
          {Math.round(city.lastReading.temp)}°C
        </div>
      ) : (
        <div className="opacity-70">No data</div>
      )}
    </div>
  );
}

export default function WeatherApp() {
  const [cities, setCities] = useWeatherState();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const dragSrc = useRef<number | null>(null);

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
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`,
      )
        .then((res) => res.json())
        .then((data) => {
          const reading: ReadingUpdate = {
            temp: data.current_weather.temperature,
            condition: data.current_weather.weathercode,
            time: Date.now(),
          };
          setCities((prev) => {
            const next = [...prev];
            if (!next[i]) return prev;
            next[i] = { ...next[i], lastReading: reading };
            return next;
          });
        })
        .catch(() => {
          // ignore fetch errors
        });
    });
  }, [offline, cities.length, setCities]);

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

  return (
    <div className="p-4 text-white">
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
            className="bg-white/10 p-4 rounded"
          >
            <CityTile city={city} />
          </div>
        ))}
      </div>
      {offline && (
        <div className="mt-4 text-sm">Offline - showing cached data</div>
      )}
    </div>
  );
}

