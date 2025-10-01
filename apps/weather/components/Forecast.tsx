
'use client';

import WeatherIcon from './WeatherIcon';
import { ForecastDay } from '../state';
import { useUnitPreferences } from '../../../hooks/useSettings';
import { formatTemperature } from '../../../utils/unitFormat';

export default function Forecast({ days }: { days: ForecastDay[] }) {
  const { measurementSystem } = useUnitPreferences();
  return (
    <div className="flex gap-1.5">
      {days.map((d) => (
        <div
          key={d.date}
          className="flex flex-col items-center p-1.5 bg-white/10 rounded"
        >
          <WeatherIcon code={d.condition} />
          <div className="text-sm mt-1">
            {formatTemperature(d.temp, measurementSystem)}
          </div>
        </div>
      ))}
    </div>
  );
}

