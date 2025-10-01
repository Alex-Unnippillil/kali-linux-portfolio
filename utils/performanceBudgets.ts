export type PerformanceMetric = 'rows' | 'mb' | 'duration';

export interface PerformanceBudget {
  rows?: number | null;
  mb?: number | null;
  duration?: number | null;
}

export type PerformanceBudgetMap = Record<string, PerformanceBudget>;

export interface OverrideMetricLog {
  metric: PerformanceMetric;
  value: number;
  budget?: number;
}

export interface OverrideLogEntry {
  id: string;
  appId: string;
  timestamp: number;
  decision: 'allowed' | 'blocked';
  metrics: OverrideMetricLog[];
  description?: string;
  estimatedImpact?: string;
  type?: string;
}

export const GLOBAL_APP_ID = '__system__';
export const GLOBAL_APP_LABEL = 'System & background tasks';

export const BUDGET_STORAGE_KEY = 'app-performance-budgets';
export const OVERRIDE_STORAGE_KEY = 'app-performance-override-log';

const DEFAULT_BUDGET: Required<PerformanceBudget> = {
  rows: 5000,
  mb: 12,
  duration: 45000,
};

const LOG_LIMIT = 50;

const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage;

const parseJSON = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return fallback;
  } catch {
    return fallback;
  }
};

export const cloneBudget = (budget?: PerformanceBudget | null): PerformanceBudget => ({
  rows: budget?.rows ?? null,
  mb: budget?.mb ?? null,
  duration: budget?.duration ?? null,
});

export const getDefaultBudget = (): PerformanceBudget => ({ ...DEFAULT_BUDGET });

const normaliseValue = (value: number | null | undefined): number | null => {
  if (value == null) return null;
  if (Number.isNaN(value)) return null;
  if (!Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return value;
};

export const sanitiseBudget = (budget: PerformanceBudget): PerformanceBudget => ({
  rows: normaliseValue(
    typeof budget.rows === 'string' ? Number(budget.rows) : budget.rows ?? null,
  ),
  mb: normaliseValue(typeof budget.mb === 'string' ? Number(budget.mb) : budget.mb ?? null),
  duration: normaliseValue(
    typeof budget.duration === 'string' ? Number(budget.duration) : budget.duration ?? null,
  ),
});

export const budgetsEqual = (a?: PerformanceBudget | null, b?: PerformanceBudget | null) => {
  const normalise = (value: PerformanceBudget | null | undefined) => ({
    rows: value?.rows ?? null,
    mb: value?.mb ?? null,
    duration: value?.duration ?? null,
  });
  const aa = normalise(a);
  const bb = normalise(b);
  return aa.rows === bb.rows && aa.mb === bb.mb && aa.duration === bb.duration;
};

export const readBudgetsFromStorage = (): PerformanceBudgetMap => {
  if (!isBrowser()) return {};
  const raw = window.localStorage.getItem(BUDGET_STORAGE_KEY);
  const parsed = parseJSON<Record<string, PerformanceBudget>>(raw, {});
  const map: PerformanceBudgetMap = {};
  Object.entries(parsed).forEach(([key, value]) => {
    map[key] = sanitiseBudget(value ?? {});
  });
  return map;
};

export const writeBudgetsToStorage = (budgets: PerformanceBudgetMap) => {
  if (!isBrowser()) return;
  const payload: Record<string, PerformanceBudget> = {};
  Object.entries(budgets).forEach(([key, value]) => {
    const sanitised = sanitiseBudget(value);
    if (sanitised.rows || sanitised.mb || sanitised.duration) {
      payload[key] = sanitised;
    }
  });
  window.localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(payload));
};

export const readOverrideLogFromStorage = (): OverrideLogEntry[] => {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(OVERRIDE_STORAGE_KEY);
  const entries = parseJSON<OverrideLogEntry[]>(raw, []);
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => ({
      ...entry,
      metrics: Array.isArray(entry.metrics) ? entry.metrics : [],
    }))
    .slice(0, LOG_LIMIT);
};

export const writeOverrideLogToStorage = (entries: OverrideLogEntry[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    OVERRIDE_STORAGE_KEY,
    JSON.stringify(entries.slice(0, LOG_LIMIT)),
  );
};

export const getEffectiveBudget = (
  appId: string,
  overrides: PerformanceBudgetMap,
): PerformanceBudget => {
  const override = overrides[appId];
  if (!override) return getDefaultBudget();
  const merged: PerformanceBudget = { ...override };
  if (merged.rows == null) merged.rows = DEFAULT_BUDGET.rows;
  if (merged.mb == null) merged.mb = DEFAULT_BUDGET.mb;
  if (merged.duration == null) merged.duration = DEFAULT_BUDGET.duration;
  return merged;
};

export const clampOverrides = (entries: OverrideLogEntry[]): OverrideLogEntry[] =>
  entries.slice(0, LOG_LIMIT);

