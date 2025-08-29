'use client';
import React, { useEffect, useState } from 'react';
import cities from './cities.json';

type CityKey = keyof typeof cities;
type Unit = 'C' | 'F';

type Day = {
  date: string;
  tempC: number;
  windKph: number;
  humidity: number;
  condition: string;
};

const SunIcon = () => (
  <svg className="w-10 h-10 text-yellow-300 animate-spin" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4">
    <circle cx="32" cy="32" r="12" />
    {[...Array(8)].map((_, i) => {
      const angle = (i * Math.PI) / 4;
      const x1 = 32 + Math.cos(angle) * 20;
      const y1 = 32 + Math.sin(angle) * 20;
      const x2 = 32 + Math.cos(angle) * 28;
      const y2 = 32 + Math.sin(angle) * 28;
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
    })}
  </svg>
);

const CloudIcon = () => (
  <svg className="w-10 h-10 text-gray-300 animate-pulse" viewBox="0 0 64 64" fill="currentColor">
    <path d="M20 46h28a10 10 0 0 0 0-20 14 14 0 0 0-26-6 12 12 0 0 0-2 26z" />
  </svg>
);

const RainIcon = () => (
  <svg className="w-10 h-10 text-blue-300" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4">
    <path d="M20 40h24a8 8 0 0 0 0-16 12 12 0 0 0-22-4 10 10 0 0 0-2 20z" />
    <g className="animate-bounce" strokeWidth="3">
      {[12,24,36].map(x => <line key={x} x1={x} y1={44} x2={x-2} y2={52} />)}
    </g>
  </svg>
);

function getIcon(condition: string) {
  switch (condition) {
    case 'sunny':
      return <SunIcon />;
    case 'rain':
      return <RainIcon />;
    default:
      return <CloudIcon />;
  }
}

function feelsLike(tempC: number, humidity: number, windKph: number) {
  const tempF = tempC * 9/5 + 32;
  const windMph = windKph / 1.609;
  let feelsF = tempF;
  if (tempF >= 80 && humidity >= 40) {
    feelsF = -42.379 + 2.04901523 * tempF + 10.14333127 * humidity - 0.22475541 * tempF * humidity - 0.00683783 * tempF * tempF - 0.05481717 * humidity * humidity + 0.00122874 * tempF * tempF * humidity + 0.00085282 * tempF * humidity * humidity - 0.00000199 * tempF * tempF * humidity * humidity;
  } else if (tempF <= 50 && windMph > 3) {
    feelsF = 35.74 + 0.6215 * tempF - 35.75 * Math.pow(windMph, 0.16) + 0.4275 * tempF * Math.pow(windMph, 0.16);
  }
  return (feelsF - 32) * 5/9;
}

function convert(tempC: number, unit: Unit) {
  return unit === 'C' ? tempC : tempC * 9/5 + 32;
}

export default function WeatherApp() {
  const [unit, setUnit] = useState<Unit>('C');
  const [saved, setSaved] = useState<string[]>([]);
  const [city, setCity] = useState<CityKey>('New York');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const s = localStorage.getItem('weather:saved');
    if (s) setSaved(JSON.parse(s));
    const u = localStorage.getItem('weather:unit');
    if (u === 'C' || u === 'F') setUnit(u);
    const pinned = localStorage.getItem('pinnedCity');
    if (pinned && cities[pinned as CityKey]) setCity(pinned as CityKey);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('weather:unit', unit);
    }
  }, [unit]);

  const saveCity = () => {
    if (!saved.includes(city)) {
      const updated = [...saved, city];
      setSaved(updated);
      localStorage.setItem('weather:saved', JSON.stringify(updated));
    }
  };

  const pinCity = () => {
    const data = cities[city].current;
    localStorage.setItem('pinnedCityForecast', JSON.stringify({ name: city, ...data }));
    localStorage.setItem('pinnedCity', city);
  };

  const current = cities[city];
  const days = current.days as Day[];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 overflow-auto">
      <div className="flex gap-2 mb-4 items-center">
        <select value={city} onChange={e => setCity(e.target.value as CityKey)} className="text-black p-1 rounded">
          {Object.keys(cities).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={saveCity} className="px-2 py-1 bg-blue-600 rounded">Save</button>
        <button onClick={pinCity} className="px-2 py-1 bg-green-600 rounded">Pin</button>
        <button onClick={() => setUnit(unit === 'C' ? 'F' : 'C')} className="px-2 py-1 bg-gray-700 rounded">°{unit === 'C' ? 'F' : 'C'}</button>
      </div>
      {saved.length > 0 && (
        <div className="mb-4">Saved cities:{' '}
          {saved.map(s => (
            <button key={s} onClick={() => setCity(s as CityKey)} className="underline ml-2">
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {days.map(d => {
          const feel = feelsLike(d.tempC, d.humidity, d.windKph);
          return (
            <div key={d.date} className="flex flex-col items-center bg-white/10 rounded p-2">
              <div>{new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
              {getIcon(d.condition)}
              <div>{Math.round(convert(d.tempC, unit))}°{unit}</div>
              <div className="text-xs">Feels {Math.round(convert(feel, unit))}°{unit}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
