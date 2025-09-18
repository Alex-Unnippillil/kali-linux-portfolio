export type TelemetryChannel = 'analytics' | 'usage' | 'diagnostics';

export interface TelemetryPreferences {
  analytics: boolean;
  usage: boolean;
  diagnostics: boolean;
}

export const TELEMETRY_CATEGORIES: ReadonlyArray<{
  id: TelemetryChannel;
  title: string;
  description: string;
  documentation: string;
}> = [
  {
    id: 'analytics',
    title: 'Product analytics',
    description:
      'Counts high-level interactions such as app launches or completed challenges. Data is aggregated and never contains personal identifiers.',
    documentation:
      'These events help prioritize which simulations people open most often. No IP addresses, emails, or command output is collected.',
  },
  {
    id: 'usage',
    title: 'Anonymized usage metrics',
    description:
      'Captures coarse session timing, viewport sizes, and control preferences to keep demos usable across devices.',
    documentation:
      'Usage metrics are averaged before review and only include derived values such as duration buckets or UI density choices.',
  },
  {
    id: 'diagnostics',
    title: 'Crash diagnostics',
    description:
      'Stores stack traces when a mini-app throws so we can reproduce bugs locally without raw user content.',
    documentation:
      'Only framework error messages are buffered. Command history, form input, and uploaded files are explicitly excluded.',
  },
];

export const TELEMETRY_DEFAULTS: TelemetryPreferences = {
  analytics: false,
  usage: false,
  diagnostics: false,
};

const STORAGE_KEY = 'telemetry-preferences';

type PreferencesListener = (prefs: TelemetryPreferences) => void;
const listeners = new Set<PreferencesListener>();

const clonePreferences = (prefs: TelemetryPreferences): TelemetryPreferences => ({
  analytics: prefs.analytics,
  usage: prefs.usage,
  diagnostics: prefs.diagnostics,
});

export const getTelemetryPreferences = (): TelemetryPreferences => {
  if (typeof window === 'undefined') {
    return clonePreferences(TELEMETRY_DEFAULTS);
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return clonePreferences(TELEMETRY_DEFAULTS);
    }
    const parsed = JSON.parse(stored) as Partial<TelemetryPreferences>;
    return {
      analytics:
        typeof parsed.analytics === 'boolean'
          ? parsed.analytics
          : TELEMETRY_DEFAULTS.analytics,
      usage:
        typeof parsed.usage === 'boolean' ? parsed.usage : TELEMETRY_DEFAULTS.usage,
      diagnostics:
        typeof parsed.diagnostics === 'boolean'
          ? parsed.diagnostics
          : TELEMETRY_DEFAULTS.diagnostics,
    };
  } catch (error) {
    console.warn('Unable to read telemetry preferences', error);
    return clonePreferences(TELEMETRY_DEFAULTS);
  }
};

const saveTelemetryPreferences = (prefs: TelemetryPreferences): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
};

const notifyListeners = (prefs: TelemetryPreferences): void => {
  const snapshot = clonePreferences(prefs);
  listeners.forEach((listener) => listener(snapshot));
};

export const setTelemetryPreference = (
  channel: TelemetryChannel,
  enabled: boolean,
): TelemetryPreferences => {
  const current = getTelemetryPreferences();
  if (current[channel] === enabled) {
    return current;
  }
  const next = { ...current, [channel]: enabled } as TelemetryPreferences;
  saveTelemetryPreferences(next);
  notifyListeners(next);
  return next;
};

export const setTelemetryPreferences = (
  prefs: Partial<TelemetryPreferences>,
): TelemetryPreferences => {
  const next = { ...getTelemetryPreferences(), ...prefs } as TelemetryPreferences;
  saveTelemetryPreferences(next);
  notifyListeners(next);
  return next;
};

export const subscribeToTelemetryPreferences = (
  listener: PreferencesListener,
): (() => void) => {
  listeners.add(listener);
  listener(clonePreferences(getTelemetryPreferences()));
  return () => {
    listeners.delete(listener);
  };
};

export const resetTelemetryPreferences = (): void => {
  saveTelemetryPreferences(clonePreferences(TELEMETRY_DEFAULTS));
  notifyListeners(clonePreferences(TELEMETRY_DEFAULTS));
};
