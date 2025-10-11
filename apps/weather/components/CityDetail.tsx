'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { City } from '../state';
import type { DemoWeatherSnapshot } from '../demoData';
import WeatherIcon from './WeatherIcon';
import {
  TemperatureUnit,
  convertFromCelsius,
  formatTemperature,
  UNIT_SYMBOL,
} from '../units';

interface Props {
  city: City;
  weather: DemoWeatherSnapshot;
  unit: TemperatureUnit;
  onUnitChange: (unit: TemperatureUnit) => void;
  onClose: () => void;
}

interface Coordinates {
  x: number;
  y: number;
}

interface WorkerPayload {
  points: string;
  coords: Coordinates[];
}

const VIEWBOX_SIZE = 100;

function computeCoordinates(temps: number[]): WorkerPayload {
  if (!Array.isArray(temps) || temps.length === 0) {
    return { points: '', coords: [] };
  }
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const denominator = Math.max(temps.length - 1, 1);
  const coords = temps.map((t, i) => {
    const x = (i / denominator) * VIEWBOX_SIZE;
    const y = ((maxTemp - t) / (maxTemp - minTemp || 1)) * VIEWBOX_SIZE;
    return { x, y };
  });
  const points = coords.map(({ x, y }) => `${x},${y}`).join(' ');
  return { points, coords };
}

export default function CityDetail({
  city,
  weather,
  unit,
  onUnitChange,
  onClose,
}: Props) {
  const workerRef = useRef<Worker | null>(null);
  const [points, setPoints] = useState('');
  const [coords, setCoords] = useState<Coordinates[]>([]);

  const temps = useMemo(
    () => weather.hourly.map((value) => convertFromCelsius(value, unit)),
    [weather.hourly, unit],
  );

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      const payload = computeCoordinates(temps);
      setPoints(payload.points);
      setCoords(payload.coords);
      return;
    }

    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../../../components/apps/weather.worker.js', import.meta.url),
      );
    }

    const worker = workerRef.current;
    const handleMessage = (event: MessageEvent<WorkerPayload>) => {
      const payload = event.data || { points: '', coords: [] };
      setPoints(payload.points);
      setCoords(payload.coords);
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({ temps });

    return () => {
      worker.removeEventListener('message', handleMessage);
    };
  }, [temps]);

  useEffect(() => () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const precip = weather.precipitationChance;
  const observation = new Date(weather.reading.time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-neutral-900 p-4 rounded w-full max-w-md text-white">
        <div className="flex justify-between mb-4 items-start gap-3">
          <div>
            <div className="font-bold text-lg">{city.name}</div>
            <div className="text-sm text-white/70">
              Observed at {observation} ({UNIT_SYMBOL[unit]})
            </div>
          </div>
          <button onClick={onClose} className="px-1.5">
            Close
          </button>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <WeatherIcon code={weather.reading.condition} className="w-14 h-14" />
          <div className="text-3xl font-semibold">
            {formatTemperature(weather.reading.temp, unit, {
              maximumFractionDigits: 1,
            })}
          </div>
        </div>
        <div className="flex gap-1.5 mb-4" role="group" aria-label="Select temperature unit">
          <button
            className={`px-1.5 rounded ${
              unit === 'metric' ? 'bg-blue-600' : 'bg-white/20'
            }`}
            onClick={() => onUnitChange('metric')}
            type="button"
          >
            °C
          </button>
          <button
            className={`px-1.5 rounded ${
              unit === 'imperial' ? 'bg-blue-600' : 'bg-white/20'
            }`}
            onClick={() => onUnitChange('imperial')}
            type="button"
          >
            °F
          </button>
        </div>
        <div className="h-32 relative">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            {points && (
              <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            )}
            {coords.map((coord, index) => (
              <circle
                key={index}
                cx={coord.x}
                cy={coord.y}
                r="2.5"
                className="fill-blue-400"
              />
            ))}
          </svg>
        </div>
        {precip !== null && (
          <div className="mt-4 text-sm">
            Precipitation chance: {precip}%
          </div>
        )}
      </div>
    </div>
  );
}
