'use client';

import { useEffect, useState } from 'react';
import usePersistentState from '@/hooks/usePersistentState';

export type ClockStyle = 'time' | 'date' | 'datetime' | 'custom';

const STYLE_FORMATS: Record<Exclude<ClockStyle, 'custom'>, string> = {
  time: '%H:%M',
  date: '%a %b %-d',
  datetime: '%a %b %-d %H:%M',
};

function pad(num: number, len = 2) {
  return num.toString().padStart(len, '0');
}

function formatDate(date: Date, fmt: string) {
  const map: Record<string, string> = {
    '%a': date.toLocaleDateString(undefined, { weekday: 'short' }),
    '%A': date.toLocaleDateString(undefined, { weekday: 'long' }),
    '%b': date.toLocaleDateString(undefined, { month: 'short' }),
    '%B': date.toLocaleDateString(undefined, { month: 'long' }),
    '%d': pad(date.getDate()),
    '%-d': date.getDate().toString(),
    '%H': pad(date.getHours()),
    '%-H': date.getHours().toString(),
    '%I': pad((date.getHours() % 12) || 12),
    '%-I': ((date.getHours() % 12) || 12).toString(),
    '%M': pad(date.getMinutes()),
    '%S': pad(date.getSeconds()),
    '%p': date.getHours() < 12 ? 'AM' : 'PM',
    '%Y': date.getFullYear().toString(),
    '%m': pad(date.getMonth() + 1),
  };
  return fmt.replace(/%[-]?[aAbBdHImMpSYm]/g, (m) => map[m] ?? m);
}

export default function Clock() {
  const [now, setNow] = useState<Date>(new Date());
  const [style, setStyle] = usePersistentState<ClockStyle>('clock:style', 'datetime');
  const [customFormat, setCustomFormat] = usePersistentState<string>('clock:format', STYLE_FORMATS.datetime);
  const [tooltipFormat, setTooltipFormat] = usePersistentState<string>('clock:tooltip', '%A %B %-d, %Y');
  const [calendarEnabled, setCalendarEnabled] = usePersistentState<boolean>('clock:calendar', false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // sync with settings events
  useEffect(() => {
    const onStyle = (e: Event) => setStyle((e as CustomEvent<ClockStyle>).detail);
    const onFormat = (e: Event) => setCustomFormat((e as CustomEvent<string>).detail);
    const onTooltip = (e: Event) => setTooltipFormat((e as CustomEvent<string>).detail);
    const onCalendar = (e: Event) => setCalendarEnabled((e as CustomEvent<boolean>).detail);
    window.addEventListener('clock-style', onStyle);
    window.addEventListener('clock-format', onFormat);
    window.addEventListener('clock-tooltip', onTooltip);
    window.addEventListener('clock-calendar', onCalendar);
    return () => {
      window.removeEventListener('clock-style', onStyle);
      window.removeEventListener('clock-format', onFormat);
      window.removeEventListener('clock-tooltip', onTooltip);
      window.removeEventListener('clock-calendar', onCalendar);
    };
  }, [setStyle, setCustomFormat, setTooltipFormat, setCalendarEnabled]);

  const format = style === 'custom' ? customFormat : STYLE_FORMATS[style];
  const label = formatDate(now, format);
  const tooltip = tooltipFormat ? formatDate(now, tooltipFormat) : undefined;

  const handleClick = () => {
    if (calendarEnabled) setOpen((o) => !o);
  };

  return (
    <div className="relative inline-block" onClick={handleClick}>
      <span dangerouslySetInnerHTML={{ __html: label }} title={tooltip}></span>
      {calendarEnabled && open && (
        <div className="absolute mt-1 p-2 bg-white text-black rounded shadow">
          {now.toDateString()}
        </div>
      )}
    </div>
  );
}

