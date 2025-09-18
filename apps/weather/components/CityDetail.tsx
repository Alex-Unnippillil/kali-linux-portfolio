'use client';

import { useEffect, useState } from 'react';
import { City, useWeatherUnits } from '../state';
import { convertTemperature } from '../utils';

interface Props {
  city: City;
  onClose: () => void;
}

export default function CityDetail({ city, onClose }: Props) {
  const [units, setUnits] = useWeatherUnits();
  const [hourly, setHourly] = useState<number[]>([]);
  const [precip, setPrecip] = useState<number | null>(null);

  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&hourly=temperature_2m,precipitation_probability&forecast_days=1&timezone=auto`,
    )
      .then((res) => res.json())
      .then((data) => {
        setHourly(data.hourly.temperature_2m as number[]);
        setPrecip(data.hourly.precipitation_probability?.[0] ?? null);
      })
      .catch(() => {});
  }, [city]);

  const temps = hourly.map((t) => convertTemperature(t, units));
  const slice = temps.slice(0, 24);
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const range = max - min || 1;

  const step = 6;
  const height = 100;
  const points = slice
    .map(
      (t, i) => `${i * step},${height - ((t - min) / range) * height}`,
    )
    .join(' ');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-neutral-900 p-4 rounded w-full max-w-md text-white">
        <div className="flex justify-between mb-4">
          <div className="font-bold">{city.name}</div>
          <button onClick={onClose} className="px-1.5">Close</button>
        </div>
        <div className="flex gap-1.5 mb-4">
          <button
            className={`px-1.5 rounded ${
              units === 'metric' ? 'bg-blue-600' : 'bg-white/20'
            }`}
            onClick={() => setUnits('metric')}
          >
            °C
          </button>
          <button
            className={`px-1.5 rounded ${
              units === 'imperial' ? 'bg-blue-600' : 'bg-white/20'
            }`}
            onClick={() => setUnits('imperial')}
          >
            °F
          </button>
        </div>
        <div className="h-24 relative">
          <svg
            viewBox={`0 0 ${step * (slice.length - 1)} ${height}`}
            className="absolute inset-0 w-full h-full"
          >
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
            {slice.map((t, i) => (
              <circle
                key={i}
                cx={i * step}
                cy={height - ((t - min) / range) * height}
                r="2"
                className="fill-blue-400"
              />
            ))}
          </svg>
        </div>
        {precip !== null && (
          <div className="mt-4 precip-text">Precipitation: {precip}%</div>
        )}
      </div>
    </div>
  );
}

