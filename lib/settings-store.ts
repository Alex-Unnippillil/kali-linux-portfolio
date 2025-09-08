import { useState, useEffect, useCallback } from "react";
import { isBrowser } from "@/utils/env";

export interface QuickSettingsState {
  wifi: boolean;
  bluetooth: boolean;
  brightness: number;
}

const KEY = "quick-settings";

const defaults: QuickSettingsState = {
  wifi: true,
  bluetooth: true,
  brightness: 100,
};

function load(): QuickSettingsState {
  if (!isBrowser()) return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

function save(state: QuickSettingsState) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function useQuickSettings() {
  const [settings, setSettings] = useState<QuickSettingsState>(() => load());

  useEffect(() => {
    save(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<QuickSettingsState>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return { settings, update };
}

