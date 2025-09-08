"use client";

import { useEffect, useState } from "react";
import ToggleSwitch from "./ToggleSwitch";

const ALT_KEY = "alt-palette";
const EVENT_NAME = "theme-change";

export default function ThemeSwitcher() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(ALT_KEY);
    if (stored === "true") {
      setEnabled(true);
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setEnabled(detail);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  useEffect(() => {
    if (enabled) {
      window.localStorage.setItem(ALT_KEY, "true");
    } else {
      window.localStorage.removeItem(ALT_KEY);
    }
    document.documentElement.classList.toggle("alt-palette", enabled);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: enabled }));
  }, [enabled]);

  return (
    <ToggleSwitch
      checked={enabled}
      onChange={setEnabled}
      ariaLabel="Toggle alternative palette"
    />
  );
}
