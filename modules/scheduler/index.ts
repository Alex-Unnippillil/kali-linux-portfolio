import CronExpressionParser from 'cron-parser';

export type ScheduleType = 'cron' | 'interval' | 'once';

export interface CronScheduleInput {
  type: 'cron';
  expression: string;
  timezone?: string;
  startDate?: string | Date;
}

export type IntervalUnit = 'seconds' | 'minutes' | 'hours' | 'days';

export interface IntervalScheduleInput {
  type: 'interval';
  every: number;
  unit: IntervalUnit;
  startDate?: string | Date;
}

export interface OnceScheduleInput {
  type: 'once';
  runAt: string | Date;
}

export type ScheduleInput =
  | CronScheduleInput
  | IntervalScheduleInput
  | OnceScheduleInput;

export interface SchedulePreview {
  type: ScheduleType;
  summary: string;
  nextRuns: Date[];
  error?: string;
}

const UNIT_MS: Record<IntervalUnit, number> = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
};

const pluralize = (value: number, unit: IntervalUnit) => {
  if (value === 1) return unit.replace(/s$/, '');
  return unit;
};

const parseDate = (value?: string | Date): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatAsUTC = (date: Date) =>
  `${date.toISOString().replace('T', ' ').replace('Z', ' UTC')}`;

interface PreviewOptions {
  now?: Date;
  count?: number;
}

const buildCronPreview = (
  schedule: CronScheduleInput,
  { now = new Date(), count = 5 }: PreviewOptions,
): SchedulePreview => {
  const { expression, timezone, startDate } = schedule;
  const start = parseDate(startDate ?? undefined);
  const reference = start && start > now ? start : now;
  try {
    const parser = CronExpressionParser.parse(expression, {
      tz: timezone,
      currentDate: reference,
      startDate: start ?? undefined,
    });
    const nextRuns: Date[] = [];
    for (let i = 0; i < count; i += 1) {
      if (!parser.hasNext()) break;
      const occurrence = parser.next();
      nextRuns.push(occurrence.toDate());
    }
    const firstRun = nextRuns[0];
    const summary = firstRun
      ? `Cron expression "${expression}" next run at ${formatAsUTC(firstRun)}${
          timezone ? ` (timezone: ${timezone})` : ''
        }${start ? `; starts from ${formatAsUTC(start)}` : ''}.`
      : `Cron expression "${expression}" has no future runs.`;
    return {
      type: 'cron',
      summary,
      nextRuns,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to parse cron expression.';
    return {
      type: 'cron',
      summary: `Unable to parse cron expression "${expression}".`,
      nextRuns: [],
      error: message,
    };
  }
};

const buildIntervalPreview = (
  schedule: IntervalScheduleInput,
  { now = new Date(), count = 5 }: PreviewOptions,
): SchedulePreview => {
  const { every, unit, startDate } = schedule;
  if (!Number.isFinite(every) || every <= 0) {
    return {
      type: 'interval',
      summary: 'Interval must be a positive number.',
      nextRuns: [],
      error: 'Interval must be positive.',
    };
  }

  const base = parseDate(startDate ?? undefined) ?? now;
  const intervalMs = UNIT_MS[unit] * every;
  const startMs = base.getTime();
  const nowMs = now.getTime();
  const runs: Date[] = [];

  let nextMs = startMs;
  if (startMs < nowMs) {
    const elapsed = nowMs - startMs;
    const steps = Math.floor(elapsed / intervalMs);
    nextMs = startMs + (steps + 1) * intervalMs;
  }

  for (let i = 0; i < count; i += 1) {
    runs.push(new Date(nextMs));
    nextMs += intervalMs;
  }

  const unitLabel = pluralize(every, unit);
  const summary = `${
    startDate
      ? `Runs every ${every} ${unitLabel} starting ${formatAsUTC(base)}.`
      : `Runs every ${every} ${unitLabel} starting immediately.`
  }`;

  return {
    type: 'interval',
    summary,
    nextRuns: runs,
  };
};

const buildOncePreview = (
  schedule: OnceScheduleInput,
  { now = new Date() }: PreviewOptions,
): SchedulePreview => {
  const runAtDate = parseDate(schedule.runAt);
  if (!runAtDate) {
    return {
      type: 'once',
      summary: 'Run date is invalid.',
      nextRuns: [],
      error: 'Run date is invalid.',
    };
  }

  if (runAtDate.getTime() < now.getTime()) {
    return {
      type: 'once',
      summary: `Scheduled for ${formatAsUTC(runAtDate)} but the time has already passed.`,
      nextRuns: [],
      error: 'Scheduled time is in the past.',
    };
  }

  return {
    type: 'once',
    summary: `Will run a single time at ${formatAsUTC(runAtDate)}.`,
    nextRuns: [runAtDate],
  };
};

export const computeSchedulePreview = (
  schedule: ScheduleInput,
  options: PreviewOptions = {},
): SchedulePreview => {
  switch (schedule.type) {
    case 'cron':
      return buildCronPreview(schedule, options);
    case 'interval':
      return buildIntervalPreview(schedule, options);
    case 'once':
      return buildOncePreview(schedule, options);
    default:
      return {
        type: schedule.type,
        summary: 'Unsupported schedule type.',
        nextRuns: [],
        error: 'Unsupported schedule type.',
      };
  }
};

export const coerceDateInput = (value: string): string | undefined => {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString() : undefined;
};

