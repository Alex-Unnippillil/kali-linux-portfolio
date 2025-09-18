'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Modal from '../../base/Modal';
import {
  SCHEDULER_EVENT,
  addPreferredWindow,
  getPreferredWindows,
  getQuietHours,
  getPendingDeferredRestart,
  getScheduledRestarts,
  removePreferredWindow,
  removeScheduledRestart,
  rescheduleRestart,
  scheduleRestart,
  setQuietHours,
  type QuietHoursPreference,
  type RestartDraft,
  type RestartWindow,
  type ScheduledRestart,
} from '../../../utils/updateScheduler';

const DAY_OPTIONS = [
  { value: 0, label: 'Sun', full: 'Sunday' },
  { value: 1, label: 'Mon', full: 'Monday' },
  { value: 2, label: 'Tue', full: 'Tuesday' },
  { value: 3, label: 'Wed', full: 'Wednesday' },
  { value: 4, label: 'Thu', full: 'Thursday' },
  { value: 5, label: 'Fri', full: 'Friday' },
  { value: 6, label: 'Sat', full: 'Saturday' },
] as const;

const MINUTES_IN_DAY = 24 * 60;

const padTime = (value: number) => value.toString().padStart(2, '0');

const formatTimeValue = (minutes: number) => {
  const safe = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${padTime(hours)}:${padTime(mins)}`;
};

const parseTimeValue = (value: string) => {
  if (!value) return 0;
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number.parseInt(hoursRaw ?? '0', 10);
  const minutes = Number.parseInt(minutesRaw ?? '0', 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  const total = hours * 60 + minutes;
  return ((total % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
};

const formatDateTimeInput = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}T${padTime(
    date.getHours(),
  )}:${padTime(date.getMinutes())}`;
};

const formatDateTimeReadable = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `restart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const formatWindowDays = (window: RestartWindow) => {
  if (window.days.length === 0 || window.days.length === 7) return 'Daily';
  const sorted = window.days.slice().sort((a, b) => a - b);
  const weekdays = [1, 2, 3, 4, 5];
  const weekends = [0, 6];
  if (sorted.length === weekdays.length && weekdays.every((day) => sorted.includes(day))) {
    return 'Weekdays';
  }
  if (sorted.length === weekends.length && weekends.every((day) => sorted.includes(day))) {
    return 'Weekend';
  }
  return sorted
    .map((day) => DAY_OPTIONS.find((opt) => opt.value === day)?.label ?? day.toString())
    .join(', ');
};

const describeWindow = (window: RestartWindow) =>
  `${formatWindowDays(window)} • ${formatTimeValue(window.startMinutes)} – ${formatTimeValue(
    window.endMinutes,
  )}`;

const UpdateCenter = () => {
  const [quietHours, setQuietHoursState] = useState<QuietHoursPreference | null>(null);
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('06:00');
  const [quietStatus, setQuietStatus] = useState<string | null>(null);
  const [quietError, setQuietError] = useState<string | null>(null);

  const [windows, setWindows] = useState<RestartWindow[]>([]);
  const [windowMessage, setWindowMessage] = useState<string | null>(null);
  const [windowError, setWindowError] = useState<string | null>(null);
  const [newWindowLabel, setNewWindowLabel] = useState('');
  const [newWindowStart, setNewWindowStart] = useState('02:00');
  const [newWindowEnd, setNewWindowEnd] = useState('04:00');
  const [newWindowDays, setNewWindowDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [restarts, setRestarts] = useState<ScheduledRestart[]>([]);
  const [restartMessage, setRestartMessage] = useState<string | null>(null);
  const [restartError, setRestartError] = useState<string | null>(null);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [selectedRestart, setSelectedRestart] = useState<ScheduledRestart | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState('');
  const [rescheduleWindowId, setRescheduleWindowId] = useState<string>('custom');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const windowLookup = useMemo(() => new Map(windows.map((entry) => [entry.id, entry])), [windows]);

  const refreshState = useCallback(async () => {
    try {
      setLoadError(null);
      const [quiet, storedWindows, storedRestarts] = await Promise.all([
        getQuietHours(),
        getPreferredWindows(),
        getScheduledRestarts(),
      ]);
      setQuietHoursState(quiet);
      setQuietEnabled(quiet.enabled);
      setQuietStart(formatTimeValue(quiet.startMinutes));
      setQuietEnd(formatTimeValue(quiet.endMinutes));
      setWindows(storedWindows);
      setRestarts(storedRestarts);
      setLoading(false);
    } catch {
      setLoadError('Unable to load update preferences. Please try again.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await refreshState();
      if (!active) return;
      try {
        const deferred = await getPendingDeferredRestart();
        if (deferred) {
          setRestartMessage(
            `Deferred restart pending for ${formatDateTimeReadable(deferred.scheduledTime)}.`,
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshState]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = () => {
      void refreshState();
    };
    window.addEventListener(SCHEDULER_EVENT, handler);
    return () => window.removeEventListener(SCHEDULER_EVENT, handler);
  }, [refreshState]);

  useEffect(() => {
    if (!quietStatus) return;
    const timer = window.setTimeout(() => setQuietStatus(null), 4000);
    return () => window.clearTimeout(timer);
  }, [quietStatus]);

  useEffect(() => {
    if (!windowMessage) return;
    const timer = window.setTimeout(() => setWindowMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [windowMessage]);

  useEffect(() => {
    if (!restartMessage) return;
    const timer = window.setTimeout(() => setRestartMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [restartMessage]);

  useEffect(() => {
    if (!selectedRestart) return;
    setRescheduleValue(formatDateTimeInput(selectedRestart.scheduledTime));
    setRescheduleWindowId(selectedRestart.windowId ?? 'custom');
    setRescheduleNote(selectedRestart.notes ?? '');
    setRescheduleError(null);
  }, [selectedRestart]);

  const toggleDay = (day: number) => {
    setNewWindowDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((entry) => entry !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const handleSaveQuietHours = async () => {
    try {
      setQuietError(null);
      const payload: QuietHoursPreference = {
        enabled: quietEnabled,
        startMinutes: parseTimeValue(quietStart),
        endMinutes: parseTimeValue(quietEnd),
      };
      const updated = await setQuietHours(payload);
      setQuietHoursState(updated);
      setQuietStart(formatTimeValue(updated.startMinutes));
      setQuietEnd(formatTimeValue(updated.endMinutes));
      setQuietEnabled(updated.enabled);
      setQuietStatus('Quiet hours saved');
    } catch {
      setQuietError('Failed to save quiet hours');
    }
  };

  const handleAddWindow = async () => {
    setWindowError(null);
    setWindowMessage(null);
    if (!newWindowLabel.trim()) {
      setWindowError('Enter a name for the window.');
      return;
    }
    if (newWindowDays.length === 0) {
      setWindowError('Select at least one day.');
      return;
    }
    try {
      const entry: RestartWindow = {
        id: generateId(),
        label: newWindowLabel.trim(),
        days: newWindowDays.slice().sort((a, b) => a - b),
        startMinutes: parseTimeValue(newWindowStart),
        endMinutes: parseTimeValue(newWindowEnd),
      };
      const updated = await addPreferredWindow(entry);
      setWindows(updated);
      setWindowMessage('Restart window saved');
      setNewWindowLabel('');
    } catch {
      setWindowError('Failed to save restart window');
    }
  };

  const handleRemoveWindow = async (id: string) => {
    try {
      const updated = await removePreferredWindow(id);
      setWindows(updated);
    } catch {
      setWindowError('Unable to remove window');
    }
  };

  const handleRescheduleClick = (restart: ScheduledRestart) => {
    setSelectedRestart(restart);
    setRescheduleOpen(true);
  };

  const closeReschedule = () => {
    setRescheduleOpen(false);
    setSelectedRestart(null);
    setRescheduleValue('');
    setRescheduleWindowId('custom');
    setRescheduleNote('');
    setRescheduleError(null);
  };

  const confirmReschedule = async () => {
    if (!selectedRestart) return;
    if (!rescheduleValue) {
      setRescheduleError('Choose a new date and time.');
      return;
    }
    const nextDate = new Date(rescheduleValue);
    if (Number.isNaN(nextDate.getTime())) {
      setRescheduleError('Enter a valid date and time.');
      return;
    }
    try {
      const updated = await rescheduleRestart(selectedRestart.id, nextDate.toISOString(), {
        windowId: rescheduleWindowId === 'custom' ? undefined : rescheduleWindowId,
        note: rescheduleNote.trim() || undefined,
      });
      setRestarts(updated);
      setRestartMessage('Restart rescheduled');
      closeReschedule();
    } catch {
      setRescheduleError('Unable to reschedule restart');
    }
  };

  const handleScheduleSample = async () => {
    try {
      setRestartError(null);
      const target = windows[0];
      const base = new Date();
      if (target) {
        const hours = Math.floor(target.startMinutes / 60);
        const minutes = target.startMinutes % 60;
        base.setHours(hours, minutes, 0, 0);
      } else {
        base.setHours(2, 0, 0, 0);
      }
      if (base.getTime() <= Date.now()) {
        base.setDate(base.getDate() + 1);
      }
      const draft: RestartDraft = {
        id: generateId(),
        label: `Maintenance window ${base.toLocaleDateString()}`,
        scheduledTime: base.toISOString(),
        status: 'scheduled',
        windowId: target?.id,
      };
      const updated = await scheduleRestart(draft);
      setRestarts(updated);
      setRestartMessage('Simulated maintenance scheduled');
    } catch {
      setRestartError('Unable to schedule a simulated restart');
    }
  };

  const handleRemoveRestart = async (id: string) => {
    try {
      const updated = await removeScheduledRestart(id);
      setRestarts(updated);
    } catch {
      setRestartError('Failed to update restart list');
    }
  };

  const upcomingRestarts = useMemo(() => {
    const now = Date.now();
    return restarts.filter((entry) => {
      const time = new Date(entry.scheduledTime).getTime();
      if (Number.isNaN(time)) return false;
      if (entry.status === 'cancelled' || entry.status === 'completed') return false;
      return time >= now;
    });
  }, [restarts]);

  const pastRestarts = useMemo(() => {
    const now = Date.now();
    return restarts.filter((entry) => {
      const time = new Date(entry.scheduledTime).getTime();
      if (Number.isNaN(time)) return false;
      return time < now || entry.status === 'completed' || entry.status === 'cancelled';
    });
  }, [restarts]);

  const deferredRestart = useMemo(
    () => upcomingRestarts.find((entry) => entry.status === 'deferred') ?? null,
    [upcomingRestarts],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-ub-cool-grey text-white">
        <p>Loading Update Center…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-ub-cool-grey text-white">
        <p className="text-red-400">{loadError}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void refreshState();
          }}
          className="mt-4 rounded border border-gray-600 px-4 py-2 text-sm hover:border-gray-400"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-white">
      <header className="border-b border-gray-900 px-6 py-4">
        <h1 className="text-2xl font-semibold">Update Center</h1>
        <p className="text-sm text-ubt-grey">
          Manage quiet hours, preferred restart windows, and upcoming maintenance.
        </p>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <section className="rounded-lg border border-gray-900 bg-black/30 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Quiet hours</h2>
                <p className="text-sm text-ubt-grey">
                  Automatic restarts are paused while quiet hours are active.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={quietEnabled}
                  onChange={() => setQuietEnabled((prev) => !prev)}
                  className="h-4 w-4"
                  aria-label="Toggle quiet hours"
                />
                <span>{quietEnabled ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col text-sm">
                <span className="mb-1 text-ubt-grey">Start time</span>
                <input
                  type="time"
                  value={quietStart}
                  onChange={(event) => setQuietStart(event.target.value)}
                  className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-orange-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col text-sm">
                <span className="mb-1 text-ubt-grey">End time</span>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(event) => setQuietEnd(event.target.value)}
                  className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-orange-400 focus:outline-none"
                />
              </label>
            </div>
            {quietHours && (
              <p className="mt-3 text-xs text-ubt-grey">
                Current range: {formatTimeValue(quietHours.startMinutes)} –{' '}
                {formatTimeValue(quietHours.endMinutes)}.
              </p>
            )}
            {quietError && <p className="mt-3 text-sm text-red-400">{quietError}</p>}
            {quietStatus && <p className="mt-3 text-sm text-green-400">{quietStatus}</p>}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveQuietHours}
                className="rounded bg-ub-orange px-4 py-2 text-sm text-white hover:bg-orange-500"
              >
                Save quiet hours
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-gray-900 bg-black/30 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Preferred restart windows</h2>
                <p className="text-sm text-ubt-grey">
                  Define when maintenance can reboot the system without interrupting your work.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {windows.length === 0 ? (
                <p className="text-sm text-ubt-grey">No preferred windows saved yet.</p>
              ) : (
                windows.map((window) => (
                  <div
                    key={window.id}
                    className="flex flex-col gap-3 rounded border border-gray-800 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-base font-medium">{window.label}</p>
                      <p className="text-xs text-ubt-grey">{describeWindow(window)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveWindow(window.id)}
                      className="self-start rounded border border-red-700 px-3 py-1 text-xs text-red-200 hover:border-red-500 hover:text-red-100"
                      aria-label={`Remove ${window.label}`}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 rounded-lg border border-dashed border-gray-700 bg-black/20 p-4">
              <h3 className="text-sm font-semibold text-ubt-grey">Add a new window</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col text-sm">
                  <span className="mb-1 text-ubt-grey">Name</span>
                  <input
                    type="text"
                    value={newWindowLabel}
                    onChange={(event) => setNewWindowLabel(event.target.value)}
                    className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-orange-400 focus:outline-none"
                    placeholder="Example: Weeknight window"
                  />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="mb-1 text-ubt-grey">Start</span>
                  <input
                    type="time"
                    value={newWindowStart}
                    onChange={(event) => setNewWindowStart(event.target.value)}
                    className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-orange-400 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="mb-1 text-ubt-grey">End</span>
                  <input
                    type="time"
                    value={newWindowEnd}
                    onChange={(event) => setNewWindowEnd(event.target.value)}
                    className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-orange-400 focus:outline-none"
                  />
                </label>
              </div>
              <div className="mt-3">
                <span className="text-xs uppercase tracking-wide text-ubt-grey">Days</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((day) => {
                    const selected = newWindowDays.includes(day.value);
                    return (
                      <button
                        type="button"
                        key={day.value}
                        onClick={() => toggleDay(day.value)}
                        className={`rounded border px-3 py-1 text-xs transition-colors ${
                          selected
                            ? 'border-ub-orange bg-ub-orange/20 text-ub-orange'
                            : 'border-gray-700 text-ubt-grey hover:border-gray-500 hover:text-white'
                        }`}
                        aria-pressed={selected}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {windowError && <p className="mt-3 text-sm text-red-400">{windowError}</p>}
              {windowMessage && <p className="mt-3 text-sm text-green-400">{windowMessage}</p>}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddWindow}
                  className="rounded bg-ub-green px-4 py-2 text-sm text-black hover:bg-green-400"
                >
                  Save window
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-900 bg-black/30 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Upcoming restarts</h2>
                <p className="text-sm text-ubt-grey">
                  Review scheduled maintenance and move it when plans change.
                </p>
              </div>
              <button
                type="button"
                onClick={handleScheduleSample}
                className="self-start rounded border border-gray-700 px-3 py-1 text-xs hover:border-ub-orange"
              >
                Schedule simulation
              </button>
            </div>
            {restartError && <p className="mt-3 text-sm text-red-400">{restartError}</p>}
            {restartMessage && <p className="mt-3 text-sm text-green-400">{restartMessage}</p>}
            {deferredRestart && (
              <div className="mt-4 rounded border border-yellow-800 bg-yellow-900/40 p-3 text-sm text-yellow-100">
                <p className="font-semibold">Deferred restart pending</p>
                <p className="mt-1 text-xs">
                  {deferredRestart.label} is deferred until{' '}
                  {formatDateTimeReadable(deferredRestart.scheduledTime)}.
                </p>
              </div>
            )}
            <div className="mt-4 space-y-4">
              {upcomingRestarts.length === 0 ? (
                <p className="text-sm text-ubt-grey">No restarts scheduled.</p>
              ) : (
                upcomingRestarts.map((restart) => {
                  const relatedWindow = restart.windowId
                    ? windowLookup.get(restart.windowId)
                    : undefined;
                  return (
                    <div
                      key={restart.id}
                      className="rounded border border-gray-800 bg-black/20 p-4 shadow"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-base font-semibold">{restart.label}</p>
                            <span
                              className={`rounded px-2 py-0.5 text-xs uppercase tracking-wide ${
                                restart.status === 'deferred'
                                  ? 'bg-yellow-900 text-yellow-200'
                                  : 'bg-ub-blue text-black'
                              }`}
                            >
                              {restart.status === 'deferred'
                                ? 'Deferred'
                                : restart.status === 'scheduled'
                                ? 'Scheduled'
                                : restart.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-ubt-grey">
                            {formatDateTimeReadable(restart.scheduledTime)}
                          </p>
                          {restart.deferredFrom && restart.status === 'deferred' && (
                            <p className="mt-1 text-xs text-yellow-200">
                              Previously planned for {formatDateTimeReadable(restart.deferredFrom)}
                            </p>
                          )}
                          {relatedWindow && (
                            <p className="mt-1 text-xs text-ubt-grey">
                              Window: {relatedWindow.label} ({describeWindow(relatedWindow)})
                            </p>
                          )}
                          {restart.notes && (
                            <p className="mt-1 text-xs text-ubt-grey">Note: {restart.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 text-sm">
                          <button
                            type="button"
                            onClick={() => handleRescheduleClick(restart)}
                            className="rounded bg-ub-orange px-3 py-1 text-white hover:bg-orange-500"
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRestart(restart.id)}
                            className="text-xs text-ubt-grey underline hover:text-white"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {pastRestarts.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-ubt-grey">History</h3>
                <ul className="mt-2 space-y-2 text-xs text-ubt-grey">
                  {pastRestarts.map((restart) => (
                    <li key={`history-${restart.id}`}>
                      <span className="font-medium text-white">{restart.label}</span> •{' '}
                      {formatDateTimeReadable(restart.scheduledTime)} ({restart.status})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </main>

      <Modal isOpen={rescheduleOpen} onClose={closeReschedule}>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-gray-800 bg-ub-cool-grey p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Reschedule restart</h2>
            {selectedRestart && (
              <>
                <p className="mt-1 text-sm text-ubt-grey">{selectedRestart.label}</p>
                <div className="mt-4 space-y-3">
                  <label className="flex flex-col text-sm">
                    <span className="mb-1 text-ubt-grey">New date &amp; time</span>
                    <input
                      type="datetime-local"
                      value={rescheduleValue}
                      onChange={(event) => setRescheduleValue(event.target.value)}
                      className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-orange-400 focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col text-sm">
                    <span className="mb-1 text-ubt-grey">Preferred window</span>
                    <select
                      value={rescheduleWindowId}
                      onChange={(event) => setRescheduleWindowId(event.target.value)}
                      className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-orange-400 focus:outline-none"
                    >
                      <option value="custom">Custom time</option>
                      {windows.map((window) => (
                        <option key={window.id} value={window.id}>
                          {window.label} ({formatTimeValue(window.startMinutes)} –{' '}
                          {formatTimeValue(window.endMinutes)})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col text-sm">
                    <span className="mb-1 text-ubt-grey">Notes</span>
                    <textarea
                      rows={3}
                      value={rescheduleNote}
                      onChange={(event) => setRescheduleNote(event.target.value)}
                      className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-orange-400 focus:outline-none"
                    />
                  </label>
                </div>
                {rescheduleError && (
                  <p className="mt-3 text-sm text-red-400">{rescheduleError}</p>
                )}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeReschedule}
                    className="rounded border border-gray-600 px-4 py-2 text-sm hover:border-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmReschedule}
                    className="rounded bg-ub-orange px-4 py-2 text-sm text-white hover:bg-orange-500"
                  >
                    Confirm reschedule
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UpdateCenter;

