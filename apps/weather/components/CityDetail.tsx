'use client';

import { useEffect, useState } from 'react';
import { City } from '../state';

interface Props {
  city: City;
  onClose: () => void;
  onDelete: (city: City) => void;
}

export default function CityDetail({ city, onClose, onDelete }: Props) {
  const [unit, setUnit] = useState<'C' | 'F'>('C');
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

  const temps = unit === 'C' ? hourly : hourly.map((t) => t * 1.8 + 32);
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="font-bold">{city.name}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded bg-red-600 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80"
              onClick={() => onDelete(city)}
            >
              Delete City
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-white/10 px-2 py-1 text-xs font-medium uppercase tracking-wide text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 mb-4">
          <button
            className={`px-1.5 rounded ${unit === 'C' ? 'bg-blue-600' : 'bg-white/20'}`}
            onClick={() => setUnit('C')}
          >
            °C
          </button>
          <button
            className={`px-1.5 rounded ${unit === 'F' ? 'bg-blue-600' : 'bg-white/20'}`}
            onClick={() => setUnit('F')}
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

