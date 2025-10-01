'use client';

import { useUnitPreferences } from '../../../hooks/useSettings';
import { getTemperatureUnit } from '../../../utils/unitFormat';

const measurementOptions = [
  { value: 'metric' as const, label: 'Metric', description: '°C, meters, kB' },
  { value: 'imperial' as const, label: 'Imperial', description: '°F, miles, KiB' },
];

const timeOptions = [
  { value: '24h' as const, label: '24-hour clock' },
  { value: '12h' as const, label: '12-hour clock' },
];

export default function UnitsPanel() {
  const {
    measurementSystem,
    setMeasurementSystem,
    timeFormat,
    setTimeFormat,
  } = useUnitPreferences();

  return (
    <section className="my-4 flex flex-col items-center text-ubt-grey">
      <fieldset className="w-full max-w-md rounded-lg border border-ubt-cool-grey/60 bg-ub-cool-grey/40 p-4">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-ubt-grey/80">
          Units &amp; time
        </legend>
        <div className="mb-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-ubt-grey/70">
            Measurement system
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {measurementOptions.map((option) => (
              <label
                key={option.value}
                className={`flex flex-1 cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm transition-colors ${
                  measurementSystem === option.value
                    ? 'border-ub-orange bg-ub-orange/10 text-white'
                    : 'border-transparent bg-black/20 hover:border-ubt-cool-grey/60'
                }`}
              >
                <input
                  type="radio"
                  name="measurement-system"
                  value={option.value}
                  checked={measurementSystem === option.value}
                  onChange={() => setMeasurementSystem(option.value)}
                  className="h-4 w-4 accent-ub-orange"
                />
                <span>
                  <span className="block font-semibold">{option.label}</span>
                  <span className="block text-xs text-ubt-grey/70">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-ubt-grey/70">
            Weather and analytics widgets immediately reflect your choice. Current display:{' '}
            <strong>
              {measurementSystem === 'imperial' ? 'Imperial' : 'Metric'}{' '}
              ({getTemperatureUnit(measurementSystem)})
            </strong>
            .
          </p>
        </div>
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-ubt-grey/70">Clock format</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {timeOptions.map((option) => (
              <label
                key={option.value}
                className={`flex flex-1 cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm transition-colors ${
                  timeFormat === option.value
                    ? 'border-ub-orange bg-ub-orange/10 text-white'
                    : 'border-transparent bg-black/20 hover:border-ubt-cool-grey/60'
                }`}
              >
                <input
                  type="radio"
                  name="time-format"
                  value={option.value}
                  checked={timeFormat === option.value}
                  onChange={() => setTimeFormat(option.value)}
                  className="h-4 w-4 accent-ub-orange"
                />
                <span className="font-semibold">{option.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-ubt-grey/70">
            Dock clocks, charts, and sunrise/sunset displays follow this preference instantly.
          </p>
        </div>
      </fieldset>
    </section>
  );
}
