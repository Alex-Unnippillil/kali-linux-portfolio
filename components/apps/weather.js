import React, { useEffect, useState } from 'react';
import demoData from './weather-demo.json';

const CACHE_KEY = 'weather-cache';

const Weather = ({ demo = false }) => {
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('');
  const [units, setUnits] = useState('C');
  const [data, setData] = useState(null);

  const loadCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };

  const saveCache = (cityName, forecast) => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ city: cityName, data: forecast })
      );
    } catch {}
  };

  const fetchForecast = async (cityName) => {
    if (demo) {
      setCity(demoData.city);
      setData(demoData);
      return;
    }
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          cityName
        )}&count=1`
      );
      if (!geoRes.ok) throw new Error('geocode');
      const geo = await geoRes.json();
      if (!geo.results?.length) throw new Error('not found');
      const { latitude, longitude, name } = geo.results[0];
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min&current_weather=true&timezone=auto`
      );
      if (!weatherRes.ok) throw new Error('forecast');
      const json = await weatherRes.json();
      setCity(name);
      setData(json);
      saveCache(name, json);
    } catch {
      const cache = loadCache();
      if (cache) {
        setCity(cache.city);
        setData(cache.data);
      } else {
        setCity(demoData.city);
        setData(demoData);
      }
    }
  };

  useEffect(() => {
    const cache = loadCache();
    if (cache) {
      setCity(cache.city);
      setData(cache.data);
    }
    if (demo) {
      fetchForecast(demoData.city);
    } else {
      fetchForecast(cache?.city || 'London');
    }
  }, [demo]);

  const convert = (t) =>
    units === 'C' ? Math.round(t) : Math.round((t * 9) / 5 + 32);

  const formatDate = (str) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(str));

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      fetchForecast(query.trim());
      setQuery('');
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 overflow-auto">
      <form onSubmit={handleSearch} className="mb-4 flex w-full max-w-xs">
        <input
          data-testid="city-input"
          className="flex-grow text-black px-2 py-1"
          placeholder="Enter city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="ml-2 px-2 py-1 bg-ub-hot-orange rounded">
          Search
        </button>
      </form>
      {!data ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="text-xl mb-2">{city}</div>
          <div data-testid="temp" className="text-4xl mb-4">
            {convert(data.current_weather.temperature)}°{units}
          </div>
          <button
            data-testid="unit-toggle"
            className="mb-4 px-2 py-1 bg-ub-hot-orange rounded"
            onClick={() => setUnits(units === 'C' ? 'F' : 'C')}
          >
            Switch to °{units === 'C' ? 'F' : 'C'}
          </button>
          <ul className="text-sm w-full max-w-xs space-y-1">
            {data.daily.time.map((t, i) => (
              <li key={t} className="flex justify-between">
                <span>{formatDate(t)}</span>
                <span>
                  {convert(data.daily.temperature_2m_max[i])}/
                  {convert(data.daily.temperature_2m_min[i])}°{units}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default Weather;

export const displayWeather = () => {
  return <Weather />;
};

