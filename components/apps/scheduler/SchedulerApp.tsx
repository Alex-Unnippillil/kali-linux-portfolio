"use client";

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CronScheduleInput,
  IntervalScheduleInput,
  IntervalUnit,
  OnceScheduleInput,
  ScheduleInput,
  SchedulePreview,
  computeSchedulePreview,
  coerceDateInput,
  formatAsUTC,
} from '../../../modules/scheduler';
import {
  SchedulerLogRecord,
  addSchedulerLog,
} from '../../../modules/scheduler/logs';
import { useSchedulerLogs } from '../../../hooks/useSchedulerLogs';

interface CronFormState {
  jobName: string;
  expression: string;
  timezone: string;
  start: string;
  command: string;
  notes: string;
}

interface IntervalFormState {
  jobName: string;
  every: string;
  unit: IntervalUnit;
  start: string;
  command: string;
  notes: string;
}

interface OnceFormState {
  jobName: string;
  runAt: string;
  command: string;
  notes: string;
}

interface JobInstance {
  id: string;
  name: string;
  schedule: ScheduleInput;
  nextRuns: string[];
  command: string;
  notes?: string;
  isRunning?: boolean;
}

type TabKey = 'cron' | 'interval' | 'once';

const DEFAULT_CRON_FORM: CronFormState = {
  jobName: '',
  expression: '',
  timezone: 'UTC',
  start: '',
  command: '',
  notes: '',
};

const DEFAULT_INTERVAL_FORM: IntervalFormState = {
  jobName: '',
  every: '60',
  unit: 'minutes',
  start: '',
  command: '',
  notes: '',
};

const DEFAULT_ONCE_FORM: OnceFormState = {
  jobName: '',
  runAt: '',
  command: '',
  notes: '',
};

const DAILY_BACKUP_PRESET = {
  id: 'daily-backup',
  name: 'Daily backup',
  expression: '0 2 * * *',
  timezone: 'UTC',
  command: 'rsync -a /home/kali/ /mnt/backups/daily',
  notes: 'Archives the Kali home directory into the mounted backup volume.',
};

const formatPreviewRuns = (runs: Date[]) =>
  runs.map((run) => formatAsUTC(run));

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const getCronSchedule = (form: CronFormState) => {
  if (!form.expression.trim()) {
    return { error: 'Enter a cron expression to preview the schedule.' };
  }
  const schedule: CronScheduleInput = {
    type: 'cron',
    expression: form.expression.trim(),
  };
  const tz = form.timezone.trim();
  if (tz) {
    schedule.timezone = tz;
  }
  if (form.start) {
    const iso = coerceDateInput(form.start);
    if (!iso) {
      return { error: 'Start time is invalid.' };
    }
    schedule.startDate = iso;
  }
  return { schedule };
};

const getIntervalSchedule = (form: IntervalFormState) => {
  if (!form.every.trim()) {
    return { error: 'Specify how often the job should run.' };
  }
  const value = Number(form.every);
  if (!Number.isFinite(value) || value <= 0) {
    return { error: 'Interval value must be a positive number.' };
  }
  const schedule: IntervalScheduleInput = {
    type: 'interval',
    every: value,
    unit: form.unit,
  };
  if (form.start) {
    const iso = coerceDateInput(form.start);
    if (!iso) {
      return { error: 'Start time is invalid.' };
    }
    schedule.startDate = iso;
  }
  return { schedule };
};

const getOnceSchedule = (form: OnceFormState) => {
  if (!form.runAt.trim()) {
    return { error: 'Select a time for the one-off job.' };
  }
  const iso = coerceDateInput(form.runAt);
  if (!iso) {
    return { error: 'Run time is invalid.' };
  }
  const schedule: OnceScheduleInput = {
    type: 'once',
    runAt: iso,
  };
  return { schedule };
};

const useJobsRef = (jobs: JobInstance[]) => {
  const ref = useRef<JobInstance[]>(jobs);
  useEffect(() => {
    ref.current = jobs;
  }, [jobs]);
  return ref;
};

const SchedulerApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('cron');
  const [cronForm, setCronForm] = useState<CronFormState>(DEFAULT_CRON_FORM);
  const [intervalForm, setIntervalForm] = useState<IntervalFormState>(
    DEFAULT_INTERVAL_FORM,
  );
  const [onceForm, setOnceForm] = useState<OnceFormState>(DEFAULT_ONCE_FORM);
  const [cronErrors, setCronErrors] = useState<string[]>([]);
  const [intervalErrors, setIntervalErrors] = useState<string[]>([]);
  const [onceErrors, setOnceErrors] = useState<string[]>([]);
  const [jobs, setJobs] = useState<JobInstance[]>([]);
  const jobsRef = useJobsRef(jobs);
  const workerRef = useRef<Worker | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');

  const cronScheduleResult = useMemo(() => getCronSchedule(cronForm), [cronForm]);
  const intervalScheduleResult = useMemo(
    () => getIntervalSchedule(intervalForm),
    [intervalForm],
  );
  const onceScheduleResult = useMemo(() => getOnceSchedule(onceForm), [onceForm]);

  const cronPreview: SchedulePreview | null = useMemo(() => {
    if ('error' in cronScheduleResult && cronScheduleResult.error) {
      return {
        type: 'cron',
        summary: cronScheduleResult.error,
        nextRuns: [],
        error: cronScheduleResult.error,
      };
    }
    if (!('schedule' in cronScheduleResult)) {
      return null;
    }
    return computeSchedulePreview(cronScheduleResult.schedule);
  }, [cronScheduleResult]);

  const intervalPreview: SchedulePreview | null = useMemo(() => {
    if ('error' in intervalScheduleResult && intervalScheduleResult.error) {
      return {
        type: 'interval',
        summary: intervalScheduleResult.error,
        nextRuns: [],
        error: intervalScheduleResult.error,
      };
    }
    if (!('schedule' in intervalScheduleResult)) {
      return null;
    }
    return computeSchedulePreview(intervalScheduleResult.schedule);
  }, [intervalScheduleResult]);

  const oncePreview: SchedulePreview | null = useMemo(() => {
    if ('error' in onceScheduleResult && onceScheduleResult.error) {
      return {
        type: 'once',
        summary: onceScheduleResult.error,
        nextRuns: [],
        error: onceScheduleResult.error,
      };
    }
    if (!('schedule' in onceScheduleResult)) {
      return null;
    }
    return computeSchedulePreview(onceScheduleResult.schedule);
  }, [onceScheduleResult]);

  const activePreview =
    activeTab === 'cron'
      ? cronPreview
      : activeTab === 'interval'
        ? intervalPreview
        : oncePreview;

  const addJob = useCallback(
    (
      schedule: ScheduleInput,
      name: string,
      command: string,
      notes: string,
      preferredId?: string,
    ) => {
      const preview = computeSchedulePreview(schedule);
      if (preview.error) {
        return preview.error;
      }
      setJobs((prev) => {
        const slugBase = preferredId ?? (slugify(name) || `job-${Date.now()}`);
        let uniqueId = slugBase;
        let attempt = 1;
        while (prev.some((job) => job.id === uniqueId)) {
          uniqueId = `${slugBase}-${attempt}`;
          attempt += 1;
        }
        const nextRuns = preview.nextRuns.map((run) => run.toISOString());
        return [
          ...prev,
          {
            id: uniqueId,
            name,
            schedule,
            nextRuns,
            command,
            notes: notes || undefined,
          },
        ];
      });
      setSelectedJobFilter('all');
      return undefined;
    },
    [],
  );

  const startJob = useCallback((jobId: string) => {
    let snapshot: JobInstance | null = null;
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) {
          return job;
        }
        if (job.isRunning) {
          snapshot = null;
          return job;
        }
        snapshot = { ...job };
        return { ...job, isRunning: true };
      }),
    );
    return snapshot;
  }, []);

  const updateJobAfterRun = useCallback(
    (job: JobInstance, executedAt: Date) => {
      const preview = computeSchedulePreview(job.schedule, {
        now: new Date(executedAt.getTime() + 1000),
      });
      setJobs((prev) =>
        prev
          .map((existing) =>
            existing.id === job.id
              ? {
                  ...existing,
                  isRunning: false,
                  nextRuns: preview.nextRuns.map((run) => run.toISOString()),
                }
              : existing,
          )
          .filter((existing) =>
            existing.schedule.type === 'once'
              ? existing.nextRuns.length > 0 || existing.id !== job.id
              : true,
          ),
      );
    },
    [],
  );

  const executeJob = useCallback(
    async (job: JobInstance, scheduledFor: Date, manual = false) => {
      const startedAt = new Date();
      let exitCode = 0;
      let notes = job.notes;
      try {
        await new Promise((resolve) => setTimeout(resolve, 250));
        if (!notes) {
          notes = manual
            ? 'Manual run triggered from the Scheduler.'
            : job.command
              ? `Executed command: ${job.command}`
              : 'Job executed successfully.';
        }
      } catch (error) {
        exitCode = 1;
        const message = error instanceof Error ? error.message : String(error);
        notes = `Job failed: ${message}`;
      } finally {
        const finishedAt = new Date();
        const log: Omit<SchedulerLogRecord, 'id'> = {
          jobId: job.id,
          jobName: job.name,
          scheduledTime: scheduledFor.toISOString(),
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          exitCode,
          notes,
        };
        await addSchedulerLog(log);
        updateJobAfterRun(job, scheduledFor);
      }
    },
    [updateJobAfterRun],
  );

  const handleTick = useCallback(() => {
    const now = Date.now();
    jobsRef.current.forEach((job) => {
      const next = job.nextRuns[0];
      if (!next || job.isRunning) {
        return;
      }
      const nextDate = new Date(next);
      if (nextDate.getTime() <= now) {
        const snapshot = startJob(job.id);
        if (snapshot) {
          void executeJob(snapshot, nextDate);
        }
      }
    });
  }, [executeJob, jobsRef, startJob]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {};
    }
    const startWorker = () => {
      if (typeof Worker === 'undefined') {
        return false;
      }
      try {
        const worker = new Worker(
          new URL('../../../workers/timer.worker.ts', import.meta.url),
        );
        workerRef.current = worker;
        worker.onmessage = () => handleTick();
        worker.postMessage({ action: 'start', interval: 1000 });
        return true;
      } catch (error) {
        console.warn('Falling back to setInterval for scheduler ticks.', error);
        return false;
      }
    };

    if (!startWorker()) {
      intervalRef.current = setInterval(() => handleTick(), 1000);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ action: 'stop' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [handleTick]);

  useEffect(() => {
    if (
      selectedJobFilter !== 'all' &&
      !jobs.some((job) => job.id === selectedJobFilter)
    ) {
      setSelectedJobFilter('all');
    }
  }, [jobs, selectedJobFilter]);

  const { logs } = useSchedulerLogs(
    selectedJobFilter === 'all' ? undefined : selectedJobFilter,
  );

  const upcomingPreviewRuns = useMemo(() => {
    if (!activePreview) return [];
    return formatPreviewRuns(activePreview.nextRuns);
  }, [activePreview]);

  const upcomingJobs = useMemo(
    () =>
      jobs
        .map((job) => ({
          ...job,
          nextRuns: job.nextRuns.map((run) => new Date(run)),
        }))
        .sort((a, b) => {
          const aTime = a.nextRuns[0]?.getTime() ?? Number.POSITIVE_INFINITY;
          const bTime = b.nextRuns[0]?.getTime() ?? Number.POSITIVE_INFINITY;
          return aTime - bTime;
        }),
    [jobs],
  );

  const handleCronSubmit = (event: FormEvent) => {
    event.preventDefault();
    const messages: string[] = [];
    if (!cronForm.jobName.trim()) {
      messages.push('Job name is required.');
    }
    if ('error' in cronScheduleResult && cronScheduleResult.error) {
      messages.push(cronScheduleResult.error);
    }
    if (cronPreview?.error && !messages.includes(cronPreview.error)) {
      messages.push(cronPreview.error);
    }
    if (messages.length === 0 && 'schedule' in cronScheduleResult) {
      const error = addJob(
        cronScheduleResult.schedule,
        cronForm.jobName.trim(),
        cronForm.command.trim(),
        cronForm.notes.trim(),
      );
      if (error) {
        messages.push(error);
      } else {
        setCronForm(DEFAULT_CRON_FORM);
      }
    }
    setCronErrors(messages);
  };

  const handleIntervalSubmit = (event: FormEvent) => {
    event.preventDefault();
    const messages: string[] = [];
    if (!intervalForm.jobName.trim()) {
      messages.push('Job name is required.');
    }
    if ('error' in intervalScheduleResult && intervalScheduleResult.error) {
      messages.push(intervalScheduleResult.error);
    }
    if (intervalPreview?.error && !messages.includes(intervalPreview.error)) {
      messages.push(intervalPreview.error);
    }
    if (messages.length === 0 && 'schedule' in intervalScheduleResult) {
      const error = addJob(
        intervalScheduleResult.schedule,
        intervalForm.jobName.trim(),
        intervalForm.command.trim(),
        intervalForm.notes.trim(),
      );
      if (error) {
        messages.push(error);
      } else {
        setIntervalForm(DEFAULT_INTERVAL_FORM);
      }
    }
    setIntervalErrors(messages);
  };

  const handleOnceSubmit = (event: FormEvent) => {
    event.preventDefault();
    const messages: string[] = [];
    if (!onceForm.jobName.trim()) {
      messages.push('Job name is required.');
    }
    if ('error' in onceScheduleResult && onceScheduleResult.error) {
      messages.push(onceScheduleResult.error);
    }
    if (oncePreview?.error && !messages.includes(oncePreview.error)) {
      messages.push(oncePreview.error);
    }
    if (messages.length === 0 && 'schedule' in onceScheduleResult) {
      const error = addJob(
        onceScheduleResult.schedule,
        onceForm.jobName.trim(),
        onceForm.command.trim(),
        onceForm.notes.trim(),
      );
      if (error) {
        messages.push(error);
      } else {
        setOnceForm(DEFAULT_ONCE_FORM);
      }
    }
    setOnceErrors(messages);
  };

  const runJobNow = useCallback(
    (jobId: string) => {
      const snapshot = startJob(jobId);
      if (!snapshot) {
        return;
      }
      const scheduledFor = new Date();
      void executeJob(snapshot, scheduledFor, true);
    },
    [executeJob, startJob],
  );

  const removeJob = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== jobId));
  }, []);

  const applyDailyBackupPreset = () => {
    setActiveTab('cron');
    setCronForm({
      jobName: DAILY_BACKUP_PRESET.name,
      expression: DAILY_BACKUP_PRESET.expression,
      timezone: DAILY_BACKUP_PRESET.timezone,
      start: '',
      command: DAILY_BACKUP_PRESET.command,
      notes: DAILY_BACKUP_PRESET.notes,
    });
    const schedule: CronScheduleInput = {
      type: 'cron',
      expression: DAILY_BACKUP_PRESET.expression,
      timezone: DAILY_BACKUP_PRESET.timezone,
    };
    setJobs((prev) => {
      const preview = computeSchedulePreview(schedule);
      const nextRuns = preview.nextRuns.map((run) => run.toISOString());
      const existingIndex = prev.findIndex(
        (job) => job.id === DAILY_BACKUP_PRESET.id,
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          schedule,
          nextRuns,
          name: DAILY_BACKUP_PRESET.name,
          command: DAILY_BACKUP_PRESET.command,
          notes: DAILY_BACKUP_PRESET.notes,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: DAILY_BACKUP_PRESET.id,
          name: DAILY_BACKUP_PRESET.name,
          schedule,
          nextRuns,
          command: DAILY_BACKUP_PRESET.command,
          notes: DAILY_BACKUP_PRESET.notes,
        },
      ];
    });
    setSelectedJobFilter(DAILY_BACKUP_PRESET.id);
  };

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white p-4 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Scheduler</h1>
          <p className="text-sm text-gray-300">
            Configure cron, interval, and one-time jobs with live previews and
            execution logs.
          </p>
        </div>
        <button
          className="self-start rounded bg-ub-orange px-3 py-1 text-sm font-medium text-black hover:bg-orange-400"
          onClick={applyDailyBackupPreset}
        >
          Enable daily backup preset
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-600 pb-2 text-sm font-medium">
        {([
          ['cron', 'Cron'],
          ['interval', 'Interval'],
          ['once', 'One-time'],
        ] as [TabKey, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`rounded px-3 py-1 ${
              activeTab === key ? 'bg-ub-orange text-black' : 'bg-gray-700'
            }`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'cron' && (
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={handleCronSubmit}
          >
            <label className="flex flex-col text-sm">
              Job name
              <input
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                value={cronForm.jobName}
                onChange={(event) =>
                  setCronForm((prev) => ({
                    ...prev,
                    jobName: event.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Cron expression
              <input
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                value={cronForm.expression}
                onChange={(event) =>
                  setCronForm((prev) => ({
                    ...prev,
                    expression: event.target.value,
                  }))
                }
                placeholder="0 2 * * *"
              />
            </label>
            <label className="flex flex-col text-sm">
              Timezone
              <input
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                value={cronForm.timezone}
                onChange={(event) =>
                  setCronForm((prev) => ({
                    ...prev,
                    timezone: event.target.value,
                  }))
                }
                placeholder="UTC"
              />
            </label>
            <label className="flex flex-col text-sm">
              Optional start time
              <input
                type="datetime-local"
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                value={cronForm.start}
                onChange={(event) =>
                  setCronForm((prev) => ({
                    ...prev,
                    start: event.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Command (optional)
              <input
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                value={cronForm.command}
                onChange={(event) =>
                  setCronForm((prev) => ({
                    ...prev,
                    command: event.target.value,
                  }))
                }
                placeholder="rsync -a /home /mnt/backup"
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Notes
              <textarea
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                rows={2}
                value={cronForm.notes}
                onChange={(event) =>
                  setCronForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button
                className="rounded bg-ub-orange px-4 py-2 text-black"
                type="submit"
              >
                Schedule cron job
              </button>
            </div>
            {cronErrors.length > 0 && (
              <div className="md:col-span-2 text-sm text-red-300">
                {cronErrors.map((err) => (
                  <div key={err}>{err}</div>
                ))}
              </div>
            )}
          </form>
        )}

        {activeTab === 'interval' && (
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={handleIntervalSubmit}
          >
            <label className="flex flex-col text-sm">
              Job name
              <input
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                value={intervalForm.jobName}
                onChange={(event) =>
                  setIntervalForm((prev) => ({
                    ...prev,
                    jobName: event.target.value,
                  }))
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex flex-col">
                Every
                <input
                  className="mt-1 rounded bg-gray-800 p-2 text-white"
                  value={intervalForm.every}
                  onChange={(event) =>
                    setIntervalForm((prev) => ({
                      ...prev,
                      every: event.target.value,
                    }))
                  }
                  inputMode="numeric"
                />
              </label>
              <label className="flex flex-col">
                Unit
                <select
                  className="mt-1 rounded bg-gray-800 p-2 text-white"
                  value={intervalForm.unit}
                  onChange={(event) =>
                    setIntervalForm((prev) => ({
                      ...prev,
                      unit: event.target.value as IntervalUnit,
                    }))
                  }
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col text-sm">
              Optional start time
              <input
                type="datetime-local"
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                value={intervalForm.start}
                onChange={(event) =>
                  setIntervalForm((prev) => ({
                    ...prev,
                    start: event.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Command (optional)
              <input
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                value={intervalForm.command}
                onChange={(event) =>
                  setIntervalForm((prev) => ({
                    ...prev,
                    command: event.target.value,
                  }))
                }
                placeholder="backup.sh"
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Notes
              <textarea
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                rows={2}
                value={intervalForm.notes}
                onChange={(event) =>
                  setIntervalForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button
                className="rounded bg-ub-orange px-4 py-2 text-black"
                type="submit"
              >
                Schedule interval job
              </button>
            </div>
            {intervalErrors.length > 0 && (
              <div className="md:col-span-2 text-sm text-red-300">
                {intervalErrors.map((err) => (
                  <div key={err}>{err}</div>
                ))}
              </div>
            )}
          </form>
        )}

        {activeTab === 'once' && (
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleOnceSubmit}>
            <label className="flex flex-col text-sm">
              Job name
              <input
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                value={onceForm.jobName}
                onChange={(event) =>
                  setOnceForm((prev) => ({
                    ...prev,
                    jobName: event.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Run at
              <input
                type="datetime-local"
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                value={onceForm.runAt}
                onChange={(event) =>
                  setOnceForm((prev) => ({
                    ...prev,
                    runAt: event.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Command (optional)
              <input
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                value={onceForm.command}
                onChange={(event) =>
                  setOnceForm((prev) => ({
                    ...prev,
                    command: event.target.value,
                  }))
                }
                placeholder="sudo shutdown -r"
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Notes
              <textarea
                className="mt-1 rounded bg-gray-800 p-2 text-white"
                rows={2}
                value={onceForm.notes}
                onChange={(event) =>
                  setOnceForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button
                className="rounded bg-ub-orange px-4 py-2 text-black"
                type="submit"
              >
                Schedule one-time job
              </button>
            </div>
            {onceErrors.length > 0 && (
              <div className="md:col-span-2 text-sm text-red-300">
                {onceErrors.map((err) => (
                  <div key={err}>{err}</div>
                ))}
              </div>
            )}
          </form>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div
          className="rounded border border-gray-600 bg-gray-800 p-4"
          data-testid="schedule-preview"
        >
          <h2 className="text-lg font-semibold">Preview</h2>
          {activePreview ? (
            <>
              <p className="mt-2 text-sm text-gray-200">{activePreview.summary}</p>
              {activePreview.error && (
                <p className="mt-2 text-sm text-red-300">{activePreview.error}</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-gray-300">
              Fill in the form to see the next five executions.
            </p>
          )}
        </div>
        <div className="rounded border border-gray-600 bg-gray-800 p-4">
          <h2 className="text-lg font-semibold">Upcoming executions</h2>
          <table
            className="mt-2 w-full text-left text-sm"
            data-testid="upcoming-table"
          >
            <thead>
              <tr className="text-gray-300">
                <th className="py-1">#</th>
                <th className="py-1">Scheduled for</th>
              </tr>
            </thead>
            <tbody>
              {upcomingPreviewRuns.length === 0 ? (
                <tr>
                  <td className="py-2 text-gray-400" colSpan={2}>
                    Provide a valid schedule to preview run times.
                  </td>
                </tr>
              ) : (
                upcomingPreviewRuns.map((run, index) => (
                  <tr key={run} className="border-t border-gray-700">
                    <td className="py-2">{index + 1}</td>
                    <td className="py-2">{run}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-gray-600 bg-gray-800 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Scheduled jobs</h2>
          {upcomingJobs.length === 0 ? (
            <p className="text-sm text-gray-300">
              No jobs scheduled yet. Create one using the forms above or load a
              preset.
            </p>
          ) : (
            upcomingJobs.map((job) => (
              <div
                key={job.id}
                className="rounded border border-gray-700 bg-gray-900 p-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{job.name}</h3>
                    <p className="text-xs text-gray-400">
                      {job.schedule.type === 'cron'
                        ? 'Cron'
                        : job.schedule.type === 'interval'
                          ? 'Interval'
                          : 'One-time'}{' '}
                      job
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded bg-ub-orange px-2 py-1 text-xs text-black"
                      onClick={() => runJobNow(job.id)}
                    >
                      Run now
                    </button>
                    <button
                      className="rounded bg-gray-700 px-2 py-1 text-xs"
                      onClick={() => removeJob(job.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-200">
                  Next run:{' '}
                  {job.nextRuns[0]
                    ? formatAsUTC(job.nextRuns[0])
                    : 'No future runs scheduled'}
                </p>
                {job.isRunning && (
                  <p className="text-xs text-ub-orange">Job is executing…</p>
                )}
                {job.notes && (
                  <p className="mt-1 text-xs text-gray-400">{job.notes}</p>
                )}
                {job.nextRuns.length > 1 && (
                  <div className="mt-2 text-xs text-gray-300">
                    Upcoming:
                    <ul className="list-disc pl-4">
                      {job.nextRuns.slice(1, 4).map((run, index) => (
                        <li key={`${job.id}-${index + 1}`}>
                          {formatAsUTC(run)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="rounded border border-gray-600 bg-gray-800 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">Recent logs</h2>
            <select
              className="rounded bg-gray-900 px-2 py-1 text-sm"
              value={selectedJobFilter}
              onChange={(event) => setSelectedJobFilter(event.target.value)}
            >
              <option value="all">All jobs</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 max-h-64 overflow-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="text-gray-300">
                <tr>
                  <th className="py-1">Job</th>
                  <th className="py-1">Started</th>
                  <th className="py-1">Finished</th>
                  <th className="py-1">Exit</th>
                  <th className="py-1">Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td className="py-3 text-gray-400" colSpan={5}>
                      No executions logged yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-t border-gray-700">
                      <td className="py-2 font-medium text-gray-100">
                        {log.jobName}
                      </td>
                      <td className="py-2 text-gray-200">
                        {formatAsUTC(new Date(log.startedAt))}
                      </td>
                      <td className="py-2 text-gray-200">
                        {formatAsUTC(new Date(log.finishedAt))}
                      </td>
                      <td className="py-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold text-black ${
                            log.exitCode === 0
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}
                          data-testid="exit-code-badge"
                        >
                          Exit {log.exitCode}
                        </span>
                      </td>
                      <td className="py-2 text-gray-300">{log.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export const displayScheduler = () => <SchedulerApp />;

export default SchedulerApp;

