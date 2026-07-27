"use client";

import { useCallback, useEffect, useState } from "react";
import ToggleSwitch from "./ToggleSwitch";

const STORAGE_KEY = "ui:theme-alt";

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => unknown;
};

const parseStoredValue = (value: string | null): boolean | null => {
  if (value === null) return null;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
};

const readStoredPreference = (): boolean | null => {
  if (typeof window === "undefined") return null;
  try {
    return parseStoredValue(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

const writeStoredPreference = (next: boolean) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    /* ignore storage errors (e.g. private mode) */
  }
};

const shouldUseViewTransitions = (): boolean => {
  if (typeof document === "undefined") return false;
  const doc = document as DocumentWithViewTransition;
  if (typeof doc.startViewTransition !== "function") {
    return false;
  }

  if (document.documentElement.classList.contains("reduced-motion")) {
    return false;
  }

  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return false;
  }

  return true;
};

interface ThemeSwitchProps {
  className?: string;
}

const ThemeSwitch = ({ className }: ThemeSwitchProps) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const stored = readStoredPreference();
    const initial =
      stored !== null ? stored : root.classList.contains("theme-alt");

    root.classList.toggle("theme-alt", initial);
    setEnabled(initial);

    if (stored === null) {
      writeStoredPreference(initial);
    }

    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const storedValue = parseStoredValue(event.newValue);
      const next = storedValue ?? false;
      root.classList.toggle("theme-alt", next);
      setEnabled(next);
      if (storedValue === null) {
        writeStoredPreference(next);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleChange = useCallback((next: boolean) => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const current = root.classList.contains("theme-alt");

    if (current === next) {
      setEnabled(next);
      writeStoredPreference(next);
      return;
    }

    const apply = () => {
      root.classList.toggle("theme-alt", next);
      setEnabled(next);
      writeStoredPreference(next);
    };

    if (shouldUseViewTransitions()) {
      try {
        (document as DocumentWithViewTransition).startViewTransition?.(() => {
          apply();
        });
        return;
      } catch {
        // Fall through to the immediate toggle below on failure.
      }
    }

    apply();
  }, []);

  return (
    <ToggleSwitch
      checked={enabled}
      onChange={handleChange}
      ariaLabel="Toggle alternate theme"
      className={className}
    />
  );
};

export default ThemeSwitch;
