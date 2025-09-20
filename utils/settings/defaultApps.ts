import { safeLocalStorage } from '../safeStorage';

export type DefaultAppKind = 'protocol' | 'mime';
export type DefaultAppValue = string; // either handler id or 'ask'

export interface DefaultAppSettings {
  protocol: Record<string, DefaultAppValue>;
  mime: Record<string, DefaultAppValue>;
}

const STORAGE_KEY = 'default-app-preferences';

const DEFAULT_SETTINGS: DefaultAppSettings = {
  protocol: {
    http: 'chrome',
    https: 'chrome',
    mailto: 'system-mail',
    ssh: 'ssh',
  },
  mime: {
    'text/html': 'chrome',
    'text/plain': 'vscode',
    'application/json': 'vscode',
  },
};

export const DEFAULT_APPS_EVENT = 'default-apps:change';

type Overrides = Partial<Record<DefaultAppKind, Record<string, DefaultAppValue>>>;

const kinds: DefaultAppKind[] = ['protocol', 'mime'];

const cloneSettings = (settings: DefaultAppSettings): DefaultAppSettings => ({
  protocol: { ...settings.protocol },
  mime: { ...settings.mime },
});

const normalizeType = (type: string): string => type.trim().toLowerCase();

const sanitizeRecord = (value: unknown): Record<string, DefaultAppValue> => {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, DefaultAppValue> = {};
  Object.entries(value as Record<string, unknown>).forEach(([rawKey, rawVal]) => {
    if (typeof rawKey !== 'string') return;
    if (typeof rawVal !== 'string') return;
    const key = normalizeType(rawKey);
    if (!key) return;
    result[key] = rawVal.trim();
  });
  return result;
};

const loadOverrides = (): Overrides => {
  if (!safeLocalStorage) return {};
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      protocol: sanitizeRecord(parsed?.protocol),
      mime: sanitizeRecord(parsed?.mime),
    };
  } catch {
    return {};
  }
};

const emitChange = (detail: { kind: DefaultAppKind | 'all'; type?: string; value?: string }) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DEFAULT_APPS_EVENT, { detail }));
};

const persistOverrides = (source: Overrides) => {
  if (!safeLocalStorage) return;
  const payload: DefaultAppSettings = { protocol: {}, mime: {} };
  kinds.forEach((kind) => {
    const section = source[kind];
    if (!section) return;
    Object.entries(section).forEach(([rawType, rawValue]) => {
      if (typeof rawValue !== 'string') return;
      const type = normalizeType(rawType);
      if (!type) return;
      const value = rawValue.trim();
      const builtin = DEFAULT_SETTINGS[kind][type] ?? 'ask';
      if (value === builtin) return;
      payload[kind][type] = value;
    });
  });
  const hasProtocol = Object.keys(payload.protocol).length > 0;
  const hasMime = Object.keys(payload.mime).length > 0;
  if (!hasProtocol && !hasMime) {
    safeLocalStorage.removeItem(STORAGE_KEY);
  } else {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
};

export const getDefaultApp = (kind: DefaultAppKind, type: string): DefaultAppValue => {
  const key = normalizeType(type);
  const overrides = loadOverrides();
  const override = overrides[kind]?.[key];
  if (override) return override;
  return DEFAULT_SETTINGS[kind][key] ?? 'ask';
};

export const getBuiltinDefault = (
  kind: DefaultAppKind,
  type: string,
): DefaultAppValue | undefined => {
  const key = normalizeType(type);
  return DEFAULT_SETTINGS[kind][key];
};

export const setDefaultApp = (kind: DefaultAppKind, type: string, value: string): void => {
  const key = normalizeType(type);
  if (!key) return;
  const overrides = loadOverrides();
  if (!overrides[kind]) overrides[kind] = {};
  const builtin = DEFAULT_SETTINGS[kind][key] ?? 'ask';
  const trimmed = value.trim();
  if (!trimmed || trimmed === builtin) {
    delete overrides[kind]![key];
  } else {
    overrides[kind]![key] = trimmed;
  }
  persistOverrides(overrides);
  emitChange({ kind, type: key, value: getDefaultApp(kind, key) });
};

export const resetDefaultApps = (): void => {
  if (!safeLocalStorage) return;
  safeLocalStorage.removeItem(STORAGE_KEY);
  emitChange({ kind: 'all' });
};

export const getAllDefaultApps = (): DefaultAppSettings => {
  const overrides = loadOverrides();
  const result: DefaultAppSettings = { protocol: {}, mime: {} };
  kinds.forEach((kind) => {
    const keys = new Set([
      ...Object.keys(DEFAULT_SETTINGS[kind]),
      ...Object.keys(overrides[kind] || {}),
    ]);
    keys.forEach((key) => {
      result[kind][key] = overrides[kind]?.[key] ?? DEFAULT_SETTINGS[kind][key] ?? 'ask';
    });
  });
  return result;
};

export const exportDefaultApps = (includeDefaults = true): string => {
  if (includeDefaults) {
    return JSON.stringify(getAllDefaultApps(), null, 2);
  }
  const overrides = loadOverrides();
  const payload: DefaultAppSettings = { protocol: {}, mime: {} };
  kinds.forEach((kind) => {
    Object.assign(payload[kind], overrides[kind] || {});
  });
  return JSON.stringify(payload, null, 2);
};

export const importDefaultApps = (data: string | DefaultAppSettings): boolean => {
  let parsed: unknown = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      return false;
    }
  }
  const source = parsed as Partial<DefaultAppSettings> | null;
  if (!source || typeof source !== 'object') return false;
  const overrides: Overrides = {};
  kinds.forEach((kind) => {
    const section = sanitizeRecord((source as any)[kind]);
    if (!Object.keys(section).length) return;
    overrides[kind] = section;
  });
  persistOverrides(overrides);
  emitChange({ kind: 'all' });
  return true;
};

export const getDefaultSettings = (): DefaultAppSettings => cloneSettings(DEFAULT_SETTINGS);

