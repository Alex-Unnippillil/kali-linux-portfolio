import React, { useMemo, useState } from 'react';
import Head from 'next/head';
import apps from '../../apps.config';
import { useFocusMode } from '../../hooks/useFocusMode';
import { FocusAppOverride } from '../../types/focus';

const appLookup = new Map(apps.map(app => [app.id, app]));

const overrideModes: FocusAppOverride['mode'][] = [
  'inherit',
  'custom',
  'immediate',
  'mute',
];

const FocusModePage: React.FC = () => {
  const {
    enabled,
    setEnabled,
    schedule,
    addScheduleTime,
    removeScheduleTime,
    perAppOverrides,
    updateOverride,
    removeOverride,
    sessionMetrics,
  } = useFocusMode();

  const [newTime, setNewTime] = useState('09:00');
  const [overrideApp, setOverrideApp] = useState('');
  const [overrideMode, setOverrideMode] = useState<FocusAppOverride['mode']>('inherit');
  const [overrideTimeInput, setOverrideTimeInput] = useState('09:00');
  const [overrideTimes, setOverrideTimes] = useState<string[]>([]);
  const [perAppTimeInputs, setPerAppTimeInputs] = useState<Record<string, string>>({});

  const availableApps = useMemo(() => {
    const taken = new Set(Object.keys(perAppOverrides));
    return apps
      .filter(app => !taken.has(app.id))
      .map(app => ({ id: app.id, title: app.title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [perAppOverrides]);

  const sortedOverrides = useMemo(
    () =>
      Object.entries(perAppOverrides).sort((a, b) => {
        const aTitle = appLookup.get(a[0])?.title ?? a[0];
        const bTitle = appLookup.get(b[0])?.title ?? b[0];
        return aTitle.localeCompare(bTitle);
      }),
    [perAppOverrides]
  );

  const handleAddSchedule = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTime) return;
    addScheduleTime(newTime);
  };

  const handleAddOverride = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!overrideApp) return;
    const scheduleTimes = overrideMode === 'custom' ? overrideTimes : undefined;
    updateOverride(overrideApp, { mode: overrideMode, schedule: scheduleTimes });
    setOverrideApp('');
    setOverrideMode('inherit');
    setOverrideTimes([]);
    setOverrideTimeInput('09:00');
  };

  const handleAddOverrideTime = () => {
    if (!overrideTimeInput) return;
    setOverrideTimes(prev => {
      if (prev.includes(overrideTimeInput)) return prev;
      return [...prev, overrideTimeInput].sort();
    });
  };

  const handleRemoveOverrideTime = (time: string) => {
    setOverrideTimes(prev => prev.filter(item => item !== time));
  };

  const formatTime = (time?: number | null) => {
    if (!time) return '—';
    try {
      return new Date(time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const sessionDuration = useMemo(() => {
    if (!sessionMetrics.startedAt) return '—';
    const seconds = Math.max(0, Math.floor((Date.now() - sessionMetrics.startedAt) / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }, [sessionMetrics.startedAt]);

  const handlePerAppTimeChange = (appId: string, value: string) => {
    setPerAppTimeInputs(prev => ({ ...prev, [appId]: value }));
  };

  const handlePerAppTimeAdd = (appId: string, existing: FocusAppOverride, value: string) => {
    if (!value) return;
    const nextTimes = [...(existing.schedule ?? []), value];
    updateOverride(appId, { mode: 'custom', schedule: nextTimes });
    setPerAppTimeInputs(prev => ({ ...prev, [appId]: '09:00' }));
  };

  const handlePerAppTimeRemove = (appId: string, existing: FocusAppOverride, time: string) => {
    const nextTimes = (existing.schedule ?? []).filter(item => item !== time);
    updateOverride(appId, {
      mode: nextTimes.length ? 'custom' : 'inherit',
      schedule: nextTimes,
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-ub-grey text-white">
      <Head>
        <title>Focus Mode</title>
      </Head>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Focus mode control center</h1>
          <p className="text-sm text-gray-300">
            Configure summary delivery windows, per-app overrides, and review telemetry to ensure your focus sessions stay
            interruption-free.
          </p>
        </header>

        <section className="rounded-lg border border-gray-700 bg-black/30 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Focus session</h2>
              <p className="text-sm text-gray-300">
                When enabled, non-critical notifications are bundled and released on your schedule.
              </p>
            </div>
            <label className="inline-flex items-center gap-2">
              <span className="text-sm text-gray-300">{enabled ? 'Enabled' : 'Disabled'}</span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={event => setEnabled(event.target.checked)}
                className="h-5 w-10 cursor-pointer appearance-none rounded-full bg-gray-600 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ backgroundColor: enabled ? '#2563eb' : undefined }}
              />
            </label>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div className="rounded border border-gray-700 bg-black/40 p-3">
              <dt className="text-xs uppercase tracking-wide text-gray-400">Suppressed</dt>
              <dd className="mt-1 text-lg font-semibold">{sessionMetrics.suppressed}</dd>
            </div>
            <div className="rounded border border-gray-700 bg-black/40 p-3">
              <dt className="text-xs uppercase tracking-wide text-gray-400">Delivered summaries</dt>
              <dd className="mt-1 text-lg font-semibold">{sessionMetrics.delivered}</dd>
            </div>
            <div className="rounded border border-gray-700 bg-black/40 p-3">
              <dt className="text-xs uppercase tracking-wide text-gray-400">Last summary</dt>
              <dd className="mt-1 text-lg font-semibold">{formatTime(sessionMetrics.lastSummaryAt)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-gray-400">Current session runtime: {sessionDuration}</p>
        </section>

        <section className="rounded-lg border border-gray-700 bg-black/30 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Summary schedule</h2>
              <p className="text-sm text-gray-300">
                Summaries are released at these times while focus mode is active.
              </p>
            </div>
          </div>
          <form onSubmit={handleAddSchedule} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-gray-300">Add time</span>
              <input
                type="time"
                value={newTime}
                onChange={event => setNewTime(event.target.value)}
                className="rounded border border-gray-600 bg-black/50 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Add window
            </button>
          </form>
          <ul className="mt-4 flex flex-wrap gap-3 text-sm">
            {schedule.length === 0 && <li className="text-gray-400">No windows configured. Add at least one time to receive summaries.</li>}
            {schedule.map(time => (
              <li key={time} className="flex items-center gap-2 rounded border border-gray-600 bg-black/40 px-3 py-1">
                <span>{time}</span>
                <button
                  type="button"
                  onClick={() => removeScheduleTime(time)}
                  className="text-xs text-gray-300 transition hover:text-white focus:outline-none focus:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-gray-700 bg-black/30 p-5">
          <h2 className="text-lg font-semibold">Per-app overrides</h2>
          <p className="text-sm text-gray-300">
            Override the global schedule for specific apps. Choose immediate delivery, muting, or a custom schedule.
          </p>

          <form onSubmit={handleAddOverride} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr_auto]">
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-gray-300">Application</span>
              <select
                value={overrideApp}
                onChange={event => setOverrideApp(event.target.value)}
                className="rounded border border-gray-600 bg-black/50 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
              >
                <option value="">Select an app</option>
                {availableApps.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm">
              <span className="mb-1 text-gray-300">Delivery</span>
              <select
                value={overrideMode}
                onChange={event => {
                  const value = event.target.value as FocusAppOverride['mode'];
                  setOverrideMode(value);
                  if (value !== 'custom') {
                    setOverrideTimes([]);
                  }
                }}
                className="rounded border border-gray-600 bg-black/50 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
              >
                {overrideModes.map(mode => (
                  <option key={mode} value={mode}>
                    {mode === 'inherit' && 'Follow summary schedule'}
                    {mode === 'custom' && 'Custom summary times'}
                    {mode === 'immediate' && 'Deliver immediately'}
                    {mode === 'mute' && 'Mute during focus'}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="self-end rounded bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:bg-gray-600"
              disabled={!overrideApp}
            >
              Save override
            </button>
          </form>

          {overrideMode === 'custom' && (
            <div className="mt-3 rounded border border-gray-700 bg-black/40 p-3">
              <h3 className="text-sm font-semibold">Custom times for new override</h3>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex flex-col text-sm">
                  <span className="mb-1 text-gray-300">Time</span>
                  <input
                    type="time"
                    value={overrideTimeInput}
                    onChange={event => setOverrideTimeInput(event.target.value)}
                    className="rounded border border-gray-600 bg-black/50 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAddOverrideTime}
                  className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  Add time
                </button>
              </div>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                {overrideTimes.length === 0 && <li className="text-gray-400">No custom times yet.</li>}
                {overrideTimes.map(time => (
                  <li key={time} className="flex items-center gap-2 rounded border border-gray-600 bg-black/30 px-3 py-1">
                    <span>{time}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOverrideTime(time)}
                      className="text-xs text-gray-300 transition hover:text-white focus:outline-none focus:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 space-y-4">
            {sortedOverrides.length === 0 && (
              <p className="text-sm text-gray-400">No overrides configured yet.</p>
            )}
            {sortedOverrides.map(([appId, override]) => {
              const appMeta = appLookup.get(appId);
              const perAppValue = perAppTimeInputs[appId] ?? '09:00';
              const scheduleTimes = override.schedule ?? [];
              return (
                <div key={appId} className="rounded border border-gray-700 bg-black/30 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{appMeta?.title ?? appId}</h3>
                      <p className="text-xs text-gray-400">Override: {override.mode}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-300">
                        <span className="sr-only">Delivery mode</span>
                        <select
                          value={override.mode}
                          onChange={event => {
                            const mode = event.target.value as FocusAppOverride['mode'];
                            updateOverride(appId, {
                              mode,
                              schedule: mode === 'custom' ? scheduleTimes : undefined,
                            });
                          }}
                          className="rounded border border-gray-600 bg-black/50 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                        >
                          {overrideModes.map(mode => (
                            <option key={mode} value={mode}>
                              {mode === 'inherit' && 'Follow summary schedule'}
                              {mode === 'custom' && 'Custom summary times'}
                              {mode === 'immediate' && 'Deliver immediately'}
                              {mode === 'mute' && 'Mute during focus'}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeOverride(appId)}
                        className="rounded bg-red-600 px-3 py-2 text-sm font-medium transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {override.mode === 'custom' && (
                    <div className="mt-3 rounded border border-gray-700 bg-black/40 p-3 text-sm">
                      <h4 className="font-medium">Custom schedule</h4>
                      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label className="flex flex-col text-sm">
                          <span className="mb-1 text-gray-300">Add time</span>
                          <input
                            type="time"
                            value={perAppValue}
                            onChange={event => handlePerAppTimeChange(appId, event.target.value)}
                            className="rounded border border-gray-600 bg-black/50 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handlePerAppTimeAdd(appId, override, perAppValue)}
                          className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          Add
                        </button>
                      </div>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {scheduleTimes.length === 0 && <li className="text-gray-400">No custom times configured.</li>}
                        {scheduleTimes.map(time => (
                          <li key={time} className="flex items-center gap-2 rounded border border-gray-600 bg-black/30 px-3 py-1">
                            <span>{time}</span>
                            <button
                              type="button"
                              onClick={() => handlePerAppTimeRemove(appId, override, time)}
                              className="text-xs text-gray-300 transition hover:text-white focus:outline-none focus:underline"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FocusModePage;
