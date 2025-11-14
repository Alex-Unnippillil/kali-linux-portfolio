'use client';

import { useEffect, useState } from 'react';
import ToggleSwitch from '../../../components/ToggleSwitch';
import usePersistentState from '../../../hooks/usePersistentState';
import { publish } from '../../../utils/pubsub';

interface DateTimeSettings {
  timeZone: string;
  hour12: boolean;
  showSeconds: boolean;
  firstDayOfWeek: number;
}

const defaults: DateTimeSettings = {
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  hour12: Intl.DateTimeFormat().resolvedOptions().hour12 ?? true,
  showSeconds: false,
  firstDayOfWeek: 0,
};

const timeZones =
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : [defaults.timeZone];

const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function DateTimeSettings() {
  const [settings, setSettings] = usePersistentState<DateTimeSettings>(
    'settings.datetime',
    { ...defaults },
  );

  const update = (patch: Partial<DateTimeSettings>) =>
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      publish('settings.datetime', next);
      return next;
    });

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(
      () => setNow(new Date()),
      settings.showSeconds ? 1000 : 60000,
    );
    return () => clearInterval(interval);
  }, [settings.showSeconds]);

  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone: settings.timeZone,
    hour12: settings.hour12,
    hour: 'numeric',
    minute: 'numeric',
    ...(settings.showSeconds ? { second: 'numeric' } : {}),
  });

  return (
    <div className="p-4 space-y-4 text-ubt-grey">
      <div>
        <label htmlFor="timezone" className="mr-2">
          Time zone:
        </label>
        <select
          id="timezone"
          value={settings.timeZone}
          onChange={(e) => update({ timeZone: e.target.value })}
          className="bg-ub-cool-grey text-white px-2 py-1 rounded"
        >
          {timeZones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <span>Use 12-hour clock</span>
        <ToggleSwitch
          checked={settings.hour12}
          onChange={(v) => update({ hour12: v })}
          ariaLabel="Toggle 12-hour clock"
        />
      </div>
      <div className="flex items-center justify-between">
        <span>Show seconds</span>
        <ToggleSwitch
          checked={settings.showSeconds}
          onChange={(v) => update({ showSeconds: v })}
          ariaLabel="Toggle seconds display"
        />
      </div>
      <div>
        <label htmlFor="first-day" className="mr-2">
          First day of week:
        </label>
        <select
          id="first-day"
          value={settings.firstDayOfWeek}
          onChange={(e) => update({ firstDayOfWeek: parseInt(e.target.value, 10) })}
          className="bg-ub-cool-grey text-white px-2 py-1 rounded"
        >
          {days.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 text-center text-xl">
        {formatter.format(now)}
      </div>
    </div>
  );
}

