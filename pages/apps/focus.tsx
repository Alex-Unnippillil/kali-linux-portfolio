import React, { FormEvent, useMemo, useState } from 'react';
import apps from '../../apps.config';
import {
  FocusOverrideMode,
  useFocusMode,
} from '../../hooks/useFocusMode';

interface AppListItem {
  id: string;
  title: string;
}

const formatTimeDisplay = (time: string): string => {
  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10));
  const date = new Date();
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const formatTimestamp = (timestamp: number | null): string => {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  return `${new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)} (${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)})`;
};

const overrideOptions: { value: FocusOverrideMode; label: string }[] = [
  { value: 'bundle', label: 'Bundle into scheduled summary' },
  { value: 'immediate', label: 'Deliver immediately' },
];

const FocusModeSettings: React.FC = () => {
  const {
    settings,
    isFocusModeActive,
    setFocusModeActive,
    addScheduleTime,
    removeScheduleTime,
    updateOverride,
    setQuietToasts,
    deliverSummaryNow,
    nextSummaryTime,
    lastSummaryTime,
    queueLength,
  } = useFocusMode();

  const [timeInput, setTimeInput] = useState('');
  const [filter, setFilter] = useState('');

  const availableApps = useMemo<AppListItem[]>(() => {
    const map = new Map<string, AppListItem>();
    apps.forEach((app: any) => {
      if (app?.id && !map.has(app.id) && !app.disabled) {
        map.set(app.id, { id: app.id, title: app.title });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }, []);

  const filteredApps = useMemo(() => {
    if (!filter) return availableApps;
    const lower = filter.toLowerCase();
    return availableApps.filter(
      (app) =>
        app.title.toLowerCase().includes(lower) ||
        app.id.toLowerCase().includes(lower)
    );
  }, [availableApps, filter]);

  const handleAddTime = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!timeInput) return;
    addScheduleTime(timeInput);
    setTimeInput('');
  };

  const handleOverrideChange = (appId: string, value: string) => {
    updateOverride(appId, value as FocusOverrideMode);
  };

  const handleToggleFocus = () => {
    setFocusModeActive(!isFocusModeActive);
  };

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto bg-ub-cool-grey p-6 text-white">
      <header>
        <h1 className="text-2xl font-semibold">Focus Mode</h1>
        <p className="mt-1 text-sm text-ubt-grey">
          Schedule summary deliveries for non-critical notifications and keep
          focus sessions interruption-free.
        </p>
      </header>

      <section className="grid gap-4 rounded-lg bg-black/40 p-4 sm:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Session status</h2>
          <p className="mt-1 text-sm text-ubt-grey">
            Focus mode is{' '}
            <span className="font-medium text-white">
              {isFocusModeActive ? 'active' : 'paused'}
            </span>
            .
          </p>
          <button
            onClick={handleToggleFocus}
            className="mt-3 rounded bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {isFocusModeActive ? 'End focus session' : 'Start focus session'}
          </button>
          <div className="mt-4 grid gap-2 text-sm text-ubt-grey">
            <div>
              Next summary:{' '}
              <span className="text-white">
                {nextSummaryTime ? formatTimestamp(nextSummaryTime) : '—'}
              </span>
            </div>
            <div>
              Last summary:{' '}
              <span className="text-white">{formatTimestamp(lastSummaryTime)}</span>
            </div>
            <div>
              Queued notifications:{' '}
              <span className="text-white">{queueLength}</span>
            </div>
          </div>
          <button
            onClick={deliverSummaryNow}
            disabled={queueLength === 0}
            className="mt-3 rounded border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/40"
          >
            Deliver summary now
          </button>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Quiet alerts</h2>
          <p className="mt-1 text-sm text-ubt-grey">
            Silence toast popups and sounds while focus mode is active.
          </p>
          <label className="mt-3 flex w-fit items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={settings.quietToasts}
              onChange={(event) => setQuietToasts(event.target.checked)}
              className="h-4 w-4"
            />
            Keep toasts quiet during focus
          </label>
        </div>
      </section>

      <section className="rounded-lg bg-black/40 p-4">
        <h2 className="text-lg font-semibold">Summary schedule</h2>
        <p className="mt-1 text-sm text-ubt-grey">
          Choose when focus summaries are delivered. Notifications collected
          between these times will be bundled together.
        </p>
        <form
          onSubmit={handleAddTime}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="time"
            value={timeInput}
            onChange={(event) => setTimeInput(event.target.value)}
            className="w-full rounded bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/60 sm:w-auto"
            aria-label="Add delivery time"
          />
          <button
            type="submit"
            className="rounded bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Add time
          </button>
        </form>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {settings.schedule.length === 0 && (
            <li className="text-sm text-ubt-grey">
              No summaries scheduled. Add at least one time to enable focus
              batching.
            </li>
          )}
          {settings.schedule.map((time) => (
            <li
              key={time}
              className="flex items-center justify-between rounded bg-white/5 px-3 py-2 text-sm"
            >
              <span>{formatTimeDisplay(time)}</span>
              <button
                onClick={() => removeScheduleTime(time)}
                className="text-xs text-red-300 hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg bg-black/40 p-4">
        <h2 className="text-lg font-semibold">Per-app overrides</h2>
        <p className="mt-1 text-sm text-ubt-grey">
          Override focus behavior for specific apps. Critical alerts can bypass
          bundling by choosing &ldquo;Deliver immediately&rdquo;.
        </p>
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter apps"
          className="mt-3 w-full rounded bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/60"
          aria-label="Filter apps"
        />
        <div className="mt-4 max-h-80 overflow-y-auto rounded border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th scope="col" className="px-3 py-2 text-left">
                  App
                </th>
                <th scope="col" className="px-3 py-2 text-left">
                  Delivery
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredApps.map((app) => {
                const override = settings.overrides[app.id] ?? 'bundle';
                return (
                  <tr key={app.id}>
                    <td className="px-3 py-2 text-white">{app.title}</td>
                    <td className="px-3 py-2">
                      <select
                        value={override}
                        onChange={(event) =>
                          handleOverrideChange(app.id, event.target.value)
                        }
                        className="w-full rounded bg-white/10 px-3 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-white/60"
                      >
                        {overrideOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default FocusModeSettings;
