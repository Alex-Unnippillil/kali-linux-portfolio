'use client';

import WeatherIcon from './WeatherIcon';
import type { ForecastDay } from '../state';

export default function Forecast({ days }: { days: ForecastDay[] }) {
  return (
    <div className="flex gap-1.5">
      {days.map((d) => (
        <div
          key={d.date}
          className="flex flex-col items-center p-1.5 bg-white/10 rounded"
        >
          <WeatherIcon code={d.condition} />
          <div className="text-sm mt-1">{Math.round(d.temp)}°</div>
        </div>
      ))}
    </div>
  );
}

