'use client';

import { useEffect, useState } from 'react';
import { City } from '../state';

interface Props {
  city: City;
  onClose: () => void;
}

export default function CityDetail({ city, onClose }: Props) {
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
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-kali-primary/25 bg-kali-surface/95 p-4 text-white shadow-kali-panel">
        <div className="mb-4 flex justify-between">
          <div className="font-bold text-lg text-kali-primary">{city.name}</div>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm font-medium text-kali-primary transition hover:text-kali-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          >
            Close
          </button>
        </div>
        <div className="mb-4 flex gap-1.5">
          <button
            className={`rounded border px-2 py-1 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
              unit === 'C'
                ? 'border-kali-primary/60 bg-kali-primary text-kali-secondary shadow-[0_4px_12px_rgba(15,148,210,0.3)]'
                : 'border-kali-primary/30 bg-kali-surface/80 text-white/80 hover:bg-kali-surface/95'
            }`}
            onClick={() => setUnit('C')}
          >
            °C
          </button>
          <button
            className={`rounded border px-2 py-1 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
              unit === 'F'
                ? 'border-kali-primary/60 bg-kali-primary text-kali-secondary shadow-[0_4px_12px_rgba(15,148,210,0.3)]'
                : 'border-kali-primary/30 bg-kali-surface/80 text-white/80 hover:bg-kali-surface/95'
            }`}
            onClick={() => setUnit('F')}
          >
            °F
          </button>
        </div>
        <div className="relative h-24">
          <svg
            viewBox={`0 0 ${step * (slice.length - 1)} ${height}`}
            className="absolute inset-0 h-full w-full text-kali-primary"
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
                className="fill-kali-primary"
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

