import { defaultTelemetry } from './settingsStore';

type TelemetryCategory = 'performance' | 'errors' | 'features';

type TelemetryConsent = Record<TelemetryCategory, boolean>;

type TelemetryPayload = Record<string, unknown>;

interface TelemetryEvent {
  category: TelemetryCategory;
  timestamp: string;
  context: {
    route: string;
    locale: string;
    appVersion: string;
  };
  payload: TelemetryPayload;
}

interface SampleDefinition {
  title: string;
  description: string;
  payload: TelemetryPayload;
}

const REDACTED_VALUE = '[redacted]';

const SENSITIVE_KEYS = new Set([
  'sessionid',
  'userid',
  'useremail',
  'email',
  'userhandle',
  'accountid',
  'deviceid',
  'auth',
  'token',
  'apikey',
]);

const SAMPLE_DEFINITIONS: Record<TelemetryCategory, SampleDefinition> = {
  performance: {
    title: 'Performance diagnostics',
    description:
      'Frame timings and resource counts help highlight slow screens without storing personal data.',
    payload: {
      sessionId: '1a2b3c',
      route: '/apps/terminal',
      lcp: 2130,
      hydrationDurationMs: 420,
      assetCount: 37,
      deviceProfile: 'desktop',
    },
  },
  errors: {
    title: 'Crash reports',
    description:
      'Redacted stack traces capture the origin of a failure so we can fix it quickly.',
    payload: {
      sessionId: '1a2b3c',
      userEmail: 'operator@example.com',
      message: 'Cannot read properties of undefined',
      componentStack: ['Desktop', 'WindowManager', 'TerminalApp'],
      stack:
        'TypeError: Cannot read properties of undefined\n    at Terminal.js:42:12\n    at commitHookEffectListMount',
    },
  },
  features: {
    title: 'Feature adoption',
    description:
      'Counts how often core tools are used so we focus on the right improvements.',
    payload: {
      sessionId: '1a2b3c',
      userHandle: '@operator',
      feature: 'launcher.open',
      intent: 'launch-app',
      surface: 'dock',
    },
  },
};

const DEFAULT_CONSENT: TelemetryConsent = { ...defaultTelemetry };

let consentState: TelemetryConsent = { ...DEFAULT_CONSENT };
let queue: TelemetryEvent[] = [];
let flushing = false;

const listeners = new Set<(consent: TelemetryConsent) => void>();

const getGlobalFetch = (): typeof fetch | null => {
  if (typeof fetch === 'function') return fetch;
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).fetch === 'function') {
    return (globalThis as any).fetch;
  }
  return null;
};

const shouldRedactKey = (key: string): boolean => {
  if (!key) return false;
  const normalized = key.toLowerCase();
  if (SENSITIVE_KEYS.has(normalized)) return true;
  return normalized.includes('session') || normalized.includes('user');
};

const sanitizeValue = (value: unknown, key: string): unknown => {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key));
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
      entryKey,
      sanitizeValue(entryValue, entryKey),
    ]);
    return Object.fromEntries(entries);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    if (shouldRedactKey(key) || (typeof value === 'string' && value.includes('@'))) {
      return REDACTED_VALUE;
    }
  }
  return value;
};

export const sanitizeTelemetryPayload = (payload: TelemetryPayload): TelemetryPayload => {
  const entries = Object.entries(payload).map(([key, value]) => [key, sanitizeValue(value, key)]);
  return Object.fromEntries(entries);
};

const getContext = () => {
  if (typeof window === 'undefined') {
    return {
      route: '/server',
      locale: 'en-US',
      appVersion: 'desktop-sim',
    };
  }
  const route = window.location?.pathname || '/';
  const locale = navigator?.language || 'en-US';
  return {
    route,
    locale,
    appVersion: 'desktop-sim',
  };
};

const createEvent = (
  category: TelemetryCategory,
  payload: TelemetryPayload,
): TelemetryEvent => ({
  category,
  timestamp: new Date().toISOString(),
  context: getContext(),
  payload: sanitizeTelemetryPayload(payload),
});

const processQueue = async () => {
  if (flushing) return;
  flushing = true;
  try {
    const transport = getGlobalFetch();
    if (!transport) {
      queue = [];
      return;
    }
    while (queue.length > 0) {
      const event = queue.shift()!;
      if (!consentState[event.category]) {
        continue;
      }
      try {
        await transport('/api/telemetry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
          keepalive: true,
        });
      } catch (error) {
        queue.unshift(event);
        if (typeof console !== 'undefined') {
          console.debug('Telemetry send failed, will retry later', error);
        }
        break;
      }
    }
  } finally {
    flushing = false;
  }
};

export const enqueueTelemetry = (
  category: TelemetryCategory,
  payload: TelemetryPayload,
): void => {
  if (typeof window === 'undefined') return;
  queue.push(createEvent(category, payload));
  void processQueue();
};

export const updateTelemetryConsent = (nextConsent: TelemetryConsent): void => {
  consentState = { ...nextConsent };
  queue = queue.filter((event) => consentState[event.category]);
  listeners.forEach((listener) => listener(consentState));
  void processQueue();
};

export const getTelemetryConsent = (): TelemetryConsent => ({ ...consentState });

export const subscribeToTelemetryConsent = (
  listener: (consent: TelemetryConsent) => void,
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const flushTelemetryQueue = async (): Promise<void> => {
  await processQueue();
};

export const buildSampleTelemetryPayload = (
  category: TelemetryCategory,
): TelemetryEvent => {
  const sample = SAMPLE_DEFINITIONS[category];
  return createEvent(category, sample.payload);
};

export const TELEMETRY_CATEGORY_INFO: Record<
  TelemetryCategory,
  { title: string; description: string }
> = Object.fromEntries(
  (Object.entries(SAMPLE_DEFINITIONS) as [TelemetryCategory, SampleDefinition][]).map(
    ([category, definition]) => [
      category,
      {
        title: definition.title,
        description: definition.description,
      },
    ],
  ),
) as Record<TelemetryCategory, { title: string; description: string }>;

export const recordFeatureUsage = (feature: string, extra: TelemetryPayload = {}) => {
  enqueueTelemetry('features', { feature, ...extra });
};

export const __resetTelemetryStateForTests = () => {
  consentState = { ...DEFAULT_CONSENT };
  queue = [];
  flushing = false;
};

export type { TelemetryCategory, TelemetryConsent, TelemetryEvent };
