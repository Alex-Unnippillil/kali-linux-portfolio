"use client";

import { useEffect, useState } from "react";
import ToggleSwitch from "./ToggleSwitch";

const ALT_KEY = "alt-palette";

export default function ThemeSwitcher() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(ALT_KEY);
    if (stored === "true") {
      setEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      window.localStorage.setItem(ALT_KEY, "true");
    } else {
      window.localStorage.removeItem(ALT_KEY);
    }
    document.documentElement.classList.toggle("alt-palette", enabled);
  }, [enabled]);

  return (
    <ToggleSwitch
      checked={enabled}
      onChange={setEnabled}
      ariaLabel="Toggle alternative palette"
    />
  );
}
