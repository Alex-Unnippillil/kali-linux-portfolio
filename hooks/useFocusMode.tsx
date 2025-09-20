import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { logEvent } from '../utils/analytics';
import {
  defaultFocusSettings,
  loadFocusSettings,
  normalizeTime,
  sanitizeOverride,
  saveFocusSettings,
} from '../utils/focusStore';
import { FocusAppOverride, FocusSettingsState } from '../types/focus';

export interface FocusDeliveryPolicy {
  mode: 'immediate' | 'bundle' | 'mute';
  schedule: string[];
}

export interface FocusSessionMetrics {
  suppressed: number;
  delivered: number;
  startedAt: number | null;
  lastSummaryAt: number | null;
}

interface FocusModeContextValue {
  enabled: boolean;
  schedule: string[];
  perAppOverrides: Record<string, FocusAppOverride>;
  setEnabled: (value: boolean) => void;
  addScheduleTime: (value: string) => void;
  removeScheduleTime: (value: string) => void;
  updateOverride: (appId: string, override: FocusAppOverride) => void;
  removeOverride: (appId: string) => void;
  getDeliveryPolicy: (appId: string) => FocusDeliveryPolicy;
  recordSuppressedNotification: (appId: string) => void;
  recordSummaryDelivery: (appId: string, count: number) => void;
  sessionMetrics: FocusSessionMetrics;
  shouldSilenceToasts: boolean;
}

const FocusModeContext = createContext<FocusModeContextValue | undefined>(undefined);

const getFallbackSchedule = (schedule: string[]): string[] =>
  schedule.length ? schedule : defaultFocusSettings.schedule;

export const FocusModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<FocusSettingsState>(defaultFocusSettings);
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<FocusSessionMetrics>({
    suppressed: 0,
    delivered: 0,
    startedAt: null,
    lastSummaryAt: null,
  });

  useEffect(() => {
    const data = loadFocusSettings();
    setSettings(data);
    setHydrated(true);
    if (data.enabled) {
      setSession({
        suppressed: 0,
        delivered: 0,
        startedAt: Date.now(),
        lastSummaryAt: null,
      });
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveFocusSettings(settings);
  }, [hydrated, settings]);

  const setEnabled = useCallback((value: boolean) => {
    let changed = false;
    setSettings(prev => {
      if (prev.enabled === value) return prev;
      changed = true;
      return { ...prev, enabled: value };
    });
    if (!changed) return;
    setSession(prev => {
      if (value) {
        logEvent({ category: 'FocusMode', action: 'enabled' });
        return {
          suppressed: 0,
          delivered: 0,
          startedAt: Date.now(),
          lastSummaryAt: null,
        };
      }
      logEvent({
        category: 'FocusMode',
        action: 'disabled',
        value: prev.suppressed,
      });
      return { ...prev, startedAt: null };
    });
  }, []);

  const addScheduleTime = useCallback((value: string) => {
    const normalized = normalizeTime(value);
    if (!normalized) return;
    setSettings(prev => {
      if (prev.schedule.includes(normalized)) return prev;
      const next = [...prev.schedule, normalized].sort();
      return { ...prev, schedule: next };
    });
  }, []);

  const removeScheduleTime = useCallback((value: string) => {
    setSettings(prev => {
      if (!prev.schedule.includes(value)) return prev;
      const next = prev.schedule.filter(time => time !== value);
      return { ...prev, schedule: next };
    });
  }, []);

  const updateOverride = useCallback((appId: string, override: FocusAppOverride) => {
    setSettings(prev => {
      const next = {
        ...prev.perAppOverrides,
        [appId]: sanitizeOverride(override),
      };
      return { ...prev, perAppOverrides: next };
    });
  }, []);

  const removeOverride = useCallback((appId: string) => {
    setSettings(prev => {
      if (!prev.perAppOverrides[appId]) return prev;
      const next = { ...prev.perAppOverrides };
      delete next[appId];
      return { ...prev, perAppOverrides: next };
    });
  }, []);

  const recordSuppressedNotification = useCallback(() => {
    setSession(prev => ({ ...prev, suppressed: prev.suppressed + 1 }));
  }, []);

  const recordSummaryDelivery = useCallback((appId: string, count: number) => {
    setSession(prev => ({
      ...prev,
      delivered: prev.delivered + count,
      lastSummaryAt: Date.now(),
    }));
    logEvent({
      category: 'FocusMode',
      action: 'summary-delivered',
      label: appId,
      value: count,
    });
  }, []);

  const getDeliveryPolicy = useCallback(
    (appId: string): FocusDeliveryPolicy => {
      if (!settings.enabled) {
        return { mode: 'immediate', schedule: [] };
      }
      const override = settings.perAppOverrides[appId];
      if (!override || override.mode === 'inherit') {
        return { mode: 'bundle', schedule: getFallbackSchedule(settings.schedule) };
      }
      if (override.mode === 'custom') {
        const schedule = getFallbackSchedule(override.schedule ?? settings.schedule);
        return { mode: 'bundle', schedule };
      }
      if (override.mode === 'mute') {
        return { mode: 'mute', schedule: [] };
      }
      return { mode: 'immediate', schedule: [] };
    },
    [settings]
  );

  const value = useMemo<FocusModeContextValue>(
    () => ({
      enabled: settings.enabled,
      schedule: settings.schedule,
      perAppOverrides: settings.perAppOverrides,
      setEnabled,
      addScheduleTime,
      removeScheduleTime,
      updateOverride,
      removeOverride,
      getDeliveryPolicy,
      recordSuppressedNotification,
      recordSummaryDelivery,
      sessionMetrics: session,
      shouldSilenceToasts: settings.enabled,
    }),
    [
      addScheduleTime,
      getDeliveryPolicy,
      recordSummaryDelivery,
      recordSuppressedNotification,
      removeOverride,
      removeScheduleTime,
      session,
      setEnabled,
      settings.enabled,
      settings.perAppOverrides,
      settings.schedule,
      updateOverride,
    ]
  );

  return (
    <FocusModeContext.Provider value={value}>
      {children}
    </FocusModeContext.Provider>
  );
};

export const useFocusMode = (): FocusModeContextValue => {
  const ctx = useContext(FocusModeContext);
  if (!ctx) {
    throw new Error('useFocusMode must be used within a FocusModeProvider');
  }
  return ctx;
};

