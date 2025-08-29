'use client';

import { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import useWeatherState, { City, ForecastDay } from './state';
import Forecast from './components/Forecast';
import CityDetail from './components/CityDetail';

interface ReadingUpdate {
  temp: number;
  condition: number;
  time: number;
}

function CityTile({
  city,
  unit,
  onUnitChange,
}: {
  city: City;
  unit: 'C' | 'F';
  onUnitChange: (u: 'C' | 'F') => void;
}) {
  const temp = city.lastReading
    ? Math.round(unit === 'C' ? city.lastReading.temp : city.lastReading.temp * 1.8 + 32)
    : null;

  return (
    <div>
      <div className="font-bold mb-1.5">{city.name}</div>
      {city.lastReading ? (
        <div className="mb-1.5">
          {temp}°{unit}
        </div>
      ) : (
        <div className="opacity-70 mb-1.5">No data</div>
      )}
      {city.forecast && <Forecast days={city.forecast.slice(0, 5)} unit={unit} />}
      <div className="flex gap-1.5 mt-1.5">
        <button
          className={`px-1.5 rounded ${unit === 'C' ? 'bg-blue-600' : 'bg-white/20'}`}
          onClick={(e) => {
            e.stopPropagation();
            onUnitChange('C');
          }}
        >
          °C
        </button>
        <button
          className={`px-1.5 rounded ${unit === 'F' ? 'bg-blue-600' : 'bg-white/20'}`}
          onClick={(e) => {
            e.stopPropagation();
            onUnitChange('F');
          }}
        >
          °F
        </button>
      </div>
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
  const [selected, setSelected] = useState<City | null>(null);
  const [globalUnit, setGlobalUnit] = usePersistentState<'C' | 'F'>('weather-unit', 'C');
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
      <div className="flex gap-1.5 mb-4">
        <button
          className={`px-1.5 rounded ${globalUnit === 'C' ? 'bg-blue-600' : 'bg-white/20'}`}
          onClick={() => setGlobalUnit('C')}
        >
          °C
        </button>
        <button
          className={`px-1.5 rounded ${globalUnit === 'F' ? 'bg-blue-600' : 'bg-white/20'}`}
          onClick={() => setGlobalUnit('F')}
        >
          °F
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {cities.map((city, i) => {
          const unit = city.unit || globalUnit;
          return (
            <div
              key={city.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              onClick={() => setSelected(city)}
              className="bg-white/10 p-4 rounded cursor-pointer"
            >
              <CityTile
                city={city}
                unit={unit}
                onUnitChange={(u) => {
                  setCities((prev) => {
                    const next = [...prev];
                    if (!next[i]) return prev;
                    next[i] = { ...next[i], unit: u };
                    return next;
                  });
                  setSelected((sel) =>
                    sel && sel.id === city.id ? { ...sel, unit: u } : sel,
                  );
                }}
              />
            </div>
          );
        })}
      </div>
      {offline && (
        <div className="mt-4 text-sm">Offline - showing cached data</div>
      )}
      {selected && (
        <CityDetail
          city={selected}
          unit={selected.unit || globalUnit}
          onUnitChange={(u) => {
            setCities((prev) => {
              const idx = prev.findIndex((c) => c.id === selected.id);
              if (idx === -1) return prev;
              const next = [...prev];
              next[idx] = { ...next[idx], unit: u };
              return next;
            });
            setSelected((sel) => (sel ? { ...sel, unit: u } : sel));
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

