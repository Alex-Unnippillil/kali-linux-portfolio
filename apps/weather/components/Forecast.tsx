'use client';

import WeatherIcon from './WeatherIcon';
import { ForecastDay } from '../state';

export default function Forecast({
  days,
  unit,
}: {
  days: ForecastDay[];
  unit: 'C' | 'F';
}) {
  const convert = (t: number) => (unit === 'C' ? t : t * 1.8 + 32);

  return (
    <div className="flex gap-1.5">
      {days.map((d) => (
        <div
          key={d.date}
          className="flex flex-col items-center p-1.5 bg-white/10 rounded"
        >
          <WeatherIcon code={d.condition} />
          <div className="text-sm mt-1">
            {Math.round(convert(d.temp))}°{unit}
          </div>
        </div>
      ))}
    </div>
  );
}

