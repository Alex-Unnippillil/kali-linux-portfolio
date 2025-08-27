import React, { useEffect, useRef, useState } from 'react';
import usePersistentState from '../usePersistentState';

const demoForecast = () => {
  const now = new Date();
  const day = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  return {
    current_weather: { temperature: 21 },
    daily: {
      time: [day(0), day(1), day(2)],
      temperature_2m_max: [24, 23, 22],
      temperature_2m_min: [16, 15, 14],
    },
  };
};

const Weather = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState(null); // { key, name, lat, lon }
  const [geoDenied, setGeoDenied] = useState(false);
  const [units, setUnits] = usePersistentState('weather-units', 'metric');
  const [stale, setStale] = useState(false);
  const cacheRef = useRef({});

  // Attempt geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          key: `${pos.coords.latitude},${pos.coords.longitude}`,
          name: 'Current Location',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }),
      () => setGeoDenied(true)
    );
  }, []);

  const loadWeather = async (loc) => {
    const cacheKey = `${loc.key}|${units}`;
    if (cacheRef.current[cacheKey]) {
      setData(cacheRef.current[cacheKey]);
      setStale(true);
    } else {
      setData(null);
    }
    try {
      const unitParam = units === 'metric' ? 'celsius' : 'fahrenheit';
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&temperature_unit=${unitParam}&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch forecast');
      const json = await res.json();
      cacheRef.current[cacheKey] = json;
      setData(json);
      setStale(false);
      setError('');
    } catch {
      setError('Failed to fetch weather');
      if (!cacheRef.current[cacheKey]) {
        setData(demoForecast());
      }
    }
  };

  // Load weather when location or units change
  useEffect(() => {
    if (location) {
      loadWeather(location);
    }
  }, [location, units]);

  const searchCity = async (e) => {
    e.preventDefault();
    if (!query) return;
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&count=1`
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (!json.results || json.results.length === 0) throw new Error();
      const { latitude, longitude, name } = json.results[0];
      setLocation({ key: name, name, lat: latitude, lon: longitude });
      setQuery('');
      setGeoDenied(false);
      setError('');
    } catch {
      setError('City not found');
    }
  };

  if (!location && geoDenied) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
        <form onSubmit={searchCity} className="w-full max-w-xs space-y-2">
          <input
            className="w-full p-2 text-black"
            placeholder="Enter city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="w-full bg-ub-grey rounded p-2">
            Search
          </button>
          {error && <div className="text-red-400 text-sm">{error}</div>}
        </form>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white">
        Loading...
      </div>
    );
  }

  const formatDate = (str) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(str));

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 overflow-auto">
      <div className="w-full max-w-xs flex items-center justify-between mb-4">
        <div className="text-4xl">
          {Math.round(data.current_weather.temperature)}°
          {units === 'metric' ? 'C' : 'F'}
        </div>
        <button
          onClick={() => setUnits(units === 'metric' ? 'imperial' : 'metric')}
          className="text-sm bg-ub-grey rounded px-2 py-1"
        >
          {units === 'metric' ? '°F' : '°C'}
        </button>
      </div>
      {stale && <div className="text-xs text-yellow-400 mb-2">Stale</div>}
      {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
      <ul className="text-sm w-full max-w-xs space-y-1">
        {data.daily.time.map((t, i) => (
          <li key={t} className="flex justify-between">
            <span>{formatDate(t)}</span>
            <span>
              {Math.round(data.daily.temperature_2m_max[i])}/
              {Math.round(data.daily.temperature_2m_min[i])}°
              {units === 'metric' ? 'C' : 'F'}
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

