"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import usePersistentState from "./usePersistentState";
import { logEvent } from "../utils/analytics";

export type FocusDeliveryMode = "bundle" | "immediate" | "mute";

interface FocusConfig {
  summaryIntervalMinutes: number;
  perAppOverrides: Record<string, FocusDeliveryMode>;
  silenceNotifications: boolean;
}

interface FocusModeContextValue {
  config: FocusConfig;
  updateConfig: (
    patch: Partial<Pick<FocusConfig, "summaryIntervalMinutes" | "silenceNotifications">>,
  ) => void;
  updateAppOverride: (appId: string, mode: FocusDeliveryMode) => void;
  clearAppOverrides: () => void;
  getAppDeliveryMode: (appId: string) => FocusDeliveryMode;
  isFocusActive: boolean;
  startFocus: () => void;
  stopFocus: () => void;
  triggerSummaryNow: () => void;
  summarySignal: number;
  lastSummaryAt: number | null;
  nextSummaryAt: number | null;
  shouldSilenceNotifications: boolean;
}

const defaultConfig: FocusConfig = {
  summaryIntervalMinutes: 30,
  perAppOverrides: {},
  silenceNotifications: true,
};

const isFocusDeliveryMode = (value: unknown): value is FocusDeliveryMode =>
  value === "bundle" || value === "immediate" || value === "mute";

const isFocusConfig = (value: unknown): value is FocusConfig => {
  if (!value || typeof value !== "object") return false;
  const cfg = value as FocusConfig;
  if (typeof cfg.summaryIntervalMinutes !== "number") return false;
  if (typeof cfg.silenceNotifications !== "boolean") return false;
  if (!cfg.perAppOverrides || typeof cfg.perAppOverrides !== "object") return false;
  return Object.values(cfg.perAppOverrides).every(isFocusDeliveryMode);
};

const FocusModeContext = createContext<FocusModeContextValue | undefined>(undefined);

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = usePersistentState<FocusConfig>(
    "focus-mode-config",
    defaultConfig,
    isFocusConfig,
  );
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [summarySignal, setSummarySignal] = useState(0);
  const [lastSummaryAt, setLastSummaryAt] = useState<number | null>(null);

  const updateConfig = useCallback<FocusModeContextValue["updateConfig"]>(
    (patch) => {
      setConfig((prev) => {
        const next: FocusConfig = {
          summaryIntervalMinutes:
            patch.summaryIntervalMinutes ?? prev.summaryIntervalMinutes,
          perAppOverrides: prev.perAppOverrides,
          silenceNotifications:
            patch.silenceNotifications ?? prev.silenceNotifications,
        };
        return next;
      });
      if (patch.summaryIntervalMinutes !== undefined) {
        logEvent({
          category: "focus-mode",
          action: "interval",
          value: Math.round(patch.summaryIntervalMinutes),
        });
      }
      if (patch.silenceNotifications !== undefined) {
        logEvent({
          category: "focus-mode",
          action: patch.silenceNotifications ? "silence-on" : "silence-off",
        });
      }
    },
    [setConfig],
  );

  const updateAppOverride = useCallback<FocusModeContextValue["updateAppOverride"]>(
    (appId, mode) => {
      setConfig((prev) => {
        const overrides = { ...prev.perAppOverrides };
        if (mode === "bundle") delete overrides[appId];
        else overrides[appId] = mode;
        return { ...prev, perAppOverrides: overrides };
      });
      logEvent({ category: "focus-mode", action: "override", label: `${appId}:${mode}` });
    },
    [setConfig],
  );

  const clearAppOverrides = useCallback(() => {
    setConfig((prev) => ({ ...prev, perAppOverrides: {} }));
    logEvent({ category: "focus-mode", action: "clear-overrides" });
  }, [setConfig]);

  const getAppDeliveryMode = useCallback<FocusModeContextValue["getAppDeliveryMode"]>(
    (appId) => config.perAppOverrides[appId] ?? "bundle",
    [config.perAppOverrides],
  );

  const startFocus = useCallback(() => {
    setIsFocusActive(true);
    const now = Date.now();
    setLastSummaryAt(now);
    logEvent({
      category: "focus-mode",
      action: "start",
      value: Math.round(config.summaryIntervalMinutes),
    });
  }, [config.summaryIntervalMinutes]);

  const stopFocus = useCallback(() => {
    setIsFocusActive(false);
    logEvent({ category: "focus-mode", action: "stop" });
  }, []);

  const triggerSummaryNow = useCallback(() => {
    setSummarySignal((prev) => prev + 1);
    setLastSummaryAt(Date.now());
    logEvent({ category: "focus-mode", action: "summary-now" });
  }, []);

  useEffect(() => {
    if (!isFocusActive) return undefined;
    const intervalMinutes = Math.max(1, config.summaryIntervalMinutes || 1);
    const intervalMs = intervalMinutes * 60 * 1000;
    const timer = window.setInterval(() => {
      setSummarySignal((prev) => prev + 1);
      setLastSummaryAt(Date.now());
      logEvent({ category: "focus-mode", action: "summary-tick" });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [config.summaryIntervalMinutes, isFocusActive]);

  const nextSummaryAt = useMemo(() => {
    if (!isFocusActive) return null;
    const base = lastSummaryAt ?? Date.now();
    return base + config.summaryIntervalMinutes * 60 * 1000;
  }, [config.summaryIntervalMinutes, isFocusActive, lastSummaryAt]);

  const value = useMemo<FocusModeContextValue>(
    () => ({
      config,
      updateConfig,
      updateAppOverride,
      clearAppOverrides,
      getAppDeliveryMode,
      isFocusActive,
      startFocus,
      stopFocus,
      triggerSummaryNow,
      summarySignal,
      lastSummaryAt,
      nextSummaryAt,
      shouldSilenceNotifications: isFocusActive && config.silenceNotifications,
    }),
    [
      clearAppOverrides,
      config,
      getAppDeliveryMode,
      isFocusActive,
      lastSummaryAt,
      nextSummaryAt,
      startFocus,
      stopFocus,
      summarySignal,
      triggerSummaryNow,
      updateAppOverride,
      updateConfig,
    ],
  );

  return <FocusModeContext.Provider value={value}>{children}</FocusModeContext.Provider>;
}

export const useFocusMode = () => {
  const ctx = useContext(FocusModeContext);
  if (!ctx) throw new Error("useFocusMode must be used within FocusModeProvider");
  return ctx;
};

export const useOptionalFocusMode = () => useContext(FocusModeContext);

