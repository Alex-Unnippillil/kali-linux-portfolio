const DO_NOT_DISTURB_KEY = 'notifications:dnd';
const SUMMARY_INTERVAL_KEY = 'notifications:summary-interval-ms';

export const MINUTE_IN_MS = 60 * 1000;
export const SUMMARY_INTERVAL_OPTIONS_MINUTES = [5, 15, 30, 60] as const;
export const SUMMARY_INTERVAL_OPTIONS_MS = SUMMARY_INTERVAL_OPTIONS_MINUTES.map(
  minutes => minutes * MINUTE_IN_MS,
);

export const DEFAULT_DO_NOT_DISTURB = false;
export const DEFAULT_SUMMARY_INTERVAL_MS = 15 * MINUTE_IN_MS;

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  doNotDisturb: DEFAULT_DO_NOT_DISTURB,
  summaryIntervalMs: DEFAULT_SUMMARY_INTERVAL_MS,
} as const;

export async function getDoNotDisturbPreference(): Promise<boolean> {
  if (typeof window === 'undefined') return DEFAULT_DO_NOT_DISTURB;
  const stored = window.localStorage.getItem(DO_NOT_DISTURB_KEY);
  if (stored === null) return DEFAULT_DO_NOT_DISTURB;
  return stored === 'true';
}

export async function setDoNotDisturbPreference(value: boolean): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DO_NOT_DISTURB_KEY, value ? 'true' : 'false');
}

export async function getSummaryIntervalPreference(): Promise<number> {
  if (typeof window === 'undefined') return DEFAULT_SUMMARY_INTERVAL_MS;
  const stored = window.localStorage.getItem(SUMMARY_INTERVAL_KEY);
  if (!stored) return DEFAULT_SUMMARY_INTERVAL_MS;
  const parsed = Number.parseInt(stored, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_SUMMARY_INTERVAL_MS;
}

export async function setSummaryIntervalPreference(value: number): Promise<void> {
  if (typeof window === 'undefined') return;
  const sanitized = Number.isFinite(value) && value > 0
    ? Math.round(value)
    : DEFAULT_SUMMARY_INTERVAL_MS;
  window.localStorage.setItem(SUMMARY_INTERVAL_KEY, String(sanitized));
}

export function minutesFromMs(value: number): number {
  return Math.round(value / MINUTE_IN_MS);
}

export function msFromMinutes(value: number): number {
  return Math.max(1, Math.round(value)) * MINUTE_IN_MS;
}
