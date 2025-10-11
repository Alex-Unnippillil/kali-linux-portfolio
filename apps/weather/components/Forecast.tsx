'use client';

import WeatherIcon from './WeatherIcon';
import { ForecastDay } from '../state';
import { TemperatureUnit, formatTemperature } from '../units';

interface ForecastProps {
  days: ForecastDay[];
  unit: TemperatureUnit;
}

export default function Forecast({ days, unit }: ForecastProps) {
  return (
    <div className="flex gap-1.5">
      {days.map((d) => (
        <div
          key={d.date}
          className="flex flex-col items-center p-1.5 bg-white/10 rounded"
        >
          <WeatherIcon code={d.condition} />
          <div className="text-sm mt-1">
            {formatTemperature(d.temp, unit)}
          </div>
        </div>
      ))}
    </div>
  );
}

