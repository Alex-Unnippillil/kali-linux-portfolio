import React, { useEffect, useState } from 'react';
import demoData from './demo.json';
import usePersistentState from '../../../hooks/usePersistentState';

const Weather = () => {
  const [data, setData] = useState(null);
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState(null);
  const [input, setInput] = useState('');
  const [unit, setUnit] = usePersistentState('weather-unit', 'C');
  const favValidator = (v) =>
    Array.isArray(v) && v.every((f) => f && typeof f.name === 'string');
  const [favorites, setFavorites] = usePersistentState(
    'weather-favs',
    [],
    favValidator
  );

  useEffect(() => {
    const cachedStr =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('weather-cache')
        : null;
    if (typeof fetch !== 'function') {
      if (cachedStr) {
        try {
          const cached = JSON.parse(cachedStr);
          setCity(cached.city);
          setCoords(cached.coords);
          setData(cached.data);
          return;
        } catch {
          /* ignore */
        }
      }
      setCity(demoData.city);
      setCoords(demoData.coords);
      setData(demoData);
      return;
    }
    if (cachedStr) {
      try {
        const cached = JSON.parse(cachedStr);
        setCity(cached.city);
        setCoords(cached.coords);
        setData(cached.data);
        return;
      } catch {
        /* ignore */
      }
    }
    setCity(demoData.city);
    setCoords(demoData.coords);
    setData(demoData);
  }, []);

  const convertTemp = (t) => (unit === 'C' ? t : t * 9/5 + 32);
  const formatTemp = (t) => `${Math.round(convertTemp(t))}°${unit}`;
  const formatDate = (str) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(str));
  const formatTime = (str) =>
    new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(str));

  const loadForecast = async (lat, lon, name) => {
    if (typeof fetch !== 'function') {
      setData(demoData);
      setCity(demoData.city);
      setCoords(demoData.coords);
      return;
    }
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&current_weather=true&timezone=auto`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
      setCity(name);
      const c = { latitude: lat, longitude: lon };
      setCoords(c);
      window.localStorage.setItem(
        'weather-cache',
        JSON.stringify({ city: name, coords: c, data: json })
      );
    } catch {
      const cachedStr = window.localStorage.getItem('weather-cache');
      if (cachedStr) {
        try {
          const cached = JSON.parse(cachedStr);
          setData(cached.data);
          setCity(cached.city);
          setCoords(cached.coords);
          return;
        } catch {
          /* ignore */
        }
      }
      setData(demoData);
      setCity(demoData.city);
      setCoords(demoData.coords);
    }
  };

  const searchCity = async () => {
    if (!input.trim()) return;
    if (typeof fetch !== 'function') {
      setData(demoData);
      setCity(demoData.city);
      setCoords(demoData.coords);
      return;
    }
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          input
        )}&count=1`
      );
      const geo = await geoRes.json();
      if (!geo.results || !geo.results.length) throw new Error('no');
      const { latitude, longitude, name } = geo.results[0];
      await loadForecast(latitude, longitude, name);
    } catch {
      const cachedStr = window.localStorage.getItem('weather-cache');
      if (cachedStr) {
        try {
          const cached = JSON.parse(cachedStr);
          setData(cached.data);
          setCity(cached.city);
          setCoords(cached.coords);
          return;
        } catch {
          /* ignore */
        }
      }
      setData(demoData);
      setCity(demoData.city);
      setCoords(demoData.coords);
    }
  };

  const toggleFavorite = () => {
    if (!coords || !city) return;
    const exists = favorites.some((f) => f.name === city);
    const newFavs = exists
      ? favorites.filter((f) => f.name !== city)
      : [...favorites, { name: city, coords }];
    setFavorites(newFavs);
  };

  const selectFavorite = (fav) => {
    loadForecast(fav.coords.latitude, fav.coords.longitude, fav.name);
  };

  if (!data) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading...
      </div>
    );
  }

  const isFav = favorites.some((f) => f.name === city);

  return (
    <div className="h-full w-full flex flex-col items-center bg-ub-cool-grey text-white p-4 overflow-auto">
      <div className="w-full max-w-xs mb-2 flex">
        <input
          className="flex-grow p-1 text-black rounded-l"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search city..."
        />
        <button onClick={searchCity} className="bg-gray-700 px-2 rounded-r">
          Search
        </button>
        <button
          data-testid="toggle-unit"
          onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}
          className="ml-2 bg-gray-700 px-2 rounded"
        >
          °{unit}
        </button>
      </div>
      {favorites.length > 0 && (
        <ul className="mb-2 flex space-x-2" data-testid="favorites">
          {favorites.map((f) => (
            <li key={f.name}>
              <button onClick={() => selectFavorite(f)} className="underline">
                {f.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        data-testid="now-card"
        className="bg-gray-700 p-3 rounded w-full max-w-xs flex justify-between items-start mb-4"
      >
        <div>
          <div className="font-bold">{city}</div>
          <div data-testid="current-temp">{formatTemp(data.current_weather.temperature)}</div>
          <div className="text-xs">Sunrise: {formatTime(data.daily.sunrise[0])}</div>
          <div className="text-xs">Sunset: {formatTime(data.daily.sunset[0])}</div>
        </div>
        <button onClick={toggleFavorite} aria-label="favorite" className="text-2xl">
          {isFav ? '★' : '☆'}
        </button>
      </div>
      <ul className="text-sm w-full max-w-xs space-y-1">
        {data.daily.time.map((t, i) => (
          <li key={t} className="flex justify-between">
            <span>{formatDate(t)}</span>
            <span>
              {formatTemp(data.daily.temperature_2m_max[i])}/
              {formatTemp(data.daily.temperature_2m_min[i])}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Weather;

export const displayWeather = () => {
  return <Weather />;
};
