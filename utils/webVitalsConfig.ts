export interface WebVitalsSamplingConfig {
  defaultSampleRate: number;
  sampleRates: Record<string, number>;
  allowRoutes: string[];
  allowClients: string[];
}

export interface PartialWebVitalsSamplingConfig {
  defaultSampleRate?: number;
  sampleRates?: Record<string, number>;
  allowRoutes?: string[] | string;
  allowClients?: string[] | string;
}

export type WebVitalsConfigListener = (config: WebVitalsSamplingConfig) => void;

export type WebVitalMetricName = 'LCP' | 'INP' | string;

export const WEB_VITALS_CONFIG_STORAGE_KEY = 'web-vitals-sampling-config';
const WEB_VITALS_CLIENT_ID_KEY = 'web-vitals-client-id';

const getWindowObject = (): Window | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  return (globalThis as { window?: Window }).window;
};

const getLocalStorage = (): Storage | undefined => {
  const win = getWindowObject();
  return win?.localStorage;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const clampRate = (value: unknown, fallback = 1): number => {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(numeric)) {
    return Math.min(Math.max(fallback, 0), 1);
  }
  return Math.min(Math.max(numeric, 0), 1);
};

const sanitizeList = (value: unknown): string[] => {
  if (value === undefined) return [];
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\r?\n|,/)
      : [];
  const cleaned = raw
    .map((entry) => String(entry).trim())
    .filter((entry) => entry.length > 0);
  return Array.from(new Set(cleaned));
};

const sanitizeSampleRates = (value: unknown): Record<string, number> => {
  if (!isRecord(value)) return {};
  const result: Record<string, number> = {};
  Object.entries(value).forEach(([metric, rate]) => {
    result[metric] = clampRate(rate, 1);
  });
  return result;
};

const parseSampleRatesString = (value: string | undefined): Record<string, number> => {
  if (!value) return {};
  return value
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce<Record<string, number>>((acc, segment) => {
      const [metric, rate] = segment.split(':');
      if (!metric) return acc;
      acc[metric.trim()] = clampRate(rate ?? 1, 1);
      return acc;
    }, {});
};

const normalizeConfig = (
  input: PartialWebVitalsSamplingConfig | undefined,
  fallback: WebVitalsSamplingConfig
): WebVitalsSamplingConfig => {
  const defaultSampleRate = clampRate(
    input?.defaultSampleRate ?? fallback.defaultSampleRate,
    fallback.defaultSampleRate
  );

  const sampleRates = { ...fallback.sampleRates };
  if (input?.sampleRates) {
    const sanitized = sanitizeSampleRates(input.sampleRates);
    Object.entries(sanitized).forEach(([metric, rate]) => {
      sampleRates[metric] = rate;
    });
  }

  const allowRoutes =
    input?.allowRoutes !== undefined
      ? sanitizeList(input.allowRoutes)
      : [...fallback.allowRoutes];

  const allowClients =
    input?.allowClients !== undefined
      ? sanitizeList(input.allowClients)
      : [...fallback.allowClients];

  return {
    defaultSampleRate,
    sampleRates,
    allowRoutes,
    allowClients,
  };
};

const parseEnvJson = (): PartialWebVitalsSamplingConfig => {
  const raw = process.env.NEXT_PUBLIC_WEB_VITALS_CONFIG;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    return parsed as PartialWebVitalsSamplingConfig;
  } catch (error) {
    if (typeof console !== 'undefined') {
      console.warn('Invalid NEXT_PUBLIC_WEB_VITALS_CONFIG JSON:', error);
    }
  }
  return {};
};

const envJson = parseEnvJson();

const envInitialConfig: PartialWebVitalsSamplingConfig = {
  defaultSampleRate:
    envJson.defaultSampleRate ?? process.env.NEXT_PUBLIC_WEB_VITALS_SAMPLE_RATE,
  sampleRates: {
    ...parseSampleRatesString(process.env.NEXT_PUBLIC_WEB_VITALS_SAMPLE_RATES),
    ...(isRecord(envJson.sampleRates) ? (envJson.sampleRates as Record<string, number>) : {}),
  },
  allowRoutes:
    envJson.allowRoutes !== undefined
      ? envJson.allowRoutes
      : process.env.NEXT_PUBLIC_WEB_VITALS_ALLOW_ROUTES,
  allowClients:
    envJson.allowClients !== undefined
      ? envJson.allowClients
      : process.env.NEXT_PUBLIC_WEB_VITALS_ALLOW_CLIENTS,
};

const BASE_CONFIG: WebVitalsSamplingConfig = {
  defaultSampleRate: 1,
  sampleRates: {},
  allowRoutes: [],
  allowClients: [],
};

const DEFAULT_CONFIG = normalizeConfig(envInitialConfig, BASE_CONFIG);

let configCache: WebVitalsSamplingConfig = { ...DEFAULT_CONFIG, sampleRates: { ...DEFAULT_CONFIG.sampleRates }, allowRoutes: [...DEFAULT_CONFIG.allowRoutes], allowClients: [...DEFAULT_CONFIG.allowClients] };

const listeners = new Set<WebVitalsConfigListener>();

const persistConfig = (config: WebVitalsSamplingConfig) => {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(WEB_VITALS_CONFIG_STORAGE_KEY, JSON.stringify(config));
};

const notifyListeners = () => {
  const snapshot = getWebVitalsConfig();
  listeners.forEach((listener) => listener(snapshot));
};

const applyConfig = (config: WebVitalsSamplingConfig, persist = true) => {
  configCache = config;
  if (persist) {
    persistConfig(config);
  }
  notifyListeners();
};

const bootstrapStoredConfig = () => {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    const stored = storage.getItem(WEB_VITALS_CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PartialWebVitalsSamplingConfig;
      const normalized = normalizeConfig(parsed, DEFAULT_CONFIG);
      configCache = normalized;
    }
  } catch (error) {
    if (typeof console !== 'undefined') {
      console.warn('Failed to read stored Web Vitals config:', error);
    }
  }
};

const subscribeToStorageChanges = () => {
  const win = getWindowObject();
  if (!win) return;
  win.addEventListener('storage', (event) => {
    if (event.key !== WEB_VITALS_CONFIG_STORAGE_KEY) return;
    if (!event.newValue) {
      applyConfig(normalizeConfig(undefined, DEFAULT_CONFIG), false);
      return;
    }
    try {
      const parsed = JSON.parse(event.newValue) as PartialWebVitalsSamplingConfig;
      const normalized = normalizeConfig(parsed, DEFAULT_CONFIG);
      applyConfig(normalized, false);
    } catch (error) {
      if (typeof console !== 'undefined') {
        console.warn('Failed to parse incoming Web Vitals config:', error);
      }
    }
  });
};

bootstrapStoredConfig();
subscribeToStorageChanges();

export const getWebVitalsConfig = (): WebVitalsSamplingConfig => ({
  defaultSampleRate: configCache.defaultSampleRate,
  sampleRates: { ...configCache.sampleRates },
  allowRoutes: [...configCache.allowRoutes],
  allowClients: [...configCache.allowClients],
});

export const setWebVitalsConfig = (
  config: PartialWebVitalsSamplingConfig,
  fallback: WebVitalsSamplingConfig = configCache
): WebVitalsSamplingConfig => {
  const normalized = normalizeConfig(config, fallback);
  applyConfig(normalized);
  return getWebVitalsConfig();
};

export const updateWebVitalsConfig = (
  config: PartialWebVitalsSamplingConfig
): WebVitalsSamplingConfig => setWebVitalsConfig(config, configCache);

export const resetWebVitalsConfig = (): WebVitalsSamplingConfig => {
  const storage = getLocalStorage();
  storage?.removeItem(WEB_VITALS_CONFIG_STORAGE_KEY);
  const normalized = normalizeConfig(undefined, DEFAULT_CONFIG);
  applyConfig(normalized);
  return getWebVitalsConfig();
};

export const subscribeToWebVitalsConfig = (
  listener: WebVitalsConfigListener
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const wildcardToRegex = (pattern: string): RegExp => {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const normalized = `^${escaped.replace(/\\\*/g, '.*')}$`;
  return new RegExp(normalized);
};

export const isRouteAllowlisted = (route: string, patterns: string[]): boolean =>
  patterns.some((pattern) => {
    try {
      return wildcardToRegex(pattern).test(route);
    } catch (error) {
      if (typeof console !== 'undefined') {
        console.warn('Invalid route allowlist pattern:', pattern, error);
      }
      return false;
    }
  });

export const isClientAllowlisted = (
  clientId: string,
  allowClients: string[]
): boolean => allowClients.includes(clientId);

export const getWebVitalsClientId = (): string => {
  const storage = getLocalStorage();
  if (!storage) return 'server';
  let clientId = storage.getItem(WEB_VITALS_CLIENT_ID_KEY);
  if (!clientId) {
    clientId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `client-${Math.random().toString(16).slice(2)}`;
    storage.setItem(WEB_VITALS_CLIENT_ID_KEY, clientId);
  }
  return clientId;
};

export const getSampleRateForMetric = (
  metric: WebVitalMetricName,
  config: WebVitalsSamplingConfig
): number => {
  const specific = config.sampleRates[metric];
  const rate = specific === undefined ? config.defaultSampleRate : specific;
  return clampRate(rate, config.defaultSampleRate);
};
