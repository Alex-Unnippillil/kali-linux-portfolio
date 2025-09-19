import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useSettings } from './useSettings';

export type FeatureFlagValue = boolean | number | string;
export type FeatureFlagOverrides = Record<string, FeatureFlagValue>;
export type FeatureFlagStatus = 'idle' | 'loading' | 'ready' | 'blocked' | 'error';

type FeatureFlagState = {
  overrides: FeatureFlagOverrides;
  manualOverrides: FeatureFlagOverrides;
  source: string | null;
  status: FeatureFlagStatus;
  error: string | null;
};

const isValidValue = (value: unknown): value is FeatureFlagValue =>
  typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string';

export const defaultFeatureFlags: Readonly<FeatureFlagOverrides> = Object.freeze({
  toolApis: false,
  hydra: false,
  john: false,
  developerMenu: false,
});

let state: FeatureFlagState = {
  overrides: {},
  manualOverrides: {},
  source: null,
  status: 'idle',
  error: null,
};

let allowNetwork = false;
let fetchVersion = 0;
let snapshotVersion = 0;
let cachedSnapshot: FeatureFlagSnapshot | null = null;
let cachedSnapshotVersion = -1;

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const sanitizePayload = (payload: unknown): FeatureFlagOverrides => {
  if (!payload || typeof payload !== 'object') return {};
  const result: FeatureFlagOverrides = {};
  Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
    if (isValidValue(value)) {
      result[key] = value;
    }
  });
  return result;
};

const computeFlags = (): FeatureFlagOverrides => ({
  ...defaultFeatureFlags,
  ...state.overrides,
  ...state.manualOverrides,
});

type FeatureFlagSnapshot = {
  flags: FeatureFlagOverrides;
  overrides: FeatureFlagOverrides;
  manualOverrides: FeatureFlagOverrides;
  source: string | null;
  status: FeatureFlagStatus;
  error: string | null;
};

const getSnapshot = (): FeatureFlagSnapshot => {
  if (!cachedSnapshot || cachedSnapshotVersion !== snapshotVersion) {
    cachedSnapshot = {
      flags: computeFlags(),
      overrides: state.overrides,
      manualOverrides: state.manualOverrides,
      source: state.source,
      status: state.status,
      error: state.error,
    };
    cachedSnapshotVersion = snapshotVersion;
  }
  return cachedSnapshot;
};

const getServerSnapshot = getSnapshot;

const updateState = (partial: Partial<FeatureFlagState>) => {
  state = { ...state, ...partial };
  snapshotVersion += 1;
  cachedSnapshot = null;
  emit();
};

const setManualOverrideValue = (key: string, value: FeatureFlagValue) => {
  if (!isValidValue(value)) return;
  updateState({ manualOverrides: { ...state.manualOverrides, [key]: value } });
};

const clearManualOverrideValue = (key: string) => {
  if (!(key in state.manualOverrides)) return;
  const { [key]: _removed, ...rest } = state.manualOverrides;
  updateState({ manualOverrides: rest });
};

const clearAllManualOverrideValues = () => {
  if (Object.keys(state.manualOverrides).length === 0) return;
  updateState({ manualOverrides: {} });
};

const fetchOverrides = async (): Promise<void> => {
  const source = state.source;
  if (!source) return;

  const currentVersion = ++fetchVersion;

  if (!allowNetwork) {
    updateState({ status: 'blocked', error: 'Network access disabled by settings.' });
    return;
  }

  updateState({ status: 'loading', error: null });

  try {
    const response = await fetch(source, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (currentVersion !== fetchVersion) return;
    const overrides = sanitizePayload(data);
    updateState({ overrides, status: 'ready', error: null });
  } catch (error) {
    if (currentVersion !== fetchVersion) return;
    const message = error instanceof Error ? error.message : 'Unknown error';
    updateState({ overrides: {}, status: 'error', error: message });
  }
};

const setSource = async (url: string | null): Promise<void> => {
  const normalized = url && url.trim().length > 0 ? url.trim() : null;
  fetchVersion += 1;
  updateState({ source: normalized });
  if (!normalized) {
    updateState({ overrides: {}, status: 'idle', error: null });
    return;
  }
  await fetchOverrides();
};

const refresh = async (): Promise<void> => {
  await fetchOverrides();
};

const updateAllowNetworkSetting = (value: boolean) => {
  if (allowNetwork === value) return;
  allowNetwork = value;
  if (!value) {
    if (state.source) {
      updateState({ status: 'blocked', error: 'Network access disabled by settings.' });
    } else {
      updateState({ status: 'idle', error: null });
    }
    return;
  }
  updateState({ status: 'idle', error: null });
  if (state.source) {
    void fetchOverrides();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useFeatureFlags() {
  const { allowNetwork } = useSettings();

  useEffect(() => {
    updateAllowNetworkSetting(allowNetwork);
  }, [allowNetwork]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setOverrideUrl = useCallback((url: string | null) => setSource(url), []);
  const refreshOverrides = useCallback(() => refresh(), []);
  const setFlag = useCallback((key: string, value: FeatureFlagValue) => {
    setManualOverrideValue(key, value);
  }, []);
  const resetFlag = useCallback((key: string) => {
    clearManualOverrideValue(key);
  }, []);
  const clearAllFlags = useCallback(() => {
    clearAllManualOverrideValues();
  }, []);

  return {
    ...snapshot,
    defaults: defaultFeatureFlags,
    setOverrideUrl,
    refreshOverrides,
    setFlag,
    resetFlag,
    clearAllFlags,
  };
}

export const __resetFeatureFlagStoreForTests = () => {
  state = {
    overrides: {},
    manualOverrides: {},
    source: null,
    status: 'idle',
    error: null,
  };
  allowNetwork = false;
  fetchVersion = 0;
  snapshotVersion = 0;
  cachedSnapshot = null;
  cachedSnapshotVersion = -1;
  emit();
};
