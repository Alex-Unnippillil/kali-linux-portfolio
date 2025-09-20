"use client";

import { useCallback, useEffect, useState } from 'react';

export interface DesktopSettings {
  hideLabelsWhenTidy: boolean;
}

const STORAGE_KEY = 'desktop:settings';
const DEFAULT_SETTINGS: DesktopSettings = {
  hideLabelsWhenTidy: false,
};

type Listener = (settings: DesktopSettings) => void;
const listeners = new Set<Listener>();
let cache: DesktopSettings | null = null;

const readFromStorage = (): DesktopSettings => {
  if (cache) return { ...cache };
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.hideLabelsWhenTidy === 'boolean') {
        cache = { hideLabelsWhenTidy: parsed.hideLabelsWhenTidy };
        return { ...cache };
      }
    }
  } catch {
    // ignore parse errors and fall back to defaults
  }
  cache = { ...DEFAULT_SETTINGS };
  return { ...cache };
};

const writeToStorage = (settings: DesktopSettings) => {
  cache = { ...settings };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      // ignore storage errors
    }
  }
  listeners.forEach((listener) => listener({ ...cache! }));
};

export const getDesktopSettings = (): DesktopSettings => readFromStorage();

export const setDesktopSettings = (partial: Partial<DesktopSettings>) => {
  const current = readFromStorage();
  writeToStorage({ ...current, ...partial });
};

export const getHideLabelsWhenTidy = (): boolean => readFromStorage().hideLabelsWhenTidy;

export const setHideLabelsWhenTidy = (value: boolean) => {
  setDesktopSettings({ hideLabelsWhenTidy: value });
};

export const subscribeDesktopSettings = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useHideLabelsWhenTidySetting = (): [boolean, (value: boolean) => void] => {
  const [value, setValue] = useState<boolean>(() => getHideLabelsWhenTidy());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    // ensure we sync with any updates that happened before hydration
    setValue(getHideLabelsWhenTidy());
    const unsubscribe = subscribeDesktopSettings((settings) => {
      setValue(settings.hideLabelsWhenTidy);
    });
    return unsubscribe;
  }, []);

  const update = useCallback((next: boolean) => {
    setValue(next);
    setHideLabelsWhenTidy(next);
  }, []);

  return [value, update];
};

export const shouldHideIconLabels = (tidy: boolean): boolean => tidy && getHideLabelsWhenTidy();

export const desktopDefaults = { ...DEFAULT_SETTINGS };
