'use client';

import WeatherIcon from './WeatherIcon';
import { ForecastDay, WeatherUnits } from '../state';
import { formatTemperature } from '../utils';

interface ForecastProps {
  days: ForecastDay[];
  units: WeatherUnits;
}

export default function Forecast({ days, units }: ForecastProps) {
  return (
    <div className="flex gap-1.5">
      {days.map((d) => (
        <div
          key={d.date}
          className="flex flex-col items-center p-1.5 bg-white/10 rounded"
        >
          <WeatherIcon code={d.condition} />
          <div className="text-sm mt-1">
            {formatTemperature(d.temp, units)}
          </div>
        </div>
      ))}
    </div>
  );
}

