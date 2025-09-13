import { safeLocalStorage } from './safeStorage';

export const METRICS_CONSENT_KEY = 'metrics-consent';
export const METRICS_COUNT_KEY = 'metrics-counts';

export const getMetricsConsent = (): boolean =>
  safeLocalStorage?.getItem(METRICS_CONSENT_KEY) === 'true';

export const setMetricsConsent = (value: boolean): void => {
  safeLocalStorage?.setItem(METRICS_CONSENT_KEY, value ? 'true' : 'false');
};

export const logFeatureUsage = (feature: string): void => {
  if (!getMetricsConsent() || !safeLocalStorage) return;
  let data: Record<string, number>;
  try {
    data = JSON.parse(safeLocalStorage.getItem(METRICS_COUNT_KEY) || '{}');
  } catch {
    data = {};
  }
  data[feature] = (data[feature] || 0) + 1;
  safeLocalStorage.setItem(METRICS_COUNT_KEY, JSON.stringify(data));
};

export const getMetricsCounts = (): Record<string, number> => {
  if (!safeLocalStorage) return {};
  try {
    return JSON.parse(safeLocalStorage.getItem(METRICS_COUNT_KEY) || '{}');
  } catch {
    return {};
  }
};

export const resetMetrics = (): void => {
  if (!safeLocalStorage) return;
  safeLocalStorage.removeItem(METRICS_COUNT_KEY);
};
