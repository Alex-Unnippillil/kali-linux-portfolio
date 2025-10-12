'use client';

import WeatherIcon from './WeatherIcon';
import { ForecastDay } from '../state';

const formatDayLabel = (date: string) => {
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return date;
  return dt.toLocaleDateString(undefined, { weekday: 'short' });
};

export default function Forecast({ days }: { days: ForecastDay[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {days.map((d) => (
        <div
          key={d.date}
          className="flex min-w-[84px] flex-1 flex-col items-center gap-2 rounded-md bg-white/5 p-2 text-center"
        >
          <div className="text-xs uppercase tracking-wide text-white/60">
            {formatDayLabel(d.date)}
          </div>
          <WeatherIcon code={d.condition} className="h-10 w-10" />
          <div className="text-sm font-medium">{Math.round(d.temp)}°</div>
        </div>
      ))}
    </div>
  );
}

