'use client';

import { ChangeEvent } from 'react';
import usePersistentState from '@/hooks/usePersistentState';
import type { ClockStyle } from '../Clock';

const STYLES: { value: ClockStyle; label: string }[] = [
  { value: 'time', label: 'Time only' },
  { value: 'date', label: 'Date only' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'custom', label: 'Custom' },
];

export default function ClockSettings() {
  const [style, setStyle] = usePersistentState<ClockStyle>('clock:style', 'datetime');
  const [format, setFormat] = usePersistentState<string>('clock:format', '%a %b %-d %H:%M');
  const [tooltip, setTooltip] = usePersistentState<string>('clock:tooltip', '%A %B %-d, %Y');
  const [calendar, setCalendar] = usePersistentState<boolean>('clock:calendar', false);

  const handleStyle = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ClockStyle;
    setStyle(value);
    window.dispatchEvent(new CustomEvent('clock-style', { detail: value }));
  };

  const handleFormat = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormat(value);
    window.dispatchEvent(new CustomEvent('clock-format', { detail: value }));
  };

  const handleTooltip = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTooltip(value);
    window.dispatchEvent(new CustomEvent('clock-tooltip', { detail: value }));
  };

  const handleCalendar = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked;
    setCalendar(value);
    window.dispatchEvent(new CustomEvent('clock-calendar', { detail: value }));
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center space-x-2">
        <span>Style</span>
        <select
          className="text-black px-1 py-0.5 rounded"
          value={style}
          onChange={handleStyle}
        >
          {STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {style === 'custom' && (
        <label className="flex items-center space-x-2">
          <span>Format</span>
          <input
            type="text"
            className="text-black px-1 py-0.5 rounded flex-1"
            value={format}
            onChange={handleFormat}
            aria-label="Clock format"
          />
        </label>
      )}
      <label className="flex items-center space-x-2">
        <span>Tooltip</span>
        <input
          type="text"
          className="text-black px-1 py-0.5 rounded flex-1"
          value={tooltip}
          onChange={handleTooltip}
          aria-label="Clock tooltip"
        />
      </label>
      <label className="flex items-center space-x-2">
        <span>Calendar</span>
        <input
          type="checkbox"
          checked={calendar}
          onChange={handleCalendar}
          aria-label="Toggle calendar"
        />
      </label>
    </div>
  );
}

