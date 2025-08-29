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

  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&hourly=temperature_2m&forecast_days=1&timezone=auto`,
    )
      .then((res) => res.json())
      .then((data) => setHourly(data.hourly.temperature_2m as number[]))
      .catch(() => {});
  }, [city]);

  const temps = unit === 'C' ? hourly : hourly.map((t) => t * 1.8 + 32);
  const slice = temps.slice(0, 24);
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const range = max - min || 1;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-neutral-900 p-4 rounded w-full max-w-md text-white">
        <div className="flex justify-between mb-4">
          <div className="font-bold">{city.name}</div>
          <button onClick={onClose} className="px-1.5">Close</button>
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
        <div className="flex items-end h-24 gap-0.5">
          {slice.map((t, i) => (
            <div
              key={i}
              className="bg-blue-400 w-1"
              style={{ height: `${((t - min) / range) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

