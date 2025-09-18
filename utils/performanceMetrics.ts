import { logEvent } from './analytics';

const hasPerformance = typeof performance !== 'undefined' && typeof performance.mark === 'function';

const startMark = (id: string): string => `app-launch:${id}:start`;
const endMark = (id: string): string => `app-launch:${id}:end`;
const measureName = (id: string): string => `app-launch:${id}`;

const clearMarks = (id: string): void => {
  if (!hasPerformance) return;
  try {
    performance.clearMarks(startMark(id));
    performance.clearMarks(endMark(id));
    performance.clearMeasures(measureName(id));
  } catch (error) {
    // Ignore cleanup errors
  }
};

const hasStartMark = (id: string): boolean => {
  if (!hasPerformance || typeof performance.getEntriesByName !== 'function') return false;
  try {
    return performance.getEntriesByName(startMark(id)).length > 0;
  } catch (error) {
    return false;
  }
};

export const markAppLaunchStart = (id: string): void => {
  if (!hasPerformance) return;
  try {
    performance.mark(startMark(id));
  } catch (error) {
    // Ignore marking errors
  }
};

export const measureAppLaunch = (id: string, title?: string): void => {
  if (!hasStartMark(id)) return;
  try {
    performance.mark(endMark(id));
  } catch (error) {
    clearMarks(id);
    return;
  }

  let duration: number | undefined;

  try {
    performance.measure(measureName(id), startMark(id), endMark(id));
    const entries = performance.getEntriesByName(measureName(id));
    const entry = entries[entries.length - 1];
    duration = entry?.duration;
  } catch (error) {
    // Ignore measurement errors
  }

  clearMarks(id);

  if (typeof duration === 'number' && !Number.isNaN(duration)) {
    logEvent({
      category: 'App Launch',
      action: 'duration',
      label: title ?? id,
      value: Math.round(duration),
      nonInteraction: true,
    });
  }
};

export default {
  markAppLaunchStart,
  measureAppLaunch,
};
