export interface FocusAppOverride {
  cadenceMinutes?: number;
  summaryTimes?: string[];
  deliverImmediately?: boolean;
}

export interface FocusModeSettings {
  enabled: boolean;
  defaultCadenceMinutes: number;
  summaryTimes: string[];
  overrides: Record<string, FocusAppOverride>;
  suppressToasts: boolean;
  queueNonCritical: boolean;
}

const MINUTE_IN_MS = 60 * 1000;

const normalizeTime = (value: string): string => {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return '';
  const safeHours = Math.max(0, Math.min(23, hours));
  const safeMinutes = Math.max(0, Math.min(59, minutes));
  return `${safeHours.toString().padStart(2, '0')}:${safeMinutes
    .toString()
    .padStart(2, '0')}`;
};

export const sanitizeSummaryTimes = (times: string[]): string[] => {
  if (!Array.isArray(times)) return [];
  const seen = new Set<string>();
  return times
    .map(normalizeTime)
    .filter(time => time && !seen.has(time) && seen.add(time));
};

const minutesFromTime = (time: string): number | null => {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const buildTargetDate = (base: Date, minutesFromMidnight: number): Date => {
  const target = new Date(base);
  target.setHours(0, 0, 0, 0);
  target.setMinutes(minutesFromMidnight, 0, 0);
  return target;
};

export const getNextTimeOfDay = (
  times: string[],
  now: Date = new Date(),
): Date | null => {
  const normalized = sanitizeSummaryTimes(times);
  if (!normalized.length) return null;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const ordered = normalized
    .map(minutesFromTime)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  if (!ordered.length) return null;
  const next = ordered.find(value => value > currentMinutes);
  if (next !== undefined) {
    return buildTargetDate(now, next);
  }
  // Wrap to the following day
  const tomorrow = buildTargetDate(now, ordered[0]);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
};

const resolveCadence = (
  focus: FocusModeSettings,
  appId: string,
): number => {
  const override = focus.overrides[appId];
  if (override?.cadenceMinutes && override.cadenceMinutes > 0) {
    return override.cadenceMinutes;
  }
  if (focus.defaultCadenceMinutes > 0) {
    return focus.defaultCadenceMinutes;
  }
  return 60;
};

export const computeNextSummary = (
  focus: FocusModeSettings,
  appId: string,
  lastDelivered?: number,
  now: Date = new Date(),
): Date => {
  const override = focus.overrides[appId];
  const overrideTimes = override?.summaryTimes && override.summaryTimes.length > 0;
  const globalTimes = focus.summaryTimes && focus.summaryTimes.length > 0;

  if (overrideTimes) {
    const target = getNextTimeOfDay(override!.summaryTimes!, now);
    if (target) return target;
  }

  if (globalTimes) {
    const target = getNextTimeOfDay(focus.summaryTimes, now);
    if (target) return target;
  }

  const cadence = resolveCadence(focus, appId);
  const baseline = lastDelivered ? new Date(lastDelivered) : now;
  const candidate = baseline.getTime() + cadence * MINUTE_IN_MS;
  if (candidate <= now.getTime()) {
    return new Date(now.getTime() + Math.max(cadence, 1) * MINUTE_IN_MS);
  }
  return new Date(candidate);
};

export const formatSchedulePreview = (
  focus: FocusModeSettings,
  appId: string,
  lastDelivered?: number,
): string => {
  try {
    const next = computeNextSummary(focus, appId, lastDelivered);
    return next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

export const DEFAULT_FOCUS_MODE: FocusModeSettings = {
  enabled: false,
  defaultCadenceMinutes: 60,
  summaryTimes: [],
  overrides: {},
  suppressToasts: true,
  queueNonCritical: true,
};
