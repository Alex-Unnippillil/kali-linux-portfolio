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
    <div className="flex flex-wrap gap-2 text-[color:var(--kali-text)]">
      {days.map((d) => (
        <div
          key={d.date}
          className="flex min-w-[84px] flex-1 flex-col items-center gap-2 rounded-md border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] p-2 text-center shadow-[0_1px_0_rgba(255,255,255,0.04)]"
        >
          <div className="text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
            {formatDayLabel(d.date)}
          </div>
          <WeatherIcon
            code={d.condition}
            className="h-10 w-10"
          />
          <div className="text-sm font-medium text-[color:var(--kali-text)]">
            {Math.round(d.temp)}°
          </div>
        </div>
      ))}
    </div>
  );
}
