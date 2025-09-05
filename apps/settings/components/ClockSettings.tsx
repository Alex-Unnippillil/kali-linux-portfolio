"use client";

import { useClocks, ClockConfig } from '../../../hooks/useClocks';

const timezones =
  typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
    ? Intl.supportedValuesOf('timeZone')
    : [
        'UTC',
      ];

export default function ClockSettings() {
  const [clocks, setClocks] = useClocks();

  const updateClock = (idx: number, data: Partial<ClockConfig>) => {
    setClocks(clocks.map((c, i) => (i === idx ? { ...c, ...data } : c)));
  };

  const removeClock = (idx: number) => {
    setClocks(clocks.filter((_, i) => i !== idx));
  };

  const addClock = () => {
    setClocks([
      ...clocks,
      {
        label: 'Clock',
        timezone:
          typeof Intl !== 'undefined'
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : 'UTC',
        format: '%a %b %d %I:%M %p',
      },
    ]);
  };

  return (
    <div className="p-4 space-y-4">
      {clocks.map((clock, idx) => (
          <div key={idx} className="flex gap-2 items-center">
          <input
            value={clock.label}
            onChange={(e) => updateClock(idx, { label: e.target.value })}
            placeholder="Label"
            aria-label="Clock label"
            className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
          />
          <select
            value={clock.timezone}
            onChange={(e) => updateClock(idx, { timezone: e.target.value })}
            className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            aria-label="Clock timezone"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <input
            value={clock.format}
            onChange={(e) => updateClock(idx, { format: e.target.value })}
            className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            placeholder="%a %b %d %I:%M %p"
            aria-label="Clock format"
          />
          <button
            type="button"
            onClick={() => removeClock(idx)}
            className="px-2 py-1 bg-red-700 text-white rounded"
            aria-label="Remove clock"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addClock}
        className="px-3 py-1 bg-ub-grey text-ubt-grey rounded border border-ubt-cool-grey"
      >
        Add Clock
      </button>
    </div>
  );
}

