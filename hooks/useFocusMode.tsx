'use client';

import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { safeLocalStorage } from '../utils/safeStorage';
import { logEvent } from '../utils/analytics';

export type FocusOverrideMode = 'bundle' | 'immediate';
export type SummaryDeliveryReason = 'scheduled' | 'manual' | 'session_end';

export interface FocusModeSettings {
  schedule: string[];
  overrides: Record<string, FocusOverrideMode>;
  quietToasts: boolean;
  autoStart?: boolean;
}

interface FocusModeContextValue {
  settings: FocusModeSettings;
  isFocusModeActive: boolean;
  setFocusModeActive: (value: boolean) => void;
  addScheduleTime: (time: string) => void;
  removeScheduleTime: (time: string) => void;
  updateOverride: (appId: string, mode: FocusOverrideMode) => void;
  setQuietToasts: (value: boolean) => void;
  shouldDeferNotification: (appId: string, critical?: boolean) => boolean;
  registerSummaryListener: (
    listener: (reason: SummaryDeliveryReason) => number
  ) => () => void;
  deliverSummaryNow: () => number;
  nextSummaryTime: number | null;
  lastSummaryTime: number | null;
  queueLength: number;
  updateQueueLength: (count: number) => void;
}

const DEFAULT_SETTINGS: FocusModeSettings = {
  schedule: ['09:00', '13:00', '17:00'],
  overrides: {},
  quietToasts: true,
  autoStart: false,
};

const STORAGE_KEY = 'focus-mode-settings';

const normalizeTime = (value: string): string => {
  if (!value) return '00:00';
  const [rawHours, rawMinutes] = value.split(':');
  const hours = Math.max(0, Math.min(23, parseInt(rawHours ?? '0', 10) || 0));
  const minutes = Math.max(0, Math.min(59, parseInt(rawMinutes ?? '0', 10) || 0));
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`;
};

const computeNextSummaryTimestamp = (schedule: string[], now: Date): number | null => {
  if (!schedule.length) return null;
  const sorted = [...schedule].sort();
  const currentMs = now.getTime();
  const candidates = sorted.map((time) => {
    const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10));
    const candidate = new Date(now);
    candidate.setHours(hours ?? 0, minutes ?? 0, 0, 0);
    if (candidate.getTime() <= currentMs) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate.getTime();
  });
  return Math.min(...candidates);
};

export const FocusModeContext = createContext<FocusModeContextValue | null>(null);

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const initialSettings = useMemo<FocusModeSettings>(() => {
    if (!safeLocalStorage) return DEFAULT_SETTINGS;
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      const parsed = JSON.parse(raw) as Partial<FocusModeSettings>;
      const schedule = Array.isArray(parsed.schedule)
        ? parsed.schedule.map(normalizeTime)
        : DEFAULT_SETTINGS.schedule;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        schedule: [...new Set(schedule)].sort(),
      };
    } catch (err) {
      console.warn('Failed to parse focus mode settings', err);
      return DEFAULT_SETTINGS;
    }
  }, []);

  const [settings, setSettings] = useState<FocusModeSettings>(initialSettings);
  const [isFocusModeActive, setIsFocusModeActive] = useState<boolean>(
    Boolean(initialSettings.autoStart)
  );
  const [nextSummaryTime, setNextSummaryTime] = useState<number | null>(null);
  const [lastSummaryTime, setLastSummaryTime] = useState<number | null>(null);
  const [queueLength, setQueueLength] = useState<number>(0);

  const previousQueueRef = useRef<number>(0);
  const listenersRef = useRef(new Set<(reason: SummaryDeliveryReason) => number>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('Failed to persist focus mode settings', err);
    }
  }, [settings]);

  const registerSummaryListener = useCallback(
    (listener: (reason: SummaryDeliveryReason) => number) => {
      listenersRef.current.add(listener);
      return () => {
        listenersRef.current.delete(listener);
      };
    },
    []
  );

  const triggerSummaryDelivery = useCallback(
    (reason: SummaryDeliveryReason) => {
      let delivered = 0;
      listenersRef.current.forEach((listener) => {
        try {
          delivered += listener(reason) || 0;
        } catch (err) {
          console.error('Focus summary listener failed', err);
        }
      });
      if (delivered > 0) {
        previousQueueRef.current = 0;
        setQueueLength(0);
      }
      const timestamp = Date.now();
      setLastSummaryTime(timestamp);
      logEvent({
        category: 'FocusMode',
        action: 'summary_delivered',
        label: reason,
        value: delivered,
      });
      return delivered;
    },
    []
  );

  const scheduleNextDelivery = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isFocusModeActive || settings.schedule.length === 0) {
      setNextSummaryTime(null);
      return;
    }
    const next = computeNextSummaryTimestamp(settings.schedule, new Date());
    setNextSummaryTime(next);
    if (next === null) return;
    const delay = Math.max(next - Date.now(), 0);
    timerRef.current = setTimeout(() => {
      triggerSummaryDelivery('scheduled');
      scheduleNextDelivery();
    }, delay);
  }, [isFocusModeActive, settings.schedule, triggerSummaryDelivery]);

  useEffect(() => {
    scheduleNextDelivery();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [scheduleNextDelivery]);

  const addScheduleTime = useCallback((time: string) => {
    const normalized = normalizeTime(time);
    setSettings((prev) => {
      if (prev.schedule.includes(normalized)) return prev;
      const schedule = [...prev.schedule, normalized].sort();
      return { ...prev, schedule };
    });
  }, []);

  const removeScheduleTime = useCallback((time: string) => {
    setSettings((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((entry) => entry !== time),
    }));
  }, []);

  const updateOverride = useCallback((appId: string, mode: FocusOverrideMode) => {
    setSettings((prev) => {
      const overrides = { ...prev.overrides };
      if (mode === 'bundle') {
        delete overrides[appId];
      } else {
        overrides[appId] = mode;
      }
      return { ...prev, overrides };
    });
  }, []);

  const setQuietToasts = useCallback((value: boolean) => {
    setSettings((prev) => ({ ...prev, quietToasts: value }));
  }, []);

  const shouldDeferNotification = useCallback(
    (appId: string, critical: boolean = false) => {
      if (!isFocusModeActive || critical) return false;
      const override = settings.overrides[appId];
      if (override === 'immediate') return false;
      return true;
    },
    [isFocusModeActive, settings.overrides]
  );

  const deliverSummaryNow = useCallback(() => {
    const delivered = triggerSummaryDelivery('manual');
    scheduleNextDelivery();
    return delivered;
  }, [scheduleNextDelivery, triggerSummaryDelivery]);

  const updateQueueLength = useCallback(
    (count: number) => {
      if (queueLength === count) return;
      setQueueLength(count);
      const previous = previousQueueRef.current;
      previousQueueRef.current = count;
      if (isFocusModeActive && previous === 0 && count > 0) {
        logEvent({
          category: 'FocusMode',
          action: 'notification_queued',
          value: count,
        });
      }
    },
    [isFocusModeActive, queueLength]
  );

  const setFocusModeActive = useCallback(
    (value: boolean) => {
      setIsFocusModeActive(value);
      if (value) {
        logEvent({ category: 'FocusMode', action: 'session_start' });
      } else {
        logEvent({
          category: 'FocusMode',
          action: 'session_end',
          value: queueLength,
        });
        triggerSummaryDelivery('session_end');
      }
    },
    [queueLength, triggerSummaryDelivery]
  );

  useEffect(() => {
    if (settings.autoStart && !isFocusModeActive) {
      setFocusModeActive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<FocusModeContextValue>(
    () => ({
      settings,
      isFocusModeActive,
      setFocusModeActive,
      addScheduleTime,
      removeScheduleTime,
      updateOverride,
      setQuietToasts,
      shouldDeferNotification,
      registerSummaryListener,
      deliverSummaryNow,
      nextSummaryTime,
      lastSummaryTime,
      queueLength,
      updateQueueLength,
    }),
    [
      settings,
      isFocusModeActive,
      setFocusModeActive,
      addScheduleTime,
      removeScheduleTime,
      updateOverride,
      setQuietToasts,
      shouldDeferNotification,
      registerSummaryListener,
      deliverSummaryNow,
      nextSummaryTime,
      lastSummaryTime,
      queueLength,
      updateQueueLength,
    ]
  );

  return <FocusModeContext.Provider value={value}>{children}</FocusModeContext.Provider>;
}

export const useFocusMode = (): FocusModeContextValue => {
  const ctx = useContext(FocusModeContext);
  if (!ctx) {
    throw new Error('useFocusMode must be used within FocusModeProvider');
  }
  return ctx;
};

export default useFocusMode;
