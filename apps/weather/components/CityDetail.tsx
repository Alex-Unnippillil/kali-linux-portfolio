'use client';

import { useEffect, useMemo, useState } from 'react';
import { City } from '../state';
import { useUnitPreferences } from '../../../hooks/useSettings';
import {
  convertTemperatureSeries,
  formatTemperature,
  getTemperatureUnit,
} from '../../../utils/unitFormat';

interface Props {
  city: City;
  onClose: () => void;
}

export default function CityDetail({ city, onClose }: Props) {
  const [hourly, setHourly] = useState<number[]>([]);
  const [precip, setPrecip] = useState<number | null>(null);
  const { measurementSystem } = useUnitPreferences();
  const unit = getTemperatureUnit(measurementSystem);

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

  const temps = useMemo(
    () => convertTemperatureSeries(hourly, measurementSystem),
    [hourly, measurementSystem],
  );
  const slice = temps.slice(0, 24);
  const hasData = slice.length > 0;
  const min = hasData ? Math.min(...slice) : 0;
  const max = hasData ? Math.max(...slice) : 0;
  const range = hasData && max - min !== 0 ? max - min : 1;

  const step = 6;
  const height = 100;
  const viewWidth = step * Math.max(slice.length - 1, 1);
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
        <div className="mb-2 text-sm text-white/70">
          Showing {unit} (change this in Settings → Units).
        </div>
        <div className="h-24 relative">
          <svg
            viewBox={`0 0 ${viewWidth} ${height}`}
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
        {hasData ? (
          <div className="mt-2 text-sm text-white/80">
            Current: {formatTemperature(hourly[0], measurementSystem)}
          </div>
        ) : (
          <div className="mt-2 text-sm text-white/60">No recent temperature data.</div>
        )}
        {precip !== null && (
          <div className="mt-4 precip-text">Precipitation: {precip}%</div>
        )}
      </div>
    </div>
  );
}

