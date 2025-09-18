import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import {
  FocusModeSettings,
  FocusAppOverride,
  formatSchedulePreview,
  sanitizeSummaryTimes,
} from '../../utils/focusSchedule';
import { logEvent } from '../../utils/analytics';

const CADENCE_OPTIONS = [15, 30, 45, 60, 90, 120];

const buildOverride = (base?: FocusAppOverride): FocusAppOverride => ({
  cadenceMinutes: base?.cadenceMinutes ?? 0,
  summaryTimes: base?.summaryTimes ?? [],
  deliverImmediately: base?.deliverImmediately ?? false,
});

const FocusModeApp = () => {
  const { focusMode, setFocusMode } = useSettings();
  const [draft, setDraft] = useState<FocusModeSettings>(focusMode);
  const [newOverrideId, setNewOverrideId] = useState('');
  const [expandedOverride, setExpandedOverride] = useState<string | null>(null);

  useEffect(() => {
    setDraft(focusMode);
  }, [focusMode]);

  const commit = useCallback(
    (updater: (prev: FocusModeSettings) => FocusModeSettings) => {
      setDraft(prev => {
        const next = updater(prev);
        setFocusMode(next);
        return next;
      });
    },
    [setFocusMode],
  );

  const toggleFocus = useCallback(() => {
    commit(prev => {
      const next = { ...prev, enabled: !prev.enabled };
      logEvent({
        category: 'focus-mode',
        action: next.enabled ? 'enabled' : 'disabled',
      });
      return next;
    });
  }, [commit]);

  const updateCadence = useCallback(
    (minutes: number) => {
      commit(prev => ({ ...prev, defaultCadenceMinutes: minutes }));
    },
    [commit],
  );

  const updateSummaryTime = useCallback(
    (index: number, value: string) => {
      commit(prev => {
        const times = [...prev.summaryTimes];
        times[index] = value;
        return {
          ...prev,
          summaryTimes: sanitizeSummaryTimes(times),
        };
      });
    },
    [commit],
  );

  const addSummaryTime = useCallback(() => {
    commit(prev => ({
      ...prev,
      summaryTimes: sanitizeSummaryTimes([...prev.summaryTimes, '09:00']),
    }));
  }, [commit]);

  const removeSummaryTime = useCallback(
    (index: number) => {
      commit(prev => ({
        ...prev,
        summaryTimes: prev.summaryTimes.filter((_, i) => i !== index),
      }));
    },
    [commit],
  );

  const toggleQueue = useCallback(() => {
    commit(prev => {
      const next = { ...prev, queueNonCritical: !prev.queueNonCritical };
      logEvent({
        category: 'focus-mode',
        action: next.queueNonCritical ? 'queue-enabled' : 'queue-disabled',
      });
      return next;
    });
  }, [commit]);

  const toggleSilentToast = useCallback(() => {
    commit(prev => ({ ...prev, suppressToasts: !prev.suppressToasts }));
  }, [commit]);

  const addOverride = useCallback(() => {
    const trimmed = newOverrideId.trim();
    if (!trimmed) return;
    let added = false;
    commit(prev => {
      if (prev.overrides[trimmed]) return prev;
      added = true;
      return {
        ...prev,
        overrides: {
          ...prev.overrides,
          [trimmed]: buildOverride(),
        },
      };
    });
    setNewOverrideId('');
    if (trimmed && added) setExpandedOverride(trimmed);
  }, [commit, newOverrideId]);

  const removeOverride = useCallback(
    (id: string) => {
      commit(prev => {
        if (!prev.overrides[id]) return prev;
        const overrides = { ...prev.overrides };
        delete overrides[id];
        return { ...prev, overrides };
      });
      if (expandedOverride === id) setExpandedOverride(null);
    },
    [commit, expandedOverride],
  );

  const updateOverride = useCallback(
    (id: string, changes: Partial<FocusAppOverride>) => {
      commit(prev => {
        const base = buildOverride(prev.overrides[id]);
        const summaryTimes =
          changes.summaryTimes !== undefined
            ? sanitizeSummaryTimes(changes.summaryTimes)
            : base.summaryTimes;
        const updated: FocusAppOverride = {
          ...base,
          ...changes,
          summaryTimes,
        };
        return {
          ...prev,
          overrides: {
            ...prev.overrides,
            [id]: updated,
          },
        };
      });
    },
    [commit],
  );

  const nextDefaultSummary = useMemo(
    () => formatSchedulePreview(draft, '__default__'),
    [draft],
  );

  return (
    <div className="p-6 space-y-6 text-white">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Focus sessions</h1>
        <p className="text-sm text-gray-300">
          Keep distractions low by batching non-critical alerts into summaries and
          choosing which apps are allowed to break through.
        </p>
      </header>

      <section className="bg-ub-grey bg-opacity-80 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Focus mode</h2>
            <p className="text-sm text-gray-300">
              When enabled, non-critical notifications are queued and delivered
              as scheduled summaries.
            </p>
          </div>
          <button
            className={`px-4 py-2 rounded ${
              draft.enabled ? 'bg-green-500 text-black' : 'bg-gray-700'
            }`}
            type="button"
            onClick={toggleFocus}
          >
            {draft.enabled ? 'Disable' : 'Enable'}
          </button>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-gray-300">Default summary cadence</dt>
            <dd className="mt-1 flex items-center space-x-2">
              <select
                value={draft.defaultCadenceMinutes}
                onChange={e => updateCadence(Number(e.target.value))}
                className="bg-black bg-opacity-30 px-2 py-1 rounded border border-gray-700"
              >
                {CADENCE_OPTIONS.map(value => (
                  <option key={value} value={value}>
                    Every {value} minutes
                  </option>
                ))}
              </select>
              <span className="text-gray-400">Next summary around {nextDefaultSummary}</span>
            </dd>
          </div>
          <div>
            <dt className="text-gray-300">Queue notifications</dt>
            <dd className="mt-1">
                <label className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={draft.queueNonCritical}
                    onChange={toggleQueue}
                    aria-label="Queue non-critical notifications"
                  />
                  <span>Pause non-critical toasts until summaries fire</span>
                </label>
            </dd>
          </div>
          <div>
            <dt className="text-gray-300">Silence toast popups</dt>
            <dd className="mt-1">
                <label className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={draft.suppressToasts}
                    onChange={toggleSilentToast}
                    aria-label="Hide toast banners during focus"
                  />
                  <span>Hide banners while focus is active</span>
                </label>
            </dd>
          </div>
        </dl>

        <div className="space-y-2">
          <h3 className="text-md font-medium">Scheduled delivery times</h3>
          <p className="text-sm text-gray-300">
            Optional times of day to release summaries. Leave empty to only use
            the cadence.
          </p>
          <div className="space-y-2">
            {draft.summaryTimes.map((time, index) => (
              <div key={`${time}-${index}`} className="flex space-x-2">
                <input
                  type="time"
                  value={time}
                  aria-label={`Summary time ${index + 1}`}
                  onChange={e => updateSummaryTime(index, e.target.value)}
                  className="bg-black bg-opacity-30 px-2 py-1 rounded border border-gray-700"
                />
                <button
                  type="button"
                  className="px-3 py-1 bg-red-600 rounded"
                  onClick={() => removeSummaryTime(index)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="px-3 py-1 bg-gray-700 rounded"
              onClick={addSummaryTime}
            >
              Add summary time
            </button>
          </div>
        </div>
      </section>

      <section className="bg-ub-grey bg-opacity-80 rounded-lg p-4 space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-medium">Per-app overrides</h2>
          <p className="text-sm text-gray-300">
            Give individual apps their own schedule, or let important apps break
            through immediately.
          </p>
        </header>

        <div className="flex space-x-2">
          <input
            value={newOverrideId}
            onChange={event => setNewOverrideId(event.target.value)}
            placeholder="App identifier"
            className="flex-1 bg-black bg-opacity-30 px-2 py-1 rounded border border-gray-700"
            type="text"
            aria-label="Override app identifier"
          />
          <button
            type="button"
            className="px-3 py-1 bg-gray-700 rounded"
            onClick={addOverride}
          >
            Add override
          </button>
        </div>

        {Object.entries(draft.overrides).length === 0 && (
          <p className="text-sm text-gray-300">
            No overrides configured yet. Add an app ID to customize its
            delivery.
          </p>
        )}

        <div className="space-y-3">
          {Object.entries(draft.overrides).map(([id, override]) => {
            const nextSummary = formatSchedulePreview(draft, id);
            const expanded = expandedOverride === id;
            return (
              <article
                key={id}
                className="bg-black bg-opacity-30 border border-gray-700 rounded-lg"
              >
                <header
                  className="flex items-center justify-between px-4 py-3 cursor-pointer"
                  onClick={() =>
                    setExpandedOverride(expanded ? null : id)
                  }
                >
                  <div>
                    <h3 className="font-medium">{id}</h3>
                    <p className="text-xs text-gray-400">
                      Next summary around {nextSummary}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {override.deliverImmediately && (
                      <span className="text-xs uppercase tracking-wide text-green-300">
                        Breakthrough
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        removeOverride(id);
                      }}
                      className="px-2 py-1 bg-red-600 rounded"
                    >
                      Remove
                    </button>
                  </div>
                </header>
                {expanded && (
                  <div className="px-4 pb-4 space-y-3 text-sm">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={override.deliverImmediately ?? false}
                          onChange={event =>
                            updateOverride(id, {
                              deliverImmediately: event.target.checked,
                            })
                          }
                          aria-label={`Deliver ${id} notifications immediately`}
                        />
                        <span>Deliver immediately (bypass summaries)</span>
                      </label>

                    <div>
                      <span className="block text-gray-300">
                        Custom cadence
                      </span>
                      <select
                        value={override.cadenceMinutes ?? 0}
                        onChange={event =>
                          updateOverride(id, {
                            cadenceMinutes: Number(event.target.value),
                          })
                        }
                        className="mt-1 bg-black bg-opacity-30 px-2 py-1 rounded border border-gray-700"
                      >
                        <option value={0}>Inherit global cadence</option>
                        {CADENCE_OPTIONS.map(value => (
                          <option key={value} value={value}>
                            Every {value} minutes
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <span className="block text-gray-300">
                        Custom delivery times
                      </span>
                      {(override.summaryTimes ?? []).map((time, index) => (
                        <div className="flex space-x-2" key={`${id}-${time}-${index}`}>
                          <input
                            type="time"
                            value={time}
                            aria-label={`Custom summary time ${index + 1} for ${id}`}
                            onChange={event => {
                              const updated = [...(override.summaryTimes ?? [])];
                              updated[index] = event.target.value;
                              updateOverride(id, {
                                summaryTimes: updated,
                              });
                            }}
                            className="bg-black bg-opacity-30 px-2 py-1 rounded border border-gray-700"
                          />
                          <button
                            type="button"
                            className="px-3 py-1 bg-red-600 rounded"
                            onClick={() => {
                              const updated = (override.summaryTimes ?? []).filter(
                                (_, i) => i !== index,
                              );
                              updateOverride(id, {
                                summaryTimes: updated,
                              });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="px-3 py-1 bg-gray-700 rounded"
                        onClick={() => {
                          const updated = [...(override.summaryTimes ?? []), '09:00'];
                          updateOverride(id, {
                            summaryTimes: updated,
                          });
                        }}
                      >
                        Add delivery time
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default FocusModeApp;
